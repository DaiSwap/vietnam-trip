/* ============================================================
   Vietnam '26 — app.js (shared across all pages)
   ------------------------------------------------------------
   EDIT CONTENT in the PLACES array below.
   PASTE your Firebase config in firebaseConfig (see setup notes).

   Layout in this file:
     0) LOG + escapeHTML primitives (used everywhere; declared first)
     1) PLACES, ROUTES, WHEN data
     2) Firebase config + init
     3) PROFILE (localStorage) + ONBOARDING
     4) TripVotes (Firestore live / localStorage fallback)
     5) Shared UI: nav, onboarding card, detail sheet
     6) Page inits: map, places, routes, results
     7) Boot
   ============================================================ */

/* ============================================================
   0) LOG — structured, persisted error trail.
   Keeps the last 50 entries in localStorage.tripLog so problems
   are inspectable later. Open DevTools and run `Log.dump()`.
   ============================================================ */
const Log = (() => {
  const KEY = "tripLog";
  const MAX = 50;
  const read = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  const write = arr => { try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))); } catch {} };
  /** Push one entry; mirror to console; drop oldest beyond MAX. */
  const push = (level, tag, msg, extra) => {
    const entry = {
      t: new Date().toISOString(),
      level, tag: String(tag||""),
      msg: msg == null ? "" : (msg.message || String(msg)),
      extra: extra == null ? null : (typeof extra === "string" ? extra : JSON.stringify(extra).slice(0,400))
    };
    const buf = read(); buf.push(entry); write(buf);
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[${entry.t}] [${level.toUpperCase()}] ${entry.tag}: ${entry.msg}`, extra || "");
  };
  return {
    /** Info-level log. */                                  info:  (tag,msg,extra) => push("info",  tag, msg, extra),
    /** Warning-level log. */                               warn:  (tag,msg,extra) => push("warn",  tag, msg, extra),
    /** Error-level log. */                                 error: (tag,msg,extra) => push("error", tag, msg, extra),
    /** Returns all persisted entries (most-recent last). */dump:  () => read(),
    /** Clears the persisted log. */                        clear: () => { try { localStorage.removeItem(KEY); } catch {} }
  };
})();
window.Log = Log; // exposed deliberately for DevTools inspection

/**
 * Escapes a string so it is safe to insert into HTML via innerHTML or template literals.
 * Always run user-provided values through this before rendering — defence in depth alongside
 * input validation and Firestore rules.
 */
function escapeHTML(s){
  if(s == null) return "";
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

/* ============================================================
   1) DATA  — edit place info here
   ============================================================ */
const PLACES = [
  { id:"hagiang", tier:1, lat:22.823, lng:104.984, region:"Far North · near China", name:"Ha Giang",
    crowd:2, crowdNote:"Backroads stay remote", act:5, actNote:"Biggest adventure payoff",
    desc:"The best <b>quiet + adventure</b> return in the country. The famous loop gets busy on a few photo-stops, but the villages stay genuinely untouched.",
    doing:["Ride the loop (Ma Pi Leng pass)","Boat the Nho Que river gorge","Trek between hill-tribe villages","Homestays & local markets"],
    when:"Big, physical, remote. With {n} of you, use easy-rider drivers or a private car if not everyone rides." },
  { id:"sapa", tier:3, lat:22.336, lng:103.844, region:"Far North · Hoang Lien Son", name:"Sapa",
    crowd:4, crowdNote:"Town has gone touristy", act:4, actNote:"Strong treks outside town",
    desc:"Was on the first plan. The town is commercial now, but the valley treks just outside still deliver terraced fields and quiet villages.",
    doing:["Trek Muong Hoa valley","Cable car to Fansipan peak","Cat Cat village","Y Ty = quieter, but far"],
    when:"Keep only if you want the high-mountain trek — Ha Giang or Pu Luong cover it with fewer people." },
  { id:"hanoi", tier:3, lat:21.028, lng:105.804, region:"North · capital & main hub", name:"Hanoi",
    crowd:5, crowdNote:"Big busy capital", act:2, actNote:"City & food",
    desc:"The start / end hub. Great for a day of food and old-quarter wandering, but it's a dense city, not a quiet stop.",
    doing:["Old Quarter & Hoan Kiem lake","Train Street","Street-food crawl","Launchpad for Ha Giang / Sapa / Ninh Binh"],
    when:"One day as a connector. Spend your real days in Ha Giang or Phong Nha." },
  { id:"puluong", tier:1, lat:20.487, lng:105.166, region:"North · near Ninh Binh", name:"Pu Luong",
    crowd:1, crowdNote:"Genuinely off-radar", act:4, actNote:"Treks & nature",
    desc:"The calm, almost crowd-free answer to Sapa. Gentle trails through rice terraces, villages and bamboo forest.",
    doing:["Treks to hidden waterfalls","Mountain biking","Bamboo rafting","Stilt-house eco homestays"],
    when:"Great for slowing down. Pairs naturally with Ninh Binh (≈3 hrs)." },
  { id:"ninhbinh", tier:2, lat:20.254, lng:105.975, region:"North · 'Halong on land'", name:"Ninh Binh",
    crowd:3, crowdNote:"Popular but easy to dodge", act:3, actNote:"Boats, caves, cycling",
    desc:"Worth keeping. Karst peaks rising from rice paddies and rivers. Go early or stay over to beat the Hanoi day-trippers.",
    doing:["Bamboo-boat through river caves (Trang An)","Cycle the paddy backroads","Climb Mua Cave viewpoint","Hoa Lu ancient capital"],
    when:"Trang An beats Tam Coc for scenery and less hassle. Go at opening or late afternoon." },
  { id:"catba", tier:2, lat:20.728, lng:107.048, region:"North coast · near Ha Long", name:"Cat Ba / Lan Ha Bay",
    crowd:3, crowdNote:"Quieter than Ha Long", act:4, actNote:"Kayak, climb, hike",
    desc:"On the first plan — good call. Same limestone seascape as Ha Long with far fewer boats, plus island hiking and climbing.",
    doing:["Kayak the Lan Ha lagoons","Rock climbing (Cat Ba is a hub)","Hike Cat Ba national park","Swim & overnight boat"],
    when:"Choose a Lan Ha route over the busy Ha Long cruises — same views, fewer crowds." },
  { id:"phongnha", tier:1, lat:17.591, lng:106.283, region:"Central · UNESCO park", name:"Phong Nha–Ke Bang",
    crowd:2, crowdNote:"Still little-known", act:5, actNote:"Real adventure",
    desc:"A perfect fit for what we want. 885 km² of jungle, caves and underground rivers — adventure-first, not photo-first.",
    doing:["Dark Cave: zipline + mud bath + kayak","Paradise Cave boardwalks","Phong Nha cave by river boat","Jungle hikes & multi-day expeditions"],
    when:"Avoid Oct–Dec (rainy, caves close). April is good. A clear keeper." },
  { id:"hue", tier:3, lat:16.463, lng:107.590, region:"Central · imperial city", name:"Hue",
    crowd:3, crowdNote:"Touristed but spread out", act:2, actNote:"History & food",
    desc:"The upsell in those WhatsApp images — not on the current plan. The real draw is the Hai Van Pass drive to Da Nang.",
    doing:["Drive the Hai Van Pass (the highlight)","Imperial Citadel & royal tombs","Perfume River boat","Lang Co Bay, Lap An lagoon"],
    when:"Add only for the scenic pass + history. Light on active things to do." },
  { id:"danang", tier:3, lat:16.054, lng:108.202, region:"Central · big coastal city", name:"Da Nang / Ba Na Hills",
    crowd:5, crowdNote:"Heavily commercial", act:3, actNote:"Mostly built attractions",
    desc:"On the plan, but clashes most with 'non-commercial'. Ba Na Hills & the Golden Bridge are theme-park busy.",
    doing:["Golden Bridge / Ba Na Hills (busy)","My Khe beach","Marble Mountains","Mainly an arrival hub"],
    when:"Use as a gateway. Quy Nhon is the quieter coastal swap." },
  { id:"hoian", tier:3, lat:15.880, lng:108.338, region:"Central · old trading town", name:"Hoi An",
    crowd:5, crowdNote:"Lovely but very busy", act:2, actNote:"Atmosphere over activity",
    desc:"On the plan. A genuinely beautiful lantern-lit old town — and one of the most touristed spots in Vietnam.",
    doing:["Lantern-lit old town at night","Lantern boat ride","Tailor-made clothes","Coconut-jungle basket boats","An Bang beach"],
    when:"Keep it short; dawn or late evening dodges the crowds." },
  { id:"quynhon", tier:2, lat:13.782, lng:109.219, region:"Central coast · alternative", name:"Quy Nhon",
    crowd:2, crowdNote:"Kept its soul vs Da Nang", act:3, actNote:"Beaches & coast",
    desc:"Not on the plan — worth a look. A low-key coastal town that stayed authentic while Da Nang boomed.",
    doing:["Quiet beaches (Ky Co, Eo Gio)","Coastal scooter rides","Cham towers","Fresh seafood & local life"],
    when:"A real swap for a relaxed, non-commercial coast instead of Da Nang." },
  { id:"hcmc", tier:3, lat:10.7769, lng:106.7009, region:"South · biggest city", name:"Ho Chi Minh City",
    crowd:5, crowdNote:"Vietnam's biggest city", act:3, actNote:"Food, history, day trips",
    desc:"The chaotic, energetic south. Famous for street food, war-history museums and being a gateway to the Mekong Delta. Less <b>quiet</b> than anywhere up north, but it's a real lived-in city — not a tourist-town facade.",
    doing:["War Remnants Museum & old-Saigon walks","Street-food crawl (Ben Thanh, District 4)","Cu Chi Tunnels day trip","Mekong Delta day or overnight","Rooftop bars & Bui Vien nightlife"],
    when:"Adds a southern leg — pairs naturally with Mekong Delta, Da Lat or Phu Quoc (3–5 extra days). If you're sticking to north + central, you can skip it." }
];

/* ROUTES — curated paths through the shortlist (Phase B)
   stops carry per-stop nights so the leg list reads cleanly. */
const ROUTES = [
  { id:"north-loop", name:"Northern Loop", days:11,
    note:"Hits the most-recommended northern places without leaving the region. Fly in and out of Hanoi — simplest visa, cheapest fares.",
    stops:[
      { id:"hanoi",    nights:1 },
      { id:"ninhbinh", nights:2 },
      { id:"puluong",  nights:2 },
      { id:"hagiang",  nights:3 },
      { id:"catba",    nights:2 },
      { id:"hanoi",    nights:1 }
    ] },
  { id:"north-central", name:"North + Central", days:15,
    note:"The full trip across two regions — fly into Hanoi, fly out of Da Nang. One e-visa, no backtracking.",
    stops:[
      { id:"hanoi",    nights:1 },
      { id:"ninhbinh", nights:2 },
      { id:"puluong",  nights:2 },
      { id:"hagiang",  nights:3 },
      { id:"catba",    nights:2 },
      { id:"phongnha", nights:2 },
      { id:"hue",      nights:1 },
      { id:"hoian",    nights:2 }
    ] },
  { id:"quiet-adv", name:"Quiet + Adventure", days:10,
    note:"Skips the touristy stops. Only quieter, activity-heavy places — most adventure per day with the least crowd.",
    stops:[
      { id:"hanoi",    nights:1 },
      { id:"puluong",  nights:2 },
      { id:"hagiang",  nights:3 },
      { id:"phongnha", nights:2 },
      { id:"quynhon",  nights:2 }
    ] }
];

/* WHEN — static climate suitability by region × month.
   Scale 1=avoid, 2=okay, 3=good, 4=excellent. */
const WHEN = [
  { region:"North",   months:[2,2,3,3,2,1,1,1,3,4,4,3] },
  { region:"Central", months:[2,3,4,4,4,2,1,1,1,1,2,2] },
  { region:"South",   months:[4,4,3,3,2,1,1,1,2,2,3,4] }
];

/* ============================================================
   2) FIREBASE / VOTING LAYER
   ------------------------------------------------------------
   SETUP (one time, ~3 min):
   1. console.firebase.google.com → Add project (free, no billing).
   2. Build → Firestore Database → Create database → Start, pick a region.
   3. Project settings (gear) → General → Your apps → Web (</>) →
      register an app → COPY the firebaseConfig object.
   4. Paste it below, replacing the placeholder values.
   5. Firestore → Rules → paste the rules from the chat → Publish.
   Until you do this, voting still works (saved on each person's
   own device); it becomes live + shared once the config is in.
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCqE-SYgTzOiyXG9z9e0jQsXbOMnGQyBNM",
  authDomain: "daiswap-level1.firebaseapp.com",
  projectId: "daiswap-level1",
  storageBucket: "daiswap-level1.firebasestorage.app",
  messagingSenderId: "1038264255996",
  appId: "1:1038264255996:web:ec8b0ebfcfad8f02e71e79"
};

const FB_READY = typeof firebase !== "undefined" && firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY";
let _db = null;
if (FB_READY) {
  try { firebase.initializeApp(firebaseConfig); _db = firebase.firestore(); Log.info("Firebase", "initialised"); }
  catch (e) { Log.error("Firebase", "init failed", e); }
}

/** Whitelist of valid vote values — matches Firestore rule. */
const VALID_VOTES = ["yes","maybe","skip"];

/**
 * Sanitises one vote document read from Firestore. Discards anything malformed
 * so the UI never sees a tampered/bad row. Returns null for invalid entries.
 */
function sanitiseVote(raw){
  if(!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.slice(0,24) : null;
  const placeId = typeof raw.placeId === "string" ? raw.placeId : null;
  const vote = VALID_VOTES.includes(raw.vote) ? raw.vote : null;
  if(!name || !placeId || !vote) return null;
  if(!NAME_RX.test(name)) return null;
  if(!PLACES.some(p => p.id === placeId)) return null;
  return { name, placeId, vote };
}

/* ============================================================
   PROFILE — story-first onboarding state.
   Shape: { name, age, groupSize, budgetPP, bufferPP }
   Stored as JSON in localStorage. Every read validates strictly
   so a tampered/corrupt value gracefully falls back to "missing"
   and the user is re-prompted — the app never trusts raw input.
   ============================================================ */
const PROFILE_KEY = "tripProfile";
/** Allowed name shape: 1–24 chars, letters / digits / space / .'- (Unicode letters allowed). */
const NAME_RX = /^[\p{L}\p{N} .'\-]{1,24}$/u;
/** Allowed entry-city codes (best-case selector on the Travel page). */
const VALID_ORIGINS = ["BLR", "DEL", "BOM", "CCU", "MAA", "OTHER"];
/** Allowed exit-airport codes from Vietnam. */
const VALID_EXITS = ["HAN", "DAD", "SGN", "OPEN"];
/** Display labels mapped from the codes — used by the trip-story and Travel UI. */
const ORIGIN_LABEL = { BLR:"Bengaluru", DEL:"Delhi", BOM:"Mumbai", CCU:"Kolkata", MAA:"Chennai", OTHER:"another city" };
const EXIT_LABEL   = { HAN:"Hanoi", DAD:"Da Nang", SGN:"Ho Chi Minh City", OPEN:"an open option" };
/** Free-form city regex — letters/digits/spaces/.,'-() — 1–40 chars. Used for user-typed cities. */
const CITY_RX = /^[\p{L}\p{N} .,'\-()]{1,40}$/u;

const Profile = {
  /** Reads, validates and returns the profile (or `{}` if missing/invalid). */
  get(){
    let raw;
    try { raw = JSON.parse(localStorage.getItem(PROFILE_KEY)); }
    catch (e) {
      Log.warn("Profile.get", "JSON parse failed; clearing", e);
      try { localStorage.removeItem(PROFILE_KEY); } catch {}
      return {};
    }
    if(!raw || typeof raw !== "object") return {};
    const p = {};
    if(typeof raw.name === "string" && NAME_RX.test(raw.name)) p.name = raw.name;
    if(Number.isInteger(raw.age) && raw.age >= 13 && raw.age <= 99) p.age = raw.age;
    if(Number.isInteger(raw.groupSize) && raw.groupSize >= 1 && raw.groupSize <= 20) p.groupSize = raw.groupSize;
    if(Number.isInteger(raw.budgetPP) && raw.budgetPP >= 0 && raw.budgetPP <= 5000000) p.budgetPP = raw.budgetPP;
    if(Number.isInteger(raw.bufferPP) && raw.bufferPP >= 0 && raw.bufferPP <= 5000000) p.bufferPP = raw.bufferPP;
    if(typeof raw.origin === "string" && VALID_ORIGINS.includes(raw.origin)) p.origin = raw.origin;
    if(typeof raw.exit === "string" && VALID_EXITS.includes(raw.exit)) p.exit = raw.exit;
    if(typeof raw.originCustom === "string" && CITY_RX.test(raw.originCustom.trim())) p.originCustom = raw.originCustom.trim();
    return p;
  },
  /** Writes the profile. Caller is responsible for validation (onboarding uses ONB_STEPS validators). */
  set(p){
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
    catch (e) { Log.error("Profile.set", "write failed", e); }
  },
  /** True when every required field is present and valid. */
  isComplete(){
    const p = this.get();
    return !!(p.name && Number.isFinite(p.age) && Number.isFinite(p.groupSize)
              && Number.isFinite(p.budgetPP) && Number.isFinite(p.bufferPP));
  }
};

/**
 * TripVotes — the voting layer.
 * Uses Firestore (collection "votes") when Firebase is configured; falls back to localStorage
 * so a single device still works offline. Every value read from either store is validated
 * via sanitiseVote() before reaching the UI.
 */
/* ============================================================
   ROUTE PICKS — parallel store to TripVotes.
   - localStorage is canonical for "my picks" (instant UI updates).
   - Firestore mirror at /routePicks/{userLower} for the group view.
   - Resolution rule (used by Map/Results): if myVotes[id] is set, use it;
     else if routePicks has id, treat as 'yes'; else null.
   ============================================================ */
const RoutePicks = {
  collection: "routePicks",
  _lk: "routePicks_local",
  _listeners: [],
  _everyoneCache: [],          // [{name, picks: [id, ...]}] — populated by subscribeAll
  _migrated: false,            // one-shot guard so we don't push localStorage every refresh

  // ---- LOCAL (canonical for "my picks") ----
  _get(){
    try {
      const arr = JSON.parse(localStorage.getItem(this._lk));
      return Array.isArray(arr) ? new Set(arr.filter(x => typeof x === "string")) : new Set();
    } catch(e){ Log.warn("RoutePicks._get", "parse failed; resetting", e); return new Set(); }
  },
  _setLocal(s){
    try { localStorage.setItem(this._lk, JSON.stringify([...s])); }
    catch(e){ Log.error("RoutePicks._setLocal", "write failed", e); }
  },
  has(id){ return this._get().has(id); },
  ids(){ return [...this._get()]; },

  toggle(id){
    if(!byId(id)) return;                   // ignore unknown place IDs
    const s = this._get();
    if(s.has(id)) s.delete(id); else s.add(id);
    this._setLocal(s);
    this._listeners.forEach(fn => { try { fn(); } catch(e){ Log.warn("RoutePicks.toggle", "listener threw", e); } });
    // Best-effort push to Firestore. UI doesn't wait; failures are logged.
    this._pushToFirestore(s);
  },

  // ---- FIRESTORE MIRROR ----
  async _pushToFirestore(picksSet){
    if(!_db) return;
    const user = Profile.get().name;
    if(!user || !NAME_RX.test(user)) return;
    const userLower = user.toLowerCase();
    try {
      await _db.collection(this.collection).doc(userLower).set({
        name: user,
        picks: [...picksSet],
        ts: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e){ Log.warn("RoutePicks._pushToFirestore", "write failed", e); }
  },

  /**
   * One-shot sync of current localStorage state up to Firestore. Run on page load
   * once Profile is set, so users who picked things before PR-D shipped get
   * their state into the shared collection without having to re-toggle.
   */
  maybeMigrate(){
    if(this._migrated) return;
    if(!_db || !Profile.isComplete()) return;
    this._migrated = true;
    const s = this._get();
    if(s.size > 0) this._pushToFirestore(s);
  },

  /** Subscribes to every user's pick set. Updates _everyoneCache + fires cb. */
  subscribeAll(cb){
    if(_db){
      return _db.collection(this.collection).onSnapshot(snap => {
        const arr = [];
        snap.forEach(d => { const x = this._sanitiseDoc(d.data()); if(x) arr.push(x); });
        this._everyoneCache = arr;
        if(cb) cb(arr);
      }, err => Log.error("RoutePicks.subscribeAll", "listener err", err));
    } else {
      // Local-only fallback: the group is just the current user.
      const name = Profile.get().name || "You";
      this._everyoneCache = [{ name, picks: this.ids() }];
      if(cb) cb(this._everyoneCache);
      return () => {};
    }
  },

  /** Returns a Map of userLower → Set<placeId> built from the group cache. */
  everyoneByUser(){
    const m = new Map();
    this._everyoneCache.forEach(u => m.set((u.name || "").toLowerCase(), new Set(u.picks || [])));
    return m;
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

  onChange(fn){ this._listeners.push(fn); }
};

/**
 * Resolves the effective vote for a place from the two parallel stores.
 * Places votes (yes / maybe / skip) always win over Route picks — so a user
 * who explicitly skipped a place on Places will see it as red on the map
 * even if it's still in their RoutePicks set.
 */
function effectiveVote(placeId){
  const v = myVotes()[placeId];
  if(v === "yes" || v === "maybe" || v === "skip") return v;
  return RoutePicks.has(placeId) ? "yes" : null;
}

/** Updates every .pill-tag[data-id] and .stop[data-id] in the DOM to reflect current RoutePicks state. */
function applyRoutePicksUI(){
  const picks = new Set(RoutePicks.ids());
  document.querySelectorAll(".pill-tag[data-id]").forEach(p => {
    const on = picks.has(p.dataset.id);
    p.classList.toggle("on", on);
    p.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.querySelectorAll(".stop[data-id]").forEach(s => {
    const on = picks.has(s.dataset.id);
    s.classList.toggle("on", on);
    s.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

const TripVotes = {
  /** True when Firestore is wired up; false when running on localStorage only. */
  live: !!_db,
  /** Returns the current user's name, or "" if not set yet. */
  name(){ return Profile.get().name || localStorage.getItem("tripName") || ""; },
  /**
   * Sets the user's first name. The onboarding flow already validates; this is the persistence step.
   * Updates both the canonical Profile and the legacy `tripName` key (kept for backwards
   * compatibility with older localStorage data).
   */
  setName(n){
    const trimmed = (n || "").trim();
    if(!NAME_RX.test(trimmed)){ Log.warn("TripVotes.setName", "rejected invalid name"); return; }
    const p = Profile.get(); p.name = trimmed; Profile.set(p);
    try { localStorage.setItem("tripName", trimmed); } catch (e) { Log.warn("TripVotes.setName", "tripName write failed", e); }
  },

  _lk: "tripVotes_local",
  /** Reads the local-mode votes dictionary `{placeId: vote}`. Returns `{}` on any error. */
  _getLocal(){
    try {
      const o = JSON.parse(localStorage.getItem(this._lk));
      return (o && typeof o === "object") ? o : {};
    } catch (e) { Log.warn("TripVotes._getLocal", "parse failed; resetting", e); return {}; }
  },
  /** Writes the local-mode votes dictionary. */
  _setLocal(o){
    try { localStorage.setItem(this._lk, JSON.stringify(o)); }
    catch (e) { Log.error("TripVotes._setLocal", "write failed", e); }
  },

  /**
   * Casts or clears a vote for the current user. Pass `null`/falsy `vote` to clear.
   * @param {string} placeId
   * @param {"yes"|"maybe"|"skip"|null} vote
   */
  async cast(placeId, vote){
    const name = this.name();
    if(!name){ Log.warn("TripVotes.cast", "no name set"); return; }
    if(!PLACES.some(p => p.id === placeId)){ Log.warn("TripVotes.cast", "unknown placeId", placeId); return; }
    if(vote != null && !VALID_VOTES.includes(vote)){ Log.warn("TripVotes.cast", "bad vote value", vote); return; }

    if(_db){
      try {
        const ref = _db.collection("votes").doc(name.toLowerCase() + "__" + placeId);
        if(vote) await ref.set({ name, placeId, vote, ts: Date.now() });
        else await ref.delete();
      } catch (e) { Log.error("TripVotes.cast", "Firestore write failed", e); }
    } else {
      const o = this._getLocal();
      if(vote) o[placeId] = vote; else delete o[placeId];
      this._setLocal(o);
      this._emitLocal();
    }
  },

  /**
   * Subscribes to live vote updates. The callback receives an array of sanitised
   * `{name, placeId, vote}` objects. Returns an unsubscribe function.
   */
  subscribe(cb){
    this._cb = cb;
    if(_db){
      return _db.collection("votes").onSnapshot(snap => {
        const arr = [];
        snap.forEach(d => {
          const v = sanitiseVote(d.data());
          if(v) arr.push(v); else Log.warn("TripVotes.subscribe", "dropped invalid vote doc", d.id);
        });
        cb(arr);
      }, err => Log.error("TripVotes.subscribe", "Firestore listener error", err));
    } else {
      this._emitLocal();
      window.addEventListener("storage", e => { if(e.key === this._lk) this._emitLocal(); });
      return () => {};
    }
  },

  /** Emits the local-mode votes into the subscriber callback (no-op if no subscriber). */
  _emitLocal(){
    if(!this._cb) return;
    const name = this.name() || "You";
    const o = this._getLocal();
    const arr = Object.entries(o)
      .map(([placeId, vote]) => sanitiseVote({ name, placeId, vote }))
      .filter(Boolean);
    this._cb(arr);
  }
};

/* ============================================================
   PLACE SUGGESTIONS — anonymous user-submitted places not in the
   curated PLACES list. Stored in Firestore (`suggestions` collection)
   when configured; localStorage fallback otherwise. The UI only ever
   shows aggregated counts — individual suggester names are never
   displayed.
   ============================================================ */
const Suggestions = {
  collection: "suggestions",
  /** True if `s` is acceptable. Boolean signature is kept so existing call sites work. */
  validate(s){ return this.validateMessage(s) === null; },
  /**
   * Returns null when valid, or a friendly error string when not.
   * Rules: trimmed length 2–100; no more than 2 sentence-ending punctuation marks.
   * Above the upper bounds we point users at daiswap directly instead of choking them.
   */
  validateMessage(s){
    if(typeof s !== "string") return "Type a place name.";
    const t = s.trim();
    if(t.length < 2) return "At least 2 characters, please.";
    if(t.length > 100) return "Keep it brief — for longer feedback, message daiswap directly.";
    const endings = (t.match(/[.!?]/g) || []).length;
    if(endings > 2) return "Two sentences max — for longer notes, message daiswap directly.";
    return null;
  },
  /** Normalises a name into a lowercase a-z0-9- slug (used for dedup). */
  _slug(s){
    return String(s).toLowerCase().trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      .slice(0, 32);
  },
  /** Persists a suggestion for the current user. Requires a complete Profile upstream. */
  async add(rawName){
    const user = Profile.get().name;
    if(!user){ Log.warn("Suggestions.add", "no profile"); return; }
    if(!this.validate(rawName)){ Log.warn("Suggestions.add", "invalid name"); return; }
    const name = rawName.trim();
    const slug = this._slug(name);
    if(!slug){ Log.warn("Suggestions.add", "empty slug"); return; }
    const userLower = user.toLowerCase();
    const payload = { name, slug, byNameLower: userLower, ts: Date.now() };
    if(_db){
      try { await _db.collection(this.collection).doc(`${userLower}__${slug}`).set(payload); }
      catch (e) { Log.error("Suggestions.add", "Firestore write failed", e); }
    } else {
      const arr = this._getLocal().filter(s => !(s.byNameLower === userLower && s.slug === slug));
      arr.push(payload);
      this._setLocal(arr);
      this._emitLocal();
    }
  },
  _lk: "trip_suggestions_local",
  _getLocal(){
    try { const a = JSON.parse(localStorage.getItem(this._lk)); return Array.isArray(a) ? a : []; }
    catch (e) { Log.warn("Suggestions._getLocal", "parse failed; resetting", e); return []; }
  },
  _setLocal(arr){
    try { localStorage.setItem(this._lk, JSON.stringify(arr)); }
    catch (e) { Log.error("Suggestions._setLocal", "write failed", e); }
  },
  /** Subscribes to live suggestions; calls cb with an array of sanitised entries. */
  subscribe(cb){
    this._cb = cb;
    if(_db){
      return _db.collection(this.collection).onSnapshot(snap => {
        const arr = [];
        snap.forEach(d => { const s = this._sanitise(d.data()); if(s) arr.push(s); });
        cb(arr);
      }, err => Log.error("Suggestions.subscribe", "listener err", err));
    } else {
      this._emitLocal();
      window.addEventListener("storage", e => { if(e.key === this._lk) this._emitLocal(); });
      return () => {};
    }
  },
  _emitLocal(){
    if(!this._cb) return;
    this._cb(this._getLocal().map(s => this._sanitise(s)).filter(Boolean));
  },
  /** Discards anything that doesn't match the expected shape. */
  _sanitise(d){
    if(!d || typeof d !== "object") return null;
    const name = typeof d.name === "string" ? d.name.trim().slice(0, 40) : null;
    const slug = typeof d.slug === "string" ? d.slug.slice(0, 32) : null;
    const byNameLower = typeof d.byNameLower === "string" ? d.byNameLower.slice(0, 24) : null;
    if(!name || !slug || !byNameLower) return null;
    if(!/^[a-z0-9-]+$/.test(slug)) return null;
    return { name, slug, byNameLower };
  }
};

/** Groups raw suggestions by slug; returns [{name, count}] sorted by suggester count desc. */
function aggregateSuggestions(arr){
  const groups = new Map();
  arr.forEach(s => {
    if(!groups.has(s.slug)) groups.set(s.slug, { name: s.name, suggesters: new Set() });
    groups.get(s.slug).suggesters.add(s.byNameLower);
  });
  return [...groups.values()]
    .map(g => ({ name: g.name, count: g.suggesters.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Wires the Suggestions form on places.html. Submits to Firestore + renders the aggregated list. */
function initSuggestions(){
  const form = document.getElementById("suggestForm");
  const input = document.getElementById("suggestInput");
  const list = document.getElementById("suggestList");
  const status = document.getElementById("suggestStatus");
  if(!form || !input || !list) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = input.value;
    const msg = Suggestions.validateMessage(v);
    if(msg){
      if(status) status.textContent = msg;
      return;
    }
    if(!Profile.isComplete()){ openOnboarding(); return; }
    Suggestions.add(v);
    input.value = "";
    if(status){
      status.textContent = "Added — everyone will see it shortly.";
      setTimeout(() => { if(status.textContent.startsWith("Added")) status.textContent = ""; }, 2200);
    }
  });

  Suggestions.subscribe(arr => {
    // Privacy-first: never render individual suggestions or who made them. Just the count.
    const groups = aggregateSuggestions(arr);
    const n = groups.length;
    if(!n){
      list.innerHTML = `<div class="suggest-empty">No suggestions yet.</div>`;
      return;
    }
    list.innerHTML = `<div class="suggest-count"><b>${n}</b> ${n === 1 ? "suggestion" : "suggestions"} received. Names and details stay private.</div>`;
  });
}

/* ============================================================
   3) SHARED STATE + HELPERS
   ============================================================ */
const byId = id => PLACES.find(p=>p.id===id);
/** Short badge label used on the place cards (places.html). Plain-English replacement
 *  for the internal "tier" nomenclature — visitors don't care what tier means. */
const tierLabel = t => t === 1 ? "Top pick" : t === 2 ? "Worth visiting" : "Touristy";
/** Longer descriptor for the detail sheet header. */
const tierTxt = t => t === 1 ? "Top pick · quiet and activity-rich"
                   : t === 2 ? "Worth visiting · one tradeoff"
                             : "Touristy · popular but commercial";
const tierCls = t => "tier-"+t;
function segs(n, cls){ let s=""; for(let i=1;i<=5;i++) s+=`<div class="seg ${i<=n?cls:''}"></div>`; return s; }

let ALL_VOTES = [];                 // every vote from everyone
function myVotes(){
  const me = (TripVotes.name()||"You").toLowerCase();
  const m = {};
  ALL_VOTES.forEach(v=>{ if((v.name||"").toLowerCase()===me) m[v.placeId]=v.vote; });
  return m;
}

/* ============================================================
   4) SHARED UI  (nav, name modal, detail sheet)
   ============================================================ */
function injectChrome(){
  const page = document.body.dataset.page || "";
  const link = (href,label,key)=>`<a href="${href}" class="${page===key?'active':''}">${label}</a>`;

  /* Skip-to-content link — first focusable element on every page (a11y). */
  const firstSection = document.querySelector("body > section");
  if(firstSection && !firstSection.id) firstSection.id = "main-content";
  const skip = document.createElement("a");
  skip.className = "skip-link";
  skip.href = "#main-content";
  skip.textContent = "Skip to main content";
  skip.addEventListener("click", e => {
    e.preventDefault();
    const target = document.getElementById("main-content");
    if(target){ target.setAttribute("tabindex","-1"); target.focus({preventScroll:false}); target.scrollIntoView({behavior:"smooth",block:"start"}); }
  });
  document.body.prepend(skip);

  const nav = document.createElement("div");
  nav.className="nav";
  nav.innerHTML = `
    <a class="brand" id="brandLink" href="index.html" aria-label="mY'sTory — back home or to your trip story">mY<span>'s</span>Tory</a>
    <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    <div class="links" id="navlinks">
      ${link("index.html","Home","home")}
      ${link("routes.html","Routes","routes")}
      ${link("places.html","Places","places")}
      ${link("travel.html","Travel","travel")}
      ${link("map.html","Map","map")}
      ${link("results.html","Results","results")}
    </div>
    <div class="spacer"></div>
    <div class="me">
      <button class="who" id="whoBtn" aria-label="Edit your profile"></button>
    </div>`;
  document.body.prepend(nav);

  document.getElementById("burger").addEventListener("click",()=>{
    document.getElementById("navlinks").classList.toggle("open");
  });
  document.getElementById("whoBtn").addEventListener("click",()=>openOnboarding());
  refreshNav();

  /* Brand routing: if the user has any Yes/Maybe picks, the brand takes them
     to the trip-story block on Results; otherwise it heads back home. Lets
     cmd/ctrl-click open in a new tab as normal. */
  const brand = document.getElementById("brandLink");
  if(brand){
    brand.addEventListener("click", e => {
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      // Uses pickedByMe() so Routes picks count toward "has data" — not just Places votes.
      const hasPicks = pickedByMe().length > 0;
      const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      if(hasPicks){
        if(here === "results.html"){
          const el = document.getElementById("trip-story");
          if(el){
            el.dataset.mode = "mine";          // brand-click always lands on My picks tab
            if(typeof renderTripStory === "function") renderTripStory();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            window.location.href = "results.html#trip-story";
          }
        } else {
          window.location.href = "results.html#trip-story";
        }
      } else {
        if(here === "index.html" || here === ""){
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.location.href = "index.html";
        }
      }
    });
  }

  /* onboarding takeover (multi-step story) */
  const ow = document.createElement("div");
  ow.className = "onb-wrap"; ow.id = "onbWrap";
  ow.innerHTML = `
    <div class="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-q">
      <button class="onb-close" id="onb-close" aria-label="Save and close" title="Save and close">×</button>
      <div class="onb-brand">mY<span>'s</span>Tory</div>
      <div class="onb-progress"><div class="onb-bar" id="onb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div></div>
      <div class="onb-stepbody" id="onb-stepbody">
        <div class="onb-step" id="onb-step"></div>
        <h2 class="onb-q" id="onb-q"></h2>
        <p class="onb-hint" id="onb-hint"></p>
        <input id="onb-input" class="onb-input" autocomplete="off" aria-labelledby="onb-q" aria-describedby="onb-hint onb-err">
        <div class="onb-err" id="onb-err" aria-live="polite"></div>
      </div>
      <div class="onb-actions">
        <button class="onb-back" id="onb-back">← Back</button>
        <button class="onb-next" id="onb-next">Next →</button>
      </div>
      <div class="onb-foot">Saved only on your device. Never uploaded.</div>
    </div>`;
  document.body.appendChild(ow);
  document.getElementById("onb-next").addEventListener("click", onbNext);
  document.getElementById("onb-back").addEventListener("click", onbBack);
  document.getElementById("onb-close").addEventListener("click", () => closeOnboarding(true));
  document.getElementById("onb-input").addEventListener("keydown", e => { if(e.key === "Enter") onbNext(); });
  // Clear the error message as soon as the user starts editing again.
  document.getElementById("onb-input").addEventListener("input", () => {
    const err = document.getElementById("onb-err"); if(err && err.textContent) err.textContent = "";
  });
  // Focus trap is now handled by the document-level Tab listener below
  // (this comment kept so onboarding flow remains discoverable to future readers).

  // detail sheet
  const scrim = document.createElement("div"); scrim.className="scrim"; scrim.id="scrim";
  const sheet = document.createElement("aside"); sheet.className="sheet"; sheet.id="sheet"; sheet.setAttribute("aria-hidden","true");
  sheet.innerHTML = `<div id="sheet-body"></div>`;
  document.body.appendChild(scrim); document.body.appendChild(sheet);
  scrim.addEventListener("click",closeSheet);

  // Fill in `data-profile="…"` placeholders in static HTML with the user's profile.
  hydrateProfileTokens();
  /* Escape: close whichever overlay is open. Never blindly call closeOnboarding,
     which could otherwise persist stale input from a non-open onboarding card. */
  document.addEventListener("keydown", e => {
    if(e.key !== "Escape") return;
    const sheet = document.getElementById("sheet");
    const onb = document.getElementById("onbWrap");
    if(sheet && sheet.classList.contains("on")) closeSheet();
    if(onb && onb.classList.contains("on") && Profile.isComplete()) closeOnboarding(true);
  });

  /* Document-level Tab trap. Catches Tab key even when focus has escaped the modal
     (e.g. onto the skip-link), and pulls focus back inside whichever overlay is active. */
  document.addEventListener("keydown", e => {
    if(e.key !== "Tab") return;
    const onb = document.getElementById("onbWrap");
    const sheet = document.getElementById("sheet");
    const active = onb && onb.classList.contains("on") ? onb
                : sheet && sheet.classList.contains("on") ? sheet
                : null;
    if(!active) return;
    const sel = 'button:not([disabled]):not([aria-hidden="true"]), [href], input:not([disabled])';
    const focusable = Array.from(active.querySelectorAll(sel))
      .filter(el => el.offsetParent !== null);    // skip hidden/display:none
    if(!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    const cur = document.activeElement;
    if(e.shiftKey){
      if(cur === first || !active.contains(cur)){ e.preventDefault(); last.focus(); }
    } else {
      if(cur === last || !active.contains(cur)){ e.preventDefault(); first.focus(); }
    }
  });
}

/**
 * Renders the user chip in the top-right of the nav.
 * Shows "Get started" before the profile is set; name + group + budget summary after.
 * User name is HTML-escaped before insertion as defence-in-depth against stored XSS.
 */
function refreshNav(){
  const b = document.getElementById("whoBtn"); if(!b) return;
  const p = Profile.get();
  if(!Profile.isComplete()){
    b.innerHTML = `<span class="who-cta">Get started</span>`;
    return;
  }
  const totalK = Math.round((p.budgetPP * p.groupSize) / 1000);
  b.innerHTML = `<span class="who-name">${escapeHTML(p.name)}</span>`
              + `<span class="who-meta">${p.groupSize}p · ₹${totalK}k</span>`;
}

/* ============================================================
   ONBOARDING — story-first multi-step
   ============================================================ */
const ONB_STEPS = [
  { key:"name", q:"What's your name?",
    hint:"Your name stays anonymous — used only to set up your own account on this device. The group never sees who voted for what.",
    type:"text", placeholder:"e.g. Pranav", maxlength:24,
    validate:v => {
      const t = (v||"").trim();
      if(t.length < 2) return "Real names use at least two letters.";
      if(!NAME_RX.test(t)) return "Letters, spaces, . ' or - only.";
      const letters = (t.match(/\p{L}/gu) || []).length;
      if(letters < 2) return "Real names use at least two letters.";
      return true;
    },
    parse:v => v.trim(),
    err:"Letters, spaces, . ' or - only." },
  { key:"age", q:"How old are you?",
    hint:"Sizes up activity options (easy-rider vs self-drive on the Ha Giang loop, etc.).",
    type:"number", placeholder:"e.g. 28", min:10, max:70,
    validate:v => {
      if(v === "" || !Number.isInteger(+v)) return "Whole numbers only.";
      const n = +v;
      if(n < 10) return "Too young to plan — ask a parent.";
      if(n > 100) return "World's oldest traveler, or a typo?";
      if(n > 70) return "Vietnam has steep hikes — let someone younger plan this.";
      return true;
    },
    parse:v => +v,
    err:"Whole numbers only." },
  { key:"groupSize", q:"How many people in your group?",
    hint:"Including you. Drives accommodation suggestions and cost-per-person totals.",
    type:"number", placeholder:"e.g. 5", min:1, max:12,
    validate:v => {
      if(v === "" || !Number.isInteger(+v)) return "Whole numbers only.";
      const n = +v;
      if(n < 1) return "At least 1, please.";
      if(n > 12) return "13+ is a tour group, not a family trip.";
      return true;
    },
    parse:v => +v,
    err:"Whole numbers, 1 to 12." },
  { key:"budgetPP", q:"Per-person budget (₹)?",
    hint:"Total spend per person — flights, hotels, food, activities. We match routes to it.",
    type:"number", placeholder:"e.g. 60000", min:40000, max:200000,
    validate:v => {
      if(v === "" || !Number.isInteger(+v)) return "Whole rupee amount.";
      const n = +v;
      if(n < 40000) return "Flights alone cost ~₹25k. Bump it up.";
      if(n > 200000) return "₹2L+ is more than Vietnam needs. Be realistic.";
      return true;
    },
    parse:v => +v,
    err:"Whole rupee amount." },
  { key:"bufferPP", q:"Buffer per person (₹)?",
    hint:"Wiggle room each person has on top of the budget. Used for upgrades or emergencies.",
    type:"number", placeholder:"e.g. 8000", min:5000, max:39999,
    validate:v => {
      if(v === "" || !Number.isInteger(+v)) return "Whole rupee amount.";
      const n = +v;
      if(n < 5000) return "₹5k minimum — surprises happen on any trip.";
      if(n >= 40000) return "That's a second budget. Add it to your main budget.";
      return true;
    },
    parse:v => +v,
    err:"Whole rupee amount." }
];

let _onbIdx = 0;
let _onbData = {};
let _pendingVote = null;
let _lastOnbTrigger = null;
let _wasInitialSetup = false;
let _onbFailCount = 0;

// After this many failed attempts on the budget/buffer steps, the error message
// also tells the user the exact accepted range — so a stuck user always sees the
// real numbers eventually instead of just repeated nudges.
const RANGE_HINT_AFTER = 2;
const RANGE_HINTS = {
  budgetPP: " Accepted range: ₹40,000 to ₹2,00,000.",
  bufferPP: " Accepted range: ₹5,000 to ₹39,999."
};

/**
 * Opens the onboarding takeover. Stores the trigger element so focus can be restored on close.
 * In edit mode (profile already complete) the close button is visible and saves on dismiss.
 */
function openOnboarding(){
  _lastOnbTrigger = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : null;
  _wasInitialSetup = !Profile.isComplete();
  _onbData = { ...Profile.get() };
  _onbIdx = 0;
  const card = document.getElementById("onbWrap");
  card.classList.add("on");
  document.getElementById("onb-close").style.display = Profile.isComplete() ? "" : "none";
  renderOnbStep();
}

/**
 * Closes the onboarding takeover.
 * When the user dismisses an *edit* session (`viaClose=true` and profile was complete),
 * any in-flight value in the current step is saved if it validates — so explicit close
 * still persists the change instead of dropping it.
 */
function closeOnboarding(viaClose){
  const wrap = document.getElementById("onbWrap");
  if(viaClose && Profile.isComplete()){
    const s = ONB_STEPS[_onbIdx];
    const v = document.getElementById("onb-input").value;
    if(s.validate(v) === true) _onbData[s.key] = s.parse(v);
    if(Object.keys(_onbData).length >= ONB_STEPS.length){
      Profile.set(_onbData);
      TripVotes.setName(_onbData.name);
      refreshNav(); renderHomeGreeting(); applyVoteUI();
    }
  }
  wrap.classList.remove("on");
  _pendingVote = null;
  if(_lastOnbTrigger){ try { _lastOnbTrigger.focus(); } catch {} _lastOnbTrigger = null; }
}

/** Renders the current onboarding step into the takeover card and re-triggers the slide-in animation. */
function renderOnbStep(){
  _onbFailCount = 0;
  const s = ONB_STEPS[_onbIdx], total = ONB_STEPS.length;
  const pct = ((_onbIdx + 1) / total) * 100;
  const bar = document.getElementById("onb-bar");
  bar.style.width = pct + "%";
  bar.setAttribute("aria-valuenow", String(Math.round(pct)));
  document.getElementById("onb-step").textContent = `Step ${_onbIdx+1} of ${total}`;
  document.getElementById("onb-q").textContent = s.q;
  document.getElementById("onb-hint").textContent = s.hint;
  const input = document.getElementById("onb-input");
  input.type = s.type;
  if(s.type === "number") input.setAttribute("inputmode", "numeric");
  else input.removeAttribute("inputmode");
  input.placeholder = s.placeholder;
  input.value = _onbData[s.key] != null ? _onbData[s.key] : "";
  input.removeAttribute("min"); input.removeAttribute("max"); input.removeAttribute("maxlength");
  if(s.min != null) input.min = s.min;
  if(s.max != null) input.max = s.max;
  if(s.maxlength != null) input.maxLength = s.maxlength;
  document.getElementById("onb-err").textContent = "";
  document.getElementById("onb-back").style.visibility = _onbIdx>0 ? "visible" : "hidden";
  document.getElementById("onb-next").textContent = _onbIdx === total-1 ? "Start planning →" : "Next →";

  // Re-trigger the slide-in animation by toggling the class.
  const stepBody = document.getElementById("onb-stepbody");
  if(stepBody){
    stepBody.classList.remove("in");
    void stepBody.offsetWidth;            // force reflow so the animation re-runs
    stepBody.classList.add("in");
  }
  // Longer delay on touch devices so iOS's keyboard animation can settle before focus scrolls the view.
  setTimeout(() => input.focus(), isTouchPointer() ? 300 : 60);
}
function onbNext(){
  const s = ONB_STEPS[_onbIdx];
  const v = document.getElementById("onb-input").value;
  const result = s.validate(v);
  if(result !== true){
    _onbFailCount++;
    let msg = typeof result === "string" ? result : s.err;
    if(_onbFailCount > RANGE_HINT_AFTER && RANGE_HINTS[s.key]){
      msg += RANGE_HINTS[s.key];
    }
    document.getElementById("onb-err").textContent = msg;
    return;
  }
  _onbData[s.key] = s.parse(v);
  if(_onbIdx < ONB_STEPS.length - 1){ _onbIdx++; renderOnbStep(); }
  else { onbFinish(); }
}
/** Steps back. Only persists the in-flight input if it validates,
   so a half-typed invalid value can't corrupt `_onbData`. */
function onbBack(){
  if(_onbIdx<=0) return;
  const s = ONB_STEPS[_onbIdx];
  const v = document.getElementById("onb-input").value;
  if(s.validate(v) === true) _onbData[s.key] = s.parse(v);
  _onbIdx--; renderOnbStep();
}
function onbFinish(){
  const wasInitial = _wasInitialSetup;
  const hadPendingVote = !!_pendingVote;
  _wasInitialSetup = false;

  Profile.set(_onbData);
  TripVotes.setName(_onbData.name);
  closeOnboarding();
  refreshNav();
  renderHomeGreeting();
  hydrateProfileTokens();      // re-fill any static data-profile placeholders
  applyVoteUI();
  // Profile just became valid — sync any pre-existing RoutePicks up to Firestore.
  RoutePicks._migrated = false;
  RoutePicks.maybeMigrate();
  if(_pendingVote){ const {placeId,vote}=_pendingVote; _pendingVote=null; doVote(placeId,vote); }

  // First-time setup lands at the top of the current page so the user sees the hero/intro,
  // not wherever they happened to be scrolled when they tapped 'Get started'.
  if(wasInitial && !hadPendingVote){
    window.scrollTo(0, 0);
  }
}

/* voting entry point — now gates on full profile */
function requestVote(placeId, vote){
  if(!Profile.isComplete()){ _pendingVote = {placeId, vote}; openOnboarding(); return; }
  doVote(placeId, vote);
}
function doVote(placeId, vote){
  const current = myVotes()[placeId];
  const next = current===vote ? null : vote;   // tap again to clear
  TripVotes.cast(placeId, next);
  // optimistic local update for snappy UI (Firebase snapshot will reconcile)
  if(!TripVotes.live){ /* local already emits */ }
  else {
    const me=(TripVotes.name()).toLowerCase();
    ALL_VOTES = ALL_VOTES.filter(v=>!((v.name||"").toLowerCase()===me && v.placeId===placeId));
    if(next) ALL_VOTES.push({name:TripVotes.name(),placeId,vote:next});
    applyVoteUI();
  }
}

/* ============================================================
   Detail sheet — opens from a marker / card / result row.
   Locks body scroll while open, traps focus, restores focus on close.
   ============================================================ */
let _lastSheetTrigger = null;

/** Opens the detail sheet for a place id. Focus moves to the close button. */
function openSheet(id){
  const d = byId(id); if(!d) return;
  _lastSheetTrigger = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : null;

  document.querySelectorAll(".leaflet-marker-icon").forEach(el=>el.classList.remove("active"));
  if(window._markers && window._markers[id]){ const el=window._markers[id].getElement(); if(el) el.classList.add("active"); }

  const mv = myVotes()[id];
  const vbtn = v => `<button data-v="${v}" class="${mv===v?'sel-'+v:''}" aria-label="${v[0].toUpperCase()+v.slice(1)} for ${escapeHTML(d.name)}">${v[0].toUpperCase()+v.slice(1)}</button>`;
  document.getElementById("sheet-body").innerHTML = `
    <button class="sheet-close" id="sheet-close" aria-label="Close details">×</button>
    <span class="s-tier ${tierCls(d.tier)}">${tierTxt(d.tier)}</span>
    <div class="s-name" id="sheet-name">${escapeHTML(d.name)}</div>
    <div class="s-reg">${escapeHTML(d.region)}</div>
    <div class="s-meters">
      <div><div class="m-lab">Crowd / commercial</div><div class="track">${segs(d.crowd,'crowd')}</div><div class="rv">${escapeHTML(d.crowdNote)}</div></div>
      <div><div class="m-lab">Things to do</div><div class="track">${segs(d.act,'act')}</div><div class="rv">${escapeHTML(d.actNote)}</div></div>
    </div>
    <p class="s-desc">${d.desc}</p>
    <div class="s-do"><h4>What you'd actually do</h4><ul>${d.doing.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul></div>
    <div class="s-when">${escapeHTML(applyProfileTokens(d.when))}</div>
    <div class="s-vlabel">Your vote</div>
    <div class="vote" data-id="${d.id}">${vbtn("yes")}${vbtn("maybe")}${vbtn("skip")}</div>`;
  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  document.querySelectorAll(`#sheet-body .vote button`).forEach(b => b.addEventListener("click", () => requestVote(d.id, b.dataset.v)));

  const sheet = document.getElementById("sheet");
  sheet.classList.add("on");
  sheet.setAttribute("aria-hidden", "false");
  sheet.setAttribute("aria-labelledby", "sheet-name");
  document.getElementById("scrim").classList.add("on");
  document.body.style.overflow = "hidden";   // scroll-lock the page while the sheet is open
  setTimeout(() => { const c = document.getElementById("sheet-close"); if(c) c.focus(); }, 60);
}

/** Closes the detail sheet, unlocks scroll, restores focus to the trigger. */
function closeSheet(){
  const s = document.getElementById("sheet"); if(!s) return;
  s.classList.remove("on");
  s.setAttribute("aria-hidden", "true");
  document.getElementById("scrim").classList.remove("on");
  document.body.style.overflow = "";
  document.querySelectorAll(".leaflet-marker-icon").forEach(el => el.classList.remove("active"));
  if(_lastSheetTrigger){ try { _lastSheetTrigger.focus(); } catch {} _lastSheetTrigger = null; }
}

/* ============================================================
   5) APPLY VOTE UI  (called on every snapshot + local change)
   ============================================================ */
function applyVoteUI(){
  const mv = myVotes();
  // map markers use the effective state (Places wins, then Routes), so a user
  // who picked a city on Routes sees a green marker even without an explicit vote
  if(window._markers){
    Object.entries(window._markers).forEach(([id,mk])=>{
      const el=mk.getElement(); if(!el) return;
      el.classList.remove("v-yes","v-maybe","v-skip");
      const ev = effectiveVote(id);
      if(ev) el.classList.add("v-"+ev);
    });
  }
  // place cards + open sheet
  document.querySelectorAll(".vote[data-id]").forEach(group=>{
    const id=group.dataset.id;
    group.querySelectorAll("button").forEach(b=>{
      b.classList.remove("sel-yes","sel-maybe","sel-skip");
      if(mv[id]===b.dataset.v) b.classList.add("sel-"+b.dataset.v);
    });
  });
  // results page
  if(document.body.dataset.page==="results") renderResults();
  // map page: keep the "My route" overlay in sync with the live votes
  if(_myRouteOn && window._mapInstance) renderMyRoute(window._mapInstance);
}

/* ============================================================
   6) PAGE INITS
   ============================================================ */
/* "My route" overlay state — tied to the map page. */
let _myRouteOn = false;
let _myRouteLayer = null;

function initMap(){
  if(typeof L==="undefined"){ return; }
  const map = L.map("map",{ zoomControl:false, scrollWheelZoom:false, minZoom:5, maxZoom:13 });
  L.control.zoom({position:"topright"}).addTo(map);
  window._mapInstance = map;     // applyVoteUI re-renders the route through this
  // Labels are hidden by default to keep the map clean; they appear on hover (desktop)
  // and once the user has zoomed in past level 7 (one pinch on phone, one wheel-tick on desktop).
  const mapHost = document.getElementById("map");
  const refreshZoomClass = () => { if(mapHost) mapHost.classList.toggle("zoomed-in", map.getZoom() >= 7); };
  map.on("zoomend", refreshZoomClass);
  setTimeout(refreshZoomClass, 0);
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"Tiles © Esri",maxZoom:18});
  const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,opacity:0.9});
  const light = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{attribution:"© OpenStreetMap, © CARTO",subdomains:"abcd",maxZoom:19});
  sat.addTo(map); labels.addTo(map);

  window._markers={}; const pts=[];
  const reduced = prefersReducedMotion();
  PLACES.forEach((d, i) => {
    const icon = L.divIcon({ className:"", html:`<div class="mk"><span class="mk-dot"></span><span class="mk-name">${escapeHTML(d.name)}</span></div>`, iconSize:[15,15], iconAnchor:[7,7] });
    const mk = L.marker([d.lat,d.lng], { icon, keyboard: true, title: d.name, alt: d.name }).addTo(map);
    mk.on("click", () => openSheet(d.id));
    mk.on("mouseover", () => { const e = mk.getElement(); if(e) e.style.zIndex = 1000; });
    mk.on("mouseout",  () => { const e = mk.getElement(); if(e) e.style.zIndex = ""; });
    const el = mk.getElement();
    if(el){
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${d.name} — open details`);
      el.addEventListener("keydown", e => {
        if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openSheet(d.id); }
      });
      if(!reduced){
        // Animate the inner .mk div so Leaflet's own transform on the wrapper isn't disturbed.
        const inner = el.querySelector(".mk");
        if(inner) inner.style.animationDelay = (i * 0.06) + "s";
      }
    }
    window._markers[d.id] = mk; pts.push([d.lat,d.lng]);
  });
  map.fitBounds(pts,{padding:[60,60]});
  setTimeout(()=>map.invalidateSize(),250);

  const bSat=document.getElementById("b-sat"), bLight=document.getElementById("b-light");
  bSat.addEventListener("click",()=>{ map.addLayer(sat); map.addLayer(labels); map.removeLayer(light); bSat.classList.add("on"); bLight.classList.remove("on"); });
  bLight.addEventListener("click",()=>{ map.addLayer(light); map.removeLayer(sat); map.removeLayer(labels); bLight.classList.add("on"); bSat.classList.remove("on"); });

  /* "My route" toggle: connects all yes / maybe places into a polyline with per-leg distances. */
  const bRoute = document.getElementById("b-myroute");
  if(bRoute){
    bRoute.addEventListener("click", () => {
      _myRouteOn = !_myRouteOn;
      bRoute.classList.toggle("on", _myRouteOn);
      bRoute.setAttribute("aria-pressed", String(_myRouteOn));
      bRoute.textContent = _myRouteOn ? "Hide my route" : "My route";
      renderMyRoute(map);
    });
  }

  applyVoteUI();
}

/**
 * Draws (or clears) the user's "yes + maybe" route on the map.
 * Places are ordered north→south by latitude — Vietnam stretches roughly on that axis,
 * so the sequence reads as a real trip sketch. Per-leg straight-line distance is
 * shown as a label at the segment midpoint; total + stop count goes into #route-info.
 * Re-runnable on every vote change.
 */
function renderMyRoute(map){
  if(!map) return;
  if(_myRouteLayer){ map.removeLayer(_myRouteLayer); _myRouteLayer = null; }
  const info = document.getElementById("route-info");

  if(!_myRouteOn){
    if(info){ info.hidden = true; info.innerHTML = ""; }
    return;
  }

  const picked = pickedByMe();
  const mv = myVotes();

  if(picked.length === 0){
    if(info){ info.hidden = false; info.innerHTML = `<span>Pick places on <a href="routes.html">Routes</a> or vote on <a href="places.html">Places</a> to build your route.</span>`; }
    return;
  }
  if(picked.length === 1){
    if(info){ info.hidden = false; info.innerHTML = `<span>You picked <b>${escapeHTML(picked[0].name)}</b>. Pick one more to start measuring distances.</span>`; }
    return;
  }

  // Order north → south so the line reads like a real itinerary.
  picked.sort((a, b) => b.lat - a.lat);

  const grp = L.featureGroup();
  const coords = picked.map(p => [p.lat, p.lng]);
  L.polyline(coords, { color: "#c2622f", weight: 3, opacity: 0.9 }).addTo(grp);

  let totalKm = 0;
  for(let i = 0; i < picked.length - 1; i++){
    const a = picked[i], b = picked[i + 1];
    const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
    totalKm += km;
    const mid = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
    L.marker(mid, {
      icon: L.divIcon({
        className: "",
        html: `<div class="dist-label">${Math.round(km)} km</div>`,
        iconSize: [60, 22],
        iconAnchor: [30, 11]
      }),
      keyboard: false,
      interactive: false
    }).addTo(grp);
  }

  grp.addTo(map);
  _myRouteLayer = grp;

  if(info){
    const yesN = picked.filter(p => mv[p.id] === "yes").length;
    const maybeN = picked.length - yesN;
    info.hidden = false;
    info.innerHTML = `
      <span class="ri-main"><b>${picked.length} places</b> &middot; <b>${Math.round(totalKm)} km</b> total <span class="ri-dim">(straight-line)</span></span>
      <span class="ri-sub">${yesN} yes &middot; ${maybeN} maybe &middot; ordered north → south</span>`;
  }
}

function initPlaces(){
  buildChart();
  initSuggestions();
  const grid=document.getElementById("grid");
  PLACES.forEach((d,i)=>{
    const c=document.createElement("div");
    c.className="card reveal"; c.style.transitionDelay=(i%3*0.05)+"s";
    c.innerHTML=`
      <div class="c-head"><span class="c-tier ${tierCls(d.tier)}">${tierLabel(d.tier)}</span></div>
      <div class="c-name">${d.name}</div>
      <div class="c-reg">${d.region}</div>
      <div class="meters">
        <div><div class="m-lab">Crowd <span>${d.crowdNote}</span></div><div class="track">${segs(d.crowd,'crowd')}</div></div>
        <div><div class="m-lab">To do <span>${d.actNote}</span></div><div class="track">${segs(d.act,'act')}</div></div>
      </div>
      <div class="c-desc">${d.desc}</div>
      <div class="vote" data-id="${d.id}"><button data-v="yes">Yes</button><button data-v="maybe">Maybe</button><button data-v="skip">Skip</button></div>
      <button class="c-more">See details ›</button>`;
    c.querySelector(".c-more").addEventListener("click",()=>openSheet(d.id));
    c.querySelectorAll(".vote button").forEach(b=>b.addEventListener("click",()=>requestVote(d.id,b.dataset.v)));
    grid.appendChild(c);
  });
  observeReveals();
  applyVoteUI();
}

/* Crowd × Activity scatter (hand-rolled SVG).
   Places at the same (act, crowd) cell collide visually — we cluster nearby points
   and stack their labels vertically so each is readable. */
function buildChart(){
  const host=document.getElementById("chart"); if(!host) return;
  const W=720,H=460, pad=54;
  const x = a => pad + ( (a-1)/4 )*(W-pad*2);          // activity 1..5 → left..right
  const y = c => (H-pad) - ( (5-c)/4 )*(H-pad*2);       // quietness (5-crowd) 0..4 → bottom..top

  // First pass: compute the dot position + colour for every place.
  const items = PLACES.map(d => ({
    d, px: x(d.act), py: y(d.crowd),
    col: d.tier===1 ? "var(--yes)" : d.tier===2 ? "var(--maybe)" : "var(--skip)"
  }));

  // Cluster items whose dots overlap visually (within CLUSTER_R px in either axis).
  // Within each cluster, distribute label Y around the cluster's mean so labels stack
  // instead of writing on top of each other. The dot stays at its true position.
  const CLUSTER_R = 32;
  const groups = [];
  items.forEach(it => {
    const grp = groups.find(g => g.some(o => Math.abs(o.px - it.px) < CLUSTER_R && Math.abs(o.py - it.py) < CLUSTER_R));
    if(grp) grp.push(it); else groups.push([it]);
  });
  groups.forEach(g => g.forEach((it, i) => { it.labDY = (i - (g.length - 1) / 2) * 16; }));

  let pts = "";
  items.forEach(it => {
    const labLeft = it.px > W - 150;
    const labX = labLeft ? it.px - 14 : it.px + 14;
    const labY = it.py + 4 + it.labDY;
    pts += `<g class="pt-g">
      <circle class="pt" cx="${it.px}" cy="${it.py}" r="7" fill="${it.col}" stroke="transparent" stroke-width="30" data-id="${it.d.id}"></circle>
      <line class="ptline" x1="${it.px}" y1="${it.py}" x2="${labLeft ? labX + 4 : labX - 4}" y2="${labY - 3}" stroke="rgba(0,0,0,0.12)" stroke-width="1"></line>
      <text class="ptlab" x="${labX}" y="${labY}" text-anchor="${labLeft ? 'end' : 'start'}">${escapeHTML(it.d.name)}</text>
    </g>`;
  });
  host.innerHTML = `
    <svg class="scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Crowd versus activity chart">
      <rect class="sweet" x="${pad+(W-pad*2)/2}" y="${pad}" width="${(W-pad*2)/2}" height="${(H-pad*2)/2}" rx="10"></rect>
      <text class="sweetlab" x="${W-pad-6}" y="${pad+18}" text-anchor="end">Sweet spot</text>
      <line class="axis" x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"></line>
      <line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}"></line>
      <line class="quad" x1="${pad+(W-pad*2)/2}" y1="${pad}" x2="${pad+(W-pad*2)/2}" y2="${H-pad}"></line>
      <line class="quad" x1="${pad}" y1="${pad+(H-pad*2)/2}" x2="${W-pad}" y2="${pad+(H-pad*2)/2}"></line>
      <text class="axlab" x="${W-pad}" y="${H-pad+26}" text-anchor="end">More to do →</text>
      <text class="axlab" x="${pad-14}" y="${pad-12}" transform="rotate(0)" text-anchor="start">↑ Quieter</text>
      ${pts}
    </svg>`;
  host.querySelectorAll(".pt").forEach(c=>c.addEventListener("click",()=>openSheet(c.dataset.id)));
}

/* ============================================================
   ANIMATION HELPERS — small, dependency-free, reduced-motion safe.
   ============================================================ */
/** True if the user has asked the OS to minimise motion. */
const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/** True if the primary pointer is coarse (touch screen) — used to skip desktop-only effects. */
const isTouchPointer = () => matchMedia("(pointer: coarse)").matches;

/**
 * Animates `el.textContent` from its current numeric value to `target`.
 * Skips the animation entirely under prefers-reduced-motion.
 */
function animateCount(el, target, duration = 800){
  if(!el) return;
  const start = parseInt(el.textContent, 10) || 0;
  if(start === target || prefersReducedMotion()){ el.textContent = String(target); return; }
  const t0 = performance.now();
  function step(t){
    const p = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(start + (target - start) * eased));
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Home-page enhancement. Hero is now fully CSS-only — nothing for JS to wire. */
function initHero(){ /* intentionally empty; reserved for future home-page hooks */ }

/* Routes page — picker + Leaflet polyline + when-to-go strip */
function initRoutes(){
  if(typeof L === "undefined") return;
  const picker = document.getElementById("routePicker");
  if(!picker) return;

  picker.innerHTML = ROUTES.map((r,i)=>{
    const est = estimateRouteCost(r);
    return `<button class="route-pick ${i===0?'on':''}" data-r="${r.id}">
      <div class="rp-name">${r.name}</div>
      <div class="rp-meta">${r.days} days · ${r.stops.length} stops</div>
      <div class="rp-cost">${formatINR(est)}/person</div>
    </button>`;
  }).join("");

  const map = L.map("routeMap",{ zoomControl:false, scrollWheelZoom:false, minZoom:5, maxZoom:13 });
  L.control.zoom({position:"topright"}).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"Tiles © Esri",maxZoom:18}).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,opacity:0.9}).addTo(map);

  // Same pattern as main map: marker labels appear past zoom 7. Default view shows just numbered chips.
  const routeMapHost = document.getElementById("routeMap");
  const refreshRouteZoom = () => { if(routeMapHost) routeMapHost.classList.toggle("zoomed-in", map.getZoom() >= 7); };
  map.on("zoomend", refreshRouteZoom);
  setTimeout(refreshRouteZoom, 0);

  function showRoute(routeId){
    const r = ROUTES.find(x=>x.id===routeId); if(!r) return;
    // Aggressive cleanup: sweep every overlay FeatureGroup off the map before adding
    // the new one. The earlier _layer-tracked approach left stray DOM under rapid
    // switching when polyline animations and fitBounds zooms overlapped. Now we just
    // trust the map to tell us what's there and remove all of it.
    map.eachLayer(layer => { if(layer instanceof L.FeatureGroup) map.removeLayer(layer); });

    const grp = L.featureGroup();
    const coords = [];
    r.stops.forEach((s,idx)=>{
      const p = byId(s.id); if(!p) return;
      const icon = L.divIcon({ className:"",
        html:`<div class="rmk"><span class="rmk-num">${idx+1}</span><span class="rmk-name">${escapeHTML(p.name)}</span></div>`,
        iconSize:[22,22], iconAnchor:[11,11] });
      L.marker([p.lat,p.lng],{icon}).addTo(grp);
      coords.push([p.lat,p.lng]);
    });
    L.polyline(coords, { color:"#c2622f", weight:3, opacity:0.9 }).addTo(grp);
    grp.addTo(map);
    // animate:false on fitBounds — overlapping zoom animations were the second
    // source of the "route behaves differently" bug. Snap the viewport instead.
    if(coords.length>1) map.fitBounds(L.latLngBounds(coords), { padding:[60,60], animate:false });
    renderRouteMeta(r);
  }
  function renderRouteMeta(r){
    const meta = document.getElementById("routeMeta"); if(!meta) return;
    const cost = estimateRouteCost(r);
    const fit = budgetFit(cost);
    const stopsHtml = r.stops.map((s,i)=>{
      const p = byId(s.id); if(!p) return "";
      return `<div class="stop"><div class="stop-n">${i+1}</div>
        <div class="stop-body"><div class="stop-name">${escapeHTML(p.name)}</div>
          <div class="stop-meta">${escapeHTML(p.region)} · ${s.nights} night${s.nights>1?'s':''}</div></div></div>`;
    }).join("");
    const totalGroup = Profile.isComplete() ? `<span class="rm-chip">${formatINR(cost*Profile.get().groupSize)} for ${Profile.get().groupSize}</span>` : "";
    meta.innerHTML = `
      <div class="rm-head">
        <h3>${r.name}</h3>
        <div class="rm-chips">
          <span class="rm-chip">${r.days} days</span>
          <span class="rm-chip">${r.stops.length} stops</span>
          <span class="rm-chip">${formatINR(cost)}/person</span>
          ${totalGroup}
          ${fit}
        </div>
      </div>
      <p class="rm-note">${r.note}</p>
      <div class="stop-list">${stopsHtml}</div>
      <p class="rm-disclaimer">Estimate is a rough sum of flights (~₹25k), e-visa (~₹2.1k), in-country (~₹3k/day) and inter-stop transfers (~₹1.5k each). Hotels & activities vary; treat as a baseline.</p>`;
  }

  picker.querySelectorAll(".route-pick").forEach(btn=>{
    btn.addEventListener("click",()=>{
      picker.querySelectorAll(".route-pick").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      showRoute(btn.dataset.r);
    });
  });
  showRoute(ROUTES[0].id);
  setTimeout(()=>map.invalidateSize(),250);

  // Route-picks wiring: delegated click on the activity matrix and the route-meta
  // (which re-renders when the user picks a different curated route). Listener
  // syncs every visible pill / stop with the stored selection.
  // Route-picks wiring: only the activity matrix is interactive. Curated route
  // stops are display-only (they show what each pre-made path looks like).
  const togglePickFromEvent = (e) => {
    const t = e.target.closest(".pill-tag[data-id]");
    if(!t) return;
    RoutePicks.toggle(t.dataset.id);
  };
  const matrixEl = document.querySelector(".matrix");
  if(matrixEl) matrixEl.addEventListener("click", togglePickFromEvent);
  RoutePicks.onChange(applyRoutePicksUI);
  applyRoutePicksUI();

  /* when-to-go strip with staggered cell reveal */
  const wh = document.getElementById("whenmap");
  if(wh){
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const lab = ["avoid","okay","good","excellent"];
    wh.innerHTML = `
      <div class="when-head"><div class="when-region"></div>${mo.map(m=>`<div class="when-mo">${m}</div>`).join("")}</div>
      ${WHEN.map(w=>`<div class="when-row"><div class="when-region">${w.region}</div>${w.months.map((v,i)=>`<div class="wcell w${v}" title="${mo[i]}: ${lab[v-1]}"></div>`).join("")}</div>`).join("")}
      <div class="when-legend">
        <span><span class="wcell w4"></span> excellent</span>
        <span><span class="wcell w3"></span> good</span>
        <span><span class="wcell w2"></span> okay</span>
        <span><span class="wcell w1"></span> avoid</span>
      </div>`;

    // Stagger the cell reveal once the strip scrolls into view.
    if(!prefersReducedMotion()){
      const cells = wh.querySelectorAll(".when-row .wcell");
      const reveal = () => cells.forEach((c, i) => { c.style.animationDelay = (i * 18) + "ms"; c.classList.add("in"); });
      const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ reveal(); io.disconnect(); } }), { threshold: 0.2 });
      io.observe(wh);
    }
  }
  applyVoteUI();
}

function estimateRouteCost(r){
  const flights = 25000, visa = 2100, perDay = 3000, perTransfer = 1500;
  return flights + visa + r.days*perDay + Math.max(0,r.stops.length-1)*perTransfer;
}
function budgetFit(cost){
  if(!Profile.isComplete()) return "";
  const p = Profile.get();
  const cap = p.budgetPP, hard = p.budgetPP + p.bufferPP;
  if(cost <= cap)  return `<span class="rm-chip fit-good">fits budget</span>`;
  if(cost <= hard) return `<span class="rm-chip fit-warn">uses buffer (+${formatINR(cost-cap)})</span>`;
  return `<span class="rm-chip fit-bad">over by ${formatINR(cost-hard)}</span>`;
}
function formatINR(n){ return "₹" + Math.round(n).toLocaleString("en-IN"); }

/**
 * Great-circle distance between two lat/lng pairs in kilometres (Haversine formula).
 * "Straight-line" / "as the crow flies" — not road distance. Used for the live
 * "My route" overlay on the map page; road routing would need an external API.
 */
function haversineKm(lat1, lng1, lat2, lng2){
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Substitutes `{n}` placeholders in PLACES / ROUTES strings with the user's actual group size.
 * Falls back to "the group" if the profile isn't set yet.
 */
function applyProfileTokens(s){
  if(typeof s !== "string" || !s.includes("{n}")) return s;
  const n = Profile.get().groupSize;
  return n ? s.replaceAll("{n}", String(n)) : s.replaceAll("{n}", "the group");
}

/**
 * Walks the DOM and fills in any `<element data-profile="key">fallback</element>` placeholders
 * using values from the user's Profile. Lets static HTML stay group-size / budget aware
 * without templating at build time. Re-runnable safely.
 */
function hydrateProfileTokens(){
  const p = Profile.get();
  document.querySelectorAll("[data-profile]").forEach(el => {
    const key = el.dataset.profile;
    if(key === "placeCount") el.textContent = String(PLACES.length);
    else if(key === "groupSize" && Number.isFinite(p.groupSize)) el.textContent = `${p.groupSize} of you`;
    else if(key === "groupSizeAdults" && Number.isFinite(p.groupSize)) el.textContent = `${p.groupSize} ${p.groupSize === 1 ? "adult" : "adults"}`;
    else if(key === "name" && p.name) el.textContent = p.name;
    else if(key === "budgetPP" && Number.isFinite(p.budgetPP)) el.textContent = formatINR(p.budgetPP);
    else if(key === "budgetTotal" && Number.isFinite(p.budgetPP) && Number.isFinite(p.groupSize)) el.textContent = formatINR(p.budgetPP * p.groupSize);
  });
}

/* Home greeting — reflects the captured profile */
function renderHomeGreeting(){
  const el = document.getElementById("greet"); if(!el) return;
  if(!Profile.isComplete()){ el.removeAttribute("data-on"); el.innerHTML = ""; return; }
  const p = Profile.get();
  const total = p.budgetPP * p.groupSize;
  const buf = p.bufferPP * p.groupSize;
  el.setAttribute("data-on","");
  el.innerHTML = `
    <div class="g-line"><span class="g-hi">Hi, ${escapeHTML(p.name)}.</span></div>
    <div class="g-bod"><b>${p.groupSize}</b> ${p.groupSize===1?"traveller":"travellers"} · <b>${formatINR(p.budgetPP)}</b>/person <span class="g-dim">(+ ${formatINR(p.bufferPP)} buffer)</span></div>
    <div class="g-tot">Total band: <b>${formatINR(total)}</b> – <b>${formatINR(total+buf)}</b></div>
    <button class="g-edit" id="g-edit">Edit details</button>`;
  document.getElementById("g-edit").addEventListener("click", openOnboarding);
}

function initResults(){ renderResults(); }

/**
 * Travel page — wires up the best-case route selector (entry city + exit airport).
 * Saves the user's pick to Profile; visible only to them, used by the trip-story
 * paragraph for a friendlier opening line. Selecting is optional.
 */
function initTravel(){
  const groups = document.querySelectorAll(".tp-opts");
  if(!groups.length) return;
  const summary = document.getElementById("tpSummary");
  const customInput = document.getElementById("tpCustomOrigin");

  /** Returns the user-visible label for the chosen departure city, taking the
   *  custom-typed city into account when origin === "OTHER". */
  const originLabel = (p) => {
    if(p.origin === "OTHER") return p.originCustom || ORIGIN_LABEL.OTHER;
    if(p.origin) return ORIGIN_LABEL[p.origin];
    return null;
  };

  const renderSummary = () => {
    if(!summary) return;
    const p = Profile.get();
    const o = originLabel(p);
    const x = p.exit ? EXIT_LABEL[p.exit] : null;
    if(!o && !x){ summary.textContent = ""; return; }
    const parts = [];
    if(o) parts.push(`flying in from <b>${escapeHTML(o)}</b>`);
    if(x) parts.push(p.exit === "OPEN" ? `<b>open</b> on where you exit` : `exiting via <b>${escapeHTML(x)}</b>`);
    summary.innerHTML = `Your best-case route: ${parts.join(", ")}.`;
  };

  /** Shows/hides the free-text "Other city" input and pre-fills it if a custom is saved. */
  const setCustomVisible = (visible) => {
    if(!customInput) return;
    if(visible){
      customInput.hidden = false;
      customInput.value = Profile.get().originCustom || "";
      setTimeout(() => customInput.focus(), 60);
    } else {
      customInput.hidden = true;
    }
  };

  // Wire each pill group (origin + exit)
  groups.forEach(group => {
    const key = group.dataset.key;
    const valid = key === "origin" ? VALID_ORIGINS : key === "exit" ? VALID_EXITS : null;
    if(!valid) return;
    const current = Profile.get()[key];
    group.querySelectorAll(".tp-opt").forEach(btn => {
      const isSelected = btn.dataset.val === current;
      btn.classList.toggle("on", isSelected);
      btn.setAttribute("aria-checked", String(isSelected));
      btn.addEventListener("click", () => {
        const v = btn.dataset.val;
        if(!valid.includes(v)){ Log.warn("initTravel", "invalid value", v); return; }
        const p = Profile.get();
        p[key] = v;
        // Clear the typed custom city when the user picks a standard option
        if(key === "origin" && v !== "OTHER") delete p.originCustom;
        Profile.set(p);
        group.querySelectorAll(".tp-opt").forEach(b => {
          const on = b.dataset.val === v;
          b.classList.toggle("on", on);
          b.setAttribute("aria-checked", String(on));
        });
        if(key === "origin") setCustomVisible(v === "OTHER");
        renderSummary();
      });
    });
  });

  // Custom-city input (only present on travel.html)
  if(customInput){
    const startOrigin = Profile.get().origin;
    setCustomVisible(startOrigin === "OTHER");
    const saveCustom = () => {
      const v = customInput.value.trim();
      const p = Profile.get();
      if(v && CITY_RX.test(v)){
        p.origin = "OTHER";
        p.originCustom = v;
        Profile.set(p);
      } else if(!v){
        // Empty input: clear the typed name (origin stays "OTHER" — picks were ambiguous)
        delete p.originCustom;
        Profile.set(p);
      }
      renderSummary();
    };
    customInput.addEventListener("blur", saveCustom);
    customInput.addEventListener("keydown", e => {
      if(e.key === "Enter"){ e.preventDefault(); customInput.blur(); }
    });
  }

  renderSummary();
}

/* ============================================================
   TRIP STORY — the closing-scene block on the Results page.
   Pure render: derives everything from the live votes + Profile,
   stores nothing of its own. The user never sees the maths
   ("above-average", "score", "median") — only the resulting story.
   ============================================================ */

/** Default suggested nights per place, derived from the curated tier. */
function _storyNights(p){ return p.tier === 1 ? 3 : p.tier === 2 ? 2 : 1; }

/** Returns the places the group is leaning toward — those with a vote
 *  score above the median across all places. Math stays here. */
function pickedByGroup(){
  // Per-user Places votes from the live ALL_VOTES stream
  const placeVotesByUser = {};
  ALL_VOTES.forEach(v => {
    const u = (v.name || "").toLowerCase();
    if(!u) return;
    if(!placeVotesByUser[u]) placeVotesByUser[u] = {};
    placeVotesByUser[u][v.placeId] = v.vote;
  });

  // Per-user RoutePicks from the group cache
  const routePicksByUser = RoutePicks.everyoneByUser();

  // Union of all user identities seen across both sources
  const allUsers = new Set([...Object.keys(placeVotesByUser), ...routePicksByUser.keys()]);

  // Per-place score, applying Places-overrides-Routes inside each user
  const rows = PLACES.map(d => {
    let score = 0;
    allUsers.forEach(u => {
      const placeVote = placeVotesByUser[u]?.[d.id];
      const routePicked = routePicksByUser.get(u)?.has(d.id);
      if(placeVote === "yes") score += 2;
      else if(placeVote === "maybe") score += 1;
      else if(placeVote === "skip") { /* explicit no — score += 0 */ }
      else if(routePicked) score += 2;       // implicit yes when no Places opinion
    });
    return { place: d, score };
  });

  if(!rows.length) return [];
  const scores = rows.map(r => r.score).slice().sort((a, b) => a - b);
  const mid = scores.length / 2;
  const median = scores.length % 2
    ? scores[Math.floor(mid)]
    : (scores[mid - 1] + scores[mid]) / 2;
  return rows.filter(r => r.score > 0 && r.score > median).map(r => r.place);
}

/** Returns the places the current user has picked — from Places votes (yes/maybe)
 *  or from Routes picks. Explicit Places 'skip' wins and removes the place. */
function pickedByMe(){
  return PLACES.filter(p => {
    const ev = effectiveVote(p.id);
    return ev === "yes" || ev === "maybe";
  });
}

/** Rough per-person cost for the trip — reuses the same formula as the route estimator. */
function _storyCostPP(stops){
  const flights = 25000, visa = 2100, perDay = 3000, perTransfer = 1500;
  const nights = stops.reduce((s, p) => s + _storyNights(p), 0);
  return flights + visa + nights * perDay + Math.max(0, stops.length - 1) * perTransfer;
}

/** Soft "best case" sentence appended to the story when the user has picked an origin / exit. */
function _flightCoda(){
  const p = Profile.get();
  // If the user typed their own city, use it; otherwise fall back to the standard label
  const oRaw = p.origin === "OTHER"
    ? (p.originCustom || ORIGIN_LABEL.OTHER)
    : (p.origin ? ORIGIN_LABEL[p.origin] : null);
  const o = oRaw ? escapeHTML(oRaw) : null;
  const x = (p.exit && p.exit !== "OPEN") ? EXIT_LABEL[p.exit] : null;
  if(!o && !x) return "";
  if(o && x) return ` Best case: flying in from <b>${o}</b>, exiting via <b>${x}</b>.`;
  if(o)      return ` Best case: flying in from <b>${o}</b>.`;
  return                 ` Best case: exit via <b>${x}</b>.`;
}

/** Builds the story paragraph for N places. Lead sentence is bold and frames who
 *  the picks belong to (you vs the group), then a geographic detail sentence, then cost. */
function composeStoryParagraph(stops, mode){
  const n = stops.length;
  if(n === 0) return "";
  const totalNights = stops.reduce((s, p) => s + _storyNights(p), 0);
  const cost = formatINR(_storyCostPP(stops));
  const coda = _flightCoda();
  const lede = mode === "mine"
    ? `<b>Your trip so far: ${totalNights} days across ${n} ${n === 1 ? "place" : "places"}.</b>`
    : `<b>The group is leaning toward ${totalNights} days across ${n} ${n === 1 ? "place" : "places"}.</b>`;
  let geo;
  if(n === 1){
    geo = `Quietly simple &mdash; ${totalNights} ${totalNights === 1 ? "night" : "nights"} in <b>${escapeHTML(stops[0].name)}</b>.`;
  } else {
    const first = escapeHTML(stops[0].name);
    const last = escapeHTML(stops[n - 1].name);
    if(n === 2){
      geo = `Starting in <b>${first}</b>, finishing in <b>${last}</b>.`;
    } else if(n === 3){
      const mid = escapeHTML(stops[1].name);
      geo = `<b>${first}</b>, <b>${mid}</b> and <b>${last}</b>.`;
    } else if(n === 4){
      const middles = stops.slice(1, -1).map(p => escapeHTML(p.name)).join(" and ");
      geo = `Starting in <b>${first}</b>, through ${middles}, ending in <b>${last}</b>.`;
    } else {
      const middlesArr = stops.slice(1, -1).map(p => escapeHTML(p.name));
      const middles = middlesArr.length <= 3
        ? middlesArr.slice(0, -1).join(", ") + " and " + middlesArr[middlesArr.length - 1]
        : `${middlesArr.slice(0, 2).join(", ")} and ${middlesArr.length - 2} more`;
      geo = `Starting in <b>${first}</b>, working south through ${middles}, ending in <b>${last}</b>.`;
    }
  }
  return `${lede} ${geo} Around <b>${cost}</b> per person.${coda}`;
}

/** Renders the small horizontal strip of stop chips with km between. */
function renderStoryStrip(stops){
  let html = "";
  stops.forEach((p, i) => {
    const nights = _storyNights(p);
    html += `<span class="story-chip"><b>${escapeHTML(p.name)}</b> &middot; ${nights} ${nights === 1 ? "night" : "nights"}</span>`;
    if(i < stops.length - 1){
      const km = haversineKm(p.lat, p.lng, stops[i+1].lat, stops[i+1].lng);
      html += `<span class="story-leg">${Math.round(km)} km</span>`;
    }
  });
  return html;
}

/** The Group's / My toggle pill. */
function renderStoryToggle(mode){
  return `
    <div class="story-toggle" role="tablist" aria-label="Trip view">
      <button class="story-tab ${mode === "mine" ? "on" : ""}" data-mode="mine" role="tab" aria-selected="${mode === "mine"}">My picks</button>
      <button class="story-tab ${mode === "group" ? "on" : ""}" data-mode="group" role="tab" aria-selected="${mode === "group"}">What most picked</button>
    </div>`;
}

/**
 * Renders the trip-story block. Called from inside renderResults so it stays in sync
 * with every vote change (own or remote). Read-only; the only user input is the toggle.
 */
function renderTripStory(){
  const host = document.getElementById("trip-story");
  if(!host) return;

  const mode = host.dataset.mode === "group" ? "group" : "mine";
  const stops = mode === "mine" ? pickedByMe() : pickedByGroup();

  if(stops.length === 0){
    host.innerHTML = `
      ${renderStoryToggle(mode)}
      <p class="story-empty">${mode === "mine"
        ? "Pick places on Routes or vote on Places — your trip lands here."
        : "When the group's votes come in, the places most have picked land here."}</p>`;
    bindStoryToggle(host);
    return;
  }

  // North → south so the story reads top-to-bottom geographically.
  stops.sort((a, b) => b.lat - a.lat);

  host.innerHTML = `
    ${renderStoryToggle(mode)}
    <p class="story-paragraph">${composeStoryParagraph(stops, mode)}</p>
    <div class="story-strip" aria-label="Places and distances">${renderStoryStrip(stops)}</div>
    <p class="story-note">A rough first draft &mdash; verify before booking.</p>`;
  bindStoryToggle(host);
}

/** (Re-)attaches click handlers to the toggle pills after each render. */
function bindStoryToggle(host){
  host.querySelectorAll(".story-tab").forEach(b => {
    b.addEventListener("click", () => {
      host.dataset.mode = b.dataset.mode;
      renderTripStory();
    });
  });
}

/**
 * Renders the results page. The per-place bar chart was removed — the trip-story
 * synthesis above (with My picks / What most picked toggle) is the single answer
 * to "what did the group decide". This function now just refreshes the voter count
 * and re-renders the story.
 */
function renderResults(){
  animateCount(document.getElementById("voterCount"), [...new Set(ALL_VOTES.map(v => v.name).filter(Boolean))].length);
  renderTripStory();
}

/* ============================================================
   7) reveal observer + BOOT
   ============================================================ */
/**
 * Reveals `.reveal` elements as they scroll into view.
 * Has two safety nets: an IntersectionObserver feature check, and a body-class
 * fallback that force-reveals anything still hidden 2.5s after window `load`.
 */
function observeReveals(){
  if(typeof IntersectionObserver === "undefined"){
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

/** Safety net: 2.5s after load, force-reveal any element the IntersectionObserver missed. */
window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.add("reveal-fallback"), 2500);
});

document.addEventListener("DOMContentLoaded",()=>{
  injectChrome();
  observeReveals();
  // live subscription drives all vote UI
  TripVotes.subscribe(arr=>{ ALL_VOTES=arr; applyVoteUI(); });
  // group-sync for RoutePicks — keeps pickedByGroup / "What most picked" in sync
  // with every user's Routes selections. Migration nudges any pre-PR-D
  // localStorage state up to Firestore once on page load.
  RoutePicks.subscribeAll(() => applyVoteUI());
  RoutePicks.maybeMigrate();

  const page=document.body.dataset.page;
  if(page==="map") initMap();
  else if(page==="places") initPlaces();
  else if(page==="routes") initRoutes();
  else if(page==="travel") initTravel();
  else if(page==="results") initResults();
  if(page==="home"){ initHero(); renderHomeGreeting(); }

  // first-visit story: open onboarding if profile isn't set
  if(!Profile.isComplete()) openOnboarding();
});
