# 04 — Curated routes UI redesign (PR-C)

**Status:** Plan ready, not started.
**Estimated diff size:** ~150 lines net (HTML restructure + CSS + render rewrite).
**Single PR.**

---

## The problem

Today's curated-routes section on `routes.html` has three weak parts:

1. **3 route-option cards on top** — disconnected from the map below.
2. **Stop-card strip below the map** — duplicates info already in the map
   markers and the summary chips.
3. **"What cities are in this route" is hard to see at a glance** —
   you have to read the strip below the map AND match it to the
   numbered chips on the map.

Plus the recent bug reports:

- Marker labels overlap in the north (covered in `02-quick-fixes.md` fix #2).
- Stale-state bug when switching options (covered in `02-quick-fixes.md` fix #3).
- The overall "line on the map" doesn't look polished.

This PR redesigns the whole section.

---

## Target layout

```
┌─────────────────────────────────────────────────┐
│  [Northern Loop]  [North + Central]  [Quiet+Adv]│  ← compact tab strip
├─────────────────────────────────────────────────┤
│  Northern Loop — 11 days · 5 stops · ₹67,800/p  │  ← single summary line
├─────────────────────────────────────────────────┤
│                                                  │
│         [ satellite map with route ]             │  ← stays
│                                                  │
├─────────────────────────────────────────────────┤
│  Hanoi ─→ Ninh Binh ─→ Pu Luong ─→ Ha Giang ─→  │  ← horizontal flow
│  Each pill is a place; small km label between.   │
└─────────────────────────────────────────────────┘
```

Drop the 3 cards on top. Drop the per-stop card strip at the bottom.
The cards are replaced by **tabs**; the bottom strip is replaced by a
**horizontal flow** of pills with km labels between them — like a
journey map.

---

## File-by-file plan

### `routes.html`
- Replace `<div class="route-picker" id="routePicker"></div>` block with
  a `<div class="route-tabs" id="routeTabs"></div>`.
- Drop the explanatory paragraph above ("Each option groups places that…")
  — the new compact tabs + summary already communicate this.
- Keep `<div id="routeMap"></div>` and `<div class="route-meta" id="routeMeta"></div>`.

### `app.js`
- `initRoutes()` — render tabs into `#routeTabs` instead of full cards
  into `#routePicker`. Pattern:
  ```html
  <button class="route-tab on" data-r="north-loop">Northern Loop</button>
  <button class="route-tab"     data-r="north-central">North + Central</button>
  <button class="route-tab"     data-r="quiet-adventure">Quiet + Adventure</button>
  ```
- `renderRouteMeta(r)` rewrites to emit:
  ```html
  <div class="rm-summary">
    <h3>${r.name}</h3>
    <div class="rm-line"><b>${r.days} days</b> · <b>${stops} places</b> · <b>${cost}/person</b> · ${fitBadge}</div>
    <p class="rm-note">${r.note}</p>
  </div>
  <!-- map renders in #routeMap above -->
  <div class="rm-flow">
    ${stops.map(...)}    <!-- pill + km label + pill + km label + ... -->
  </div>
  <p class="rm-disclaimer">${disclaimer}</p>
  ```
- Each pill in `.rm-flow` is just `<span class="rm-pill">${name}<span class="rm-nights">${n} nights</span></span>`.
- Between pills: `<span class="rm-arrow">→ ${km} km</span>`.
- Use `haversineKm` (already in app.js) to compute leg distances.

### `styles.css`
- New block for tabs:
  ```css
  .route-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;justify-content:center}
  .route-tab{
    background:var(--bg);border:1px solid var(--hair);
    font-family:inherit;font-weight:600;font-size:14px;
    padding:10px 18px;border-radius:100px;cursor:pointer;
    color:var(--ink-2);transition:.18s;min-height:44px;
  }
  .route-tab:hover{border-color:var(--ink);color:var(--ink)}
  .route-tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  ```
- New summary line:
  ```css
  .rm-summary{text-align:center;margin-bottom:14px}
  .rm-summary h3{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}
  .rm-line{font-size:14.5px;color:var(--ink-2)}
  .rm-line b{color:var(--ink);font-weight:600}
  ```
- New horizontal flow (the centerpiece):
  ```css
  .rm-flow{
    display:flex;flex-wrap:wrap;gap:0 6px;
    justify-content:center;align-items:center;
    margin-top:22px;
  }
  .rm-pill{
    display:inline-flex;flex-direction:column;align-items:center;
    background:var(--bg-2);border-radius:14px;
    padding:10px 14px;font-size:14px;font-weight:600;
    min-width:90px;
  }
  .rm-pill .rm-nights{font-size:11px;color:var(--ink-3);font-weight:500;margin-top:2px}
  .rm-arrow{
    font-size:11px;color:var(--ink-3);font-weight:500;
    letter-spacing:.04em;padding:0 4px;
  }
  @media(max-width:600px){
    .rm-flow{flex-direction:column;gap:6px}
    .rm-arrow{transform:rotate(90deg);padding:4px 0}
  }
  ```
- Drop the existing `.route-pick`, `.rp-name`, `.rp-meta`, `.rp-cost`,
  `.stop`, `.stop-n`, `.stop-name`, `.stop-meta`, `.stop-list` rules
  (~40 lines removed).

---

## Conflict with `02-quick-fixes.md`

Fix #2 in the quick-fixes plan covers `.rmk-name` (the map marker
labels). That fix stays — it's about the marker labels on the satellite
map, not the new flow below. The new horizontal-flow pills are a
**different thing** from the marker labels; both should ship.

Fix #3 (stale state on route-switch) probably gets resolved as a
side-effect of the rewrite, because `renderRouteMeta` will fully replace
the `#routeMeta` contents on every switch. But verify explicitly.

---

## Mobile behavior

The horizontal flow at desktop turns vertical on phone:

```
Hanoi (1 night)
   ↓
   95 km
   ↓
Ninh Binh (2 nights)
   ↓
   ...
```

Each step is its own line with the km between rotated. Reads naturally
on a narrow screen.

---

## Test plan

- [ ] Three tabs render with the first active by default
- [ ] Click each tab → map line updates, summary line updates, horizontal flow updates
- [ ] Each pill in the flow shows place name + nights count
- [ ] Between pills, the km label is the **haversine** distance, rounded to integer km
- [ ] On phone (≤600px), pills stack vertically with km labels rotated to vertical reading
- [ ] No stale lines/markers when rapidly switching tabs
- [ ] Disclaimer text still appears below the flow

---

## Out of scope (don't pull in)

- Making the flow pills clickable (selection still happens in the
  activity matrix above; the curated section is read-only display)
- Any change to the satellite map itself beyond the marker-label fix
  that ships in `02-quick-fixes.md`
- Animation between tab switches (could be a v2 polish)

---

## How to ship

1. `git checkout -b feature/curated-routes-redesign`
2. Replace HTML structure
3. Rewrite `renderRouteMeta` + tab init
4. Add new CSS / drop old CSS
5. Smoke test (the 7 items above)
6. PR + merge + move row in feedback-log
