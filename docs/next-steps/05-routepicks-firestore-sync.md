# 05 — RoutePicks Firestore sync (PR-D)

**Status:** Plan ready, not started.
**Estimated diff size:** ~80 lines in app.js + ~10 lines in firestore.rules.
**Single PR. Requires deploying Firestore rules separately.**

---

## Why this exists

`RoutePicks` ships today as **localStorage-only** (PR #18 / Phase 1).
That means:
- A user's picks persist on their device — ✅ works
- The group view ("What most picked" on Results) **does not** include
  picks made on the Routes page from other users — ❌ doesn't work

For the group view to be a true group view, RoutePicks needs to sync
to Firestore the same way `TripVotes` does. This PR is that wiring.

---

## Data model

Each user gets one Firestore doc holding their picks set.

```
/routePicks/{userNameLower}
{
  name: "Pranav",            // exact display name
  picks: ["hanoi", "phongnha", "hoian"],
  ts: <serverTimestamp>
}
```

Why one doc per user (not one doc per pick): a user's picks are a SET,
read together. A single doc per user gives atomic writes and trivial
reads.

Username serves as the doc ID (lowercased, regex-validated) — same
pattern as `Suggestions` already uses (`${userLower}__${slug}`).

---

## App.js changes

Add `_db` wiring to the existing `RoutePicks` module.

```js
const RoutePicks = {
  collection: "routePicks",
  _lk: "routePicks_local",
  _listeners: [],
  _everyoneCache: [],          // every user's current picks, populated by subscribeAll

  /** Reads THIS user's set from localStorage. */
  _getLocal(){ /* unchanged */ },
  _setLocal(s){ /* unchanged */ },

  has(id){ return this._getLocal().has(id); },
  ids(){ return [...this._getLocal()]; },

  async toggle(id){
    if(!byId(id)) return;
    const s = this._getLocal();
    if(s.has(id)) s.delete(id); else s.add(id);
    this._setLocal(s);
    this._notify();
    // NEW: push to Firestore
    if(_db){
      const user = Profile.get().name;
      if(!user) return;
      const userLower = user.toLowerCase();
      try {
        await _db.collection(this.collection).doc(userLower).set({
          name: user,
          picks: [...s],
          ts: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch(e){ Log.warn("RoutePicks.toggle", "Firestore write failed", e); }
    }
  },

  /** Subscribes to EVERY user's picks (read by aggregation logic). */
  subscribeAll(cb){
    if(_db){
      return _db.collection(this.collection).onSnapshot(snap => {
        const arr = [];
        snap.forEach(d => {
          const x = this._sanitiseDoc(d.data());
          if(x) arr.push(x);
        });
        this._everyoneCache = arr;
        cb(arr);
      }, err => Log.error("RoutePicks.subscribeAll", "listener err", err));
    } else {
      // local fallback: only the current user exists
      const name = Profile.get().name || "You";
      cb([{ name, picks: this.ids() }]);
      return () => {};
    }
  },

  /** Returns the current group-wide RoutePicks set, keyed by place ID
   *  to count of users who picked it. Used by `pickedByGroup`. */
  countsByPlace(){
    const counts = {};
    this._everyoneCache.forEach(u => {
      (u.picks || []).forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  },

  _sanitiseDoc(d){
    if(!d || typeof d !== "object") return null;
    const name = typeof d.name === "string" ? d.name.trim().slice(0, 24) : null;
    if(!name || !NAME_RX.test(name)) return null;
    const picks = Array.isArray(d.picks)
      ? d.picks.filter(p => typeof p === "string" && byId(p)).slice(0, 50)
      : [];
    return { name, picks };
  },

  onChange(fn){ this._listeners.push(fn); },
  _notify(){ this._listeners.forEach(fn => { try { fn(); } catch(e){} }); }
};
```

Boot — start the subscription:

```js
// inside DOMContentLoaded
RoutePicks.subscribeAll(() => applyVoteUI());
```

---

## Update `pickedByGroup`

Currently `pickedByGroup` only counts Places votes. Now it should also
count RoutePicks as implicit yes-votes (with Places overrides).

```js
function pickedByGroup(){
  // 1. For each place, gather all sources of "yes" / "maybe" across users
  //    Places vote wins over Route pick for the SAME user.
  const placeVotesByUser = {};       // userLower -> {placeId: vote}
  ALL_VOTES.forEach(v => {
    const u = (v.name || "").toLowerCase();
    if(!placeVotesByUser[u]) placeVotesByUser[u] = {};
    placeVotesByUser[u][v.placeId] = v.vote;
  });
  const routePicksByUser = {};
  RoutePicks._everyoneCache.forEach(u => {
    routePicksByUser[u.name.toLowerCase()] = new Set(u.picks);
  });

  // 2. Compute per-place score across all users
  const allUsers = new Set([...Object.keys(placeVotesByUser), ...Object.keys(routePicksByUser)]);
  const rows = PLACES.map(d => {
    let score = 0;
    allUsers.forEach(u => {
      const placeVote = placeVotesByUser[u]?.[d.id];
      const routePicked = routePicksByUser[u]?.has(d.id);
      if(placeVote === "yes") score += 2;
      else if(placeVote === "maybe") score += 1;
      else if(placeVote === "skip") { /* explicit skip, score += 0 */ }
      else if(routePicked) score += 2;   // Routes pick = implicit yes (no Places opinion)
    });
    return { place: d, score };
  });

  // 3. Same threshold filter as before — keep places above median with score > 0
  if(!rows.length) return [];
  const scores = rows.map(r => r.score).slice().sort((a, b) => a - b);
  const mid = scores.length / 2;
  const median = scores.length % 2
    ? scores[Math.floor(mid)]
    : (scores[mid - 1] + scores[mid]) / 2;
  return rows.filter(r => r.score > 0 && r.score > median).map(r => r.place);
}
```

The Places-overrides-Routes rule is enforced inside the per-user
counting loop: if a user has an explicit Places vote, it wins; only
fall back to RoutePicks when Places is silent.

---

## Firestore rules update

`firestore.rules` needs a new collection allow rule. Pattern matches
the existing `votes` and `suggestions` rules — strict field whitelist,
length checks, type checks.

```js
match /routePicks/{userId} {
  allow read: if true;          // public reads — anonymity preserved by absence of any sensitive fields
  allow write: if isValidPicksDoc(request.resource.data, userId);
}

function isValidPicksDoc(data, docId) {
  return data.keys().hasOnly(["name", "picks", "ts"])
      && data.name is string
      && data.name.size() >= 1 && data.name.size() <= 24
      && data.name.matches("^[\\p{L}\\p{N} .'\\-]{1,24}$")
      && data.name.lower() == docId
      && data.picks is list
      && data.picks.size() <= 50
      && data.picks.toSet().hasOnly([
           "hagiang","sapa","hanoi","puluong","ninhbinh","catba",
           "phongnha","hue","danang","hoian","quynhon","hcmc"
         ]);
}
```

Deploy via the Firebase console after merging the code PR.

---

## Test plan

- [ ] First user picks places on Routes → Firestore doc created at `/routePicks/{userLower}`
- [ ] Same user clears a pick → Firestore doc updated, `picks` array shrinks
- [ ] Open the same site as a second user (incognito) → second user picks different places
- [ ] Both users open Results → "What most picked" tab shows places picked by either user (Routes picks count)
- [ ] User A votes Skip on a place they Routes-picked → that place stops contributing to A's score
- [ ] User A votes Maybe on a place User B Route-picked → A and B both contribute (A as 1 pt, B as 2 pt) totalling 3 pts
- [ ] Firestore rules reject: missing name, invalid name regex, picks containing unknown IDs, picks list > 50 entries
- [ ] localStorage fallback still works when Firebase is unreachable (offline mode)

---

## Risks

1. **Free tier quota** — adds one doc per active user. At family scale
   (< 20 users) this is irrelevant. Above ~100k writes/day it'd start
   to matter; we're orders of magnitude below.
2. **Schema drift** — the rules whitelist place IDs explicitly. If new
   places get added to `PLACES`, the rules need updating too. Document
   this in `session-logs/`.
3. **Username collision** — two users with the same display name collide
   on the same doc. Existing `Suggestions` has the same pattern; same
   trade-off. Acceptable at family scale.
4. **Migration** — existing users' localStorage RoutePicks won't auto-
   upload on first load. Easy fix: trigger a one-shot push on
   `applyRoutePicksUI` first call if Firestore is live and the user has
   picks but no Firestore doc.

---

## Post-merge follow-ups (small)

- Add a `_routePicksLastSyncedAt` log line so we can verify sync works
  in the wild without exposing internal state to inspect-view.
- Move the parked "Drop scroll-cue from home" tweak to ready-to-ship
  once this lands (the page below the hero is finally complete).

---

## Out of scope (don't pull in)

- Bringing back per-user names anywhere (anonymity is a hard rule)
- A "your group" view distinct from "the group" — single anonymous
  aggregate is the only group view
- Cross-trip multi-tenancy — this site is one trip

---

## How to ship

1. `git checkout -b feature/routepicks-firestore-sync`
2. Update `RoutePicks` module (the bulk of app.js changes)
3. Update `pickedByGroup` to combine sources
4. Wire `subscribeAll` in boot
5. Smoke test locally with localStorage fallback (Firestore unreachable)
6. Update Firestore rules file
7. PR + merge code (rules deploy separately via Firebase console)
8. Smoke test on live site with two browsers
9. Move row in feedback-log
