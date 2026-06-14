# 02 — Quick fixes bundle

**Status:** Plan ready, not started.
**Estimated diff size:** ~80 lines across app.js, styles.css, places.html.
**Single PR.**

---

## What's in this bundle

Five small fixes called out in 2026-06-15 user testing. None of them is
worth its own PR; together they make a clean quick-polish PR.

| # | What | File | Lines |
|---|---|---|---|
| 1 | Apply missed JS zoom-threshold change | app.js | 1 |
| 2 | Curated route markers — hide names by default | styles.css | ~6 |
| 3 | Curated route stale-state bug — fix layer cleanup | app.js | ~10 |
| 4 | Suggestion list — hide individual suggestions, show count | app.js | ~15 |
| 5 | Suggestion guardrails — min/max + contact-daiswap fallback | app.js | ~25 |

---

## Fix 1 — JS zoom threshold (one line)

PR #23 was supposed to lower the threshold from 9 to 7 so labels appear
after one zoom-in step instead of needing to zoom deep. The JS edit
failed silently in that branch; only the CSS landed.

```js
// app.js  ~line 1074
const refreshZoomClass = () => { if(mapHost) mapHost.classList.toggle("zoomed-in", map.getZoom() >= 7); };
//                                                                                                    ^ was 9
```

Update the comment two lines above as well — it says "past level 9".

---

## Fix 2 — Curated route markers hide names by default

The 3-curated-routes map page has `.rmk` pill markers that show
**number + name** always. In the northern cluster they overlap badly.
Match the `.mk-name` pattern from the main map.

```css
/* styles.css — replace the static .rmk-name with hover/zoom behaviour */
.rmk-name{color:var(--ink);opacity:0;transition:opacity .15s}
.leaflet-marker-icon:hover .rmk-name,
#routeMap.zoomed-in .rmk-name{opacity:1}
```

Then add a tiny zoomend listener in `initRoutes()` matching the one in
`initMap()`:

```js
// app.js — inside initRoutes(), after map is created
const routeMapHost = document.getElementById("routeMap");
const refreshRouteZoom = () => { if(routeMapHost) routeMapHost.classList.toggle("zoomed-in", map.getZoom() >= 7); };
map.on("zoomend", refreshRouteZoom);
setTimeout(refreshRouteZoom, 0);
```

Behaviour after: default view shows the numbered chip only (clean). Hover
or zoom-in reveals the full city name on each chip.

---

## Fix 3 — Curated route stale state bug

**Symptom (user reported)**: clicking between curated route options leaves
remnants of previous lines/markers on the map.

**Suspected cause**: `showRoute` removes `_layer` and creates a new
`featureGroup`, but the **polyline animation** (`stroke-dashoffset`)
may be in flight when the user clicks the next option. The new line
draws on a fresh group while the old animation still references the
DOM element.

**Plan**:
1. Read the existing `showRoute` body (`app.js` ~line 1300–1340).
2. Verify `map.removeLayer(_layer)` actually clears every child marker
   and the polyline (Leaflet should do this for a featureGroup, but
   verify with a quick log).
3. If verified clean, the visible bug is probably a paint/animation
   race — cancel the running stroke animation before adding the new
   line: `path.style.transition = "none"` then re-set in next frame.
4. Smoke test: rapidly click between three route options. The map
   should always show exactly one polyline + one set of markers.

If the deeper cause turns out to be marker leak, switch to
`L.layerGroup` or explicitly call `_layer.clearLayers()` before
removeLayer.

---

## Fix 4 — Suggestion list, hide individual entries

User wants the Places suggestion form to NOT show the list of
suggestions (currently shows each suggested place name + "N person"
count next to it).

Replace the per-entry rendering with a single line showing the count:

```js
// app.js — in initSuggestions, replace the Suggestions.subscribe body
Suggestions.subscribe(arr => {
  const groups = aggregateSuggestions(arr);
  const totalUnique = groups.length;
  if(!totalUnique){
    list.innerHTML = `<div class="suggest-empty">No suggestions yet. The group sees the count, but not who suggested what.</div>`;
    return;
  }
  list.innerHTML = `<div class="suggest-count"><b>${totalUnique}</b> ${totalUnique === 1 ? "suggestion" : "suggestions"} received. Names and details stay private.</div>`;
});
```

And drop the `.suggest-item` CSS rules that styled the per-row look —
they're now dead. Keep `.suggest-empty` and add `.suggest-count`:

```css
.suggest-count{margin-top:14px;padding:12px 16px;background:var(--bg-2);border-radius:12px;font-size:14px;color:var(--ink-2);text-align:center}
.suggest-count b{color:var(--ink);font-weight:700}
```

---

## Fix 5 — Suggestion guardrails

Current `Suggestions.validate`: `1 ≤ length ≤ 40`. Too lax — accepts
"a" or "Bleh".

**New rules**:
- Min 2 characters
- Max 100 characters (allows a sentence of context if user wants)
- Max 2 sentence-ending punctuation marks (`.`, `!`, `?`)
- Helpful overflow message: *"For longer feedback, message daiswap directly."*

```js
// app.js — replace Suggestions.validate
validate(s){
  if(typeof s !== "string") return false;
  const t = s.trim();
  if(t.length < 2 || t.length > 100) return false;
  // Count sentence endings — max 2 allowed
  const endings = (t.match(/[.!?]/g) || []).length;
  if(endings > 2) return false;
  return true;
},

// Also expose a typed error message for the form layer to read:
validateMessage(s){
  if(typeof s !== "string") return "Type a place name.";
  const t = s.trim();
  if(t.length < 2) return "At least 2 characters, please.";
  if(t.length > 100) return "For longer feedback, message daiswap directly.";
  const endings = (t.match(/[.!?]/g) || []).length;
  if(endings > 2) return "Keep it brief — message daiswap directly for longer notes.";
  return null; // valid
}
```

In `initSuggestions`, use the typed message:

```js
const msg = Suggestions.validateMessage(v);
if(msg){ if(status) status.textContent = msg; return; }
```

Update `places.html` input — bump `maxlength="40"` to `maxlength="100"`
so the new max actually fits.

---

## Test plan

- [ ] Routes page on phone: pinch-zoom once → all activity-matrix labels visible (was needing 2–3 pinches)
- [ ] Curated route map: default view shows numbered chips only, no overlapping names
- [ ] Curated route map: hover any chip → its city name appears
- [ ] Rapidly click between Northern Loop / North+Central / Quiet+Adventure 5 times → final state is one clean polyline + one set of markers, no stragglers
- [ ] Places form: type "ab" → accepted; type "a" → "At least 2 characters"
- [ ] Places form: type 105-char string → "For longer feedback, message daiswap directly."
- [ ] Places form: type 3-sentence string (e.g. "Hi. There. Maybe Pune?") → "Keep it brief — message daiswap directly for longer notes."
- [ ] After valid submission: status shows "Added — everyone will see it shortly."
- [ ] The suggestion area below the form: shows "N suggestions received. Names and details stay private." — no individual entries listed

---

## Out of scope (don't bundle here)

- Curated routes UI redesign (separate plan: `04-curated-routes-redesign.md`)
- RoutePicks Firestore sync (separate plan: `05-routepicks-firestore-sync.md`)
- Home flow diagram (separate plan: `03-home-flow-diagram.md`)

---

## How to ship

1. `git checkout -b fix/02-quick-fixes`
2. Apply all 5 fixes
3. Smoke test (the 8 items above)
4. Standard PR with `## Summary` + `## Test plan`
5. Squash-merge, delete branch, sync main, move this plan's row in `feedback-log.md` to "Shipped"
