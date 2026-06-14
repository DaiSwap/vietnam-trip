# State of the site — 2026-06-15

**TL;DR**: The major UX restructure shipped over PRs #18, #19, #20, #21.
The linear flow now reads **Home → Routes (the picker) → Map → Results**
with **Places** and **Travel** as optional side-trips. `RoutePicks` runs
parallel to `TripVotes` and Places votes always override Routes picks
when computing the effective state for the map and the trip story.

Read the [2026-06-14 entry](./2026-06-14-state-of-site.md) first for
the unchanged background (product premise, hard constraints,
architecture overview, branch-per-task workflow, decision history).
This log only captures **what changed since then**.

---

## 1. Page flow today

```
Home (hero + Plan-the-trip CTA only — no tiles)
  │
  ▼
Routes
  ├─ Activity matrix (tap pills to select — the primary picker)
  ├─ Three curated routes on a satellite map (read-only display)
  ├─ Climate by region by month
  └─ End-CTAs:
        primary   → Map  ("See your picks on the map →")
        secondary → Places ("Read about each place in depth →")
  │
  ├──→ Travel (optional, accessible via nav only)
  │
  ├──→ Places (optional, in-depth)
  │       │ Yes / Maybe / Skip voting per place — overrides Routes.
  │       │ Top is tagged "Optional · for finer control".
  │       │
  │       └─ End-CTA → Map
  │
  ▼
Map  (markers reflect effective state — green/yellow/red/grey)
  │
  ▼
Results
  ├─ Voter count
  ├─ Trip story toggle:  My picks  /  What most picked
  └─ Tile grid → Routes / Places / Map / Travel (for going back)
```

The old "Four quick steps" tile grid on Home is gone. Home is now hero-only.
The same tile grid lives on Results so users finishing the closing story
can navigate back to edit anywhere.

---

## 2. New storage and resolver

| Store | Purpose | Persistence |
|---|---|---|
| `myVotes` (via `TripVotes`) | Places page voting — yes / maybe / skip | localStorage + Firestore |
| **`RoutePicks` (new)** | Routes activity-matrix selection — binary set | **localStorage only** (Firestore sync is PR-D) |

**`effectiveVote(placeId)`** resolves both:

```js
function effectiveVote(placeId){
  const v = myVotes()[placeId];
  if(v === "yes" || v === "maybe" || v === "skip") return v;
  return RoutePicks.has(placeId) ? "yes" : null;
}
```

Places vote wins. RoutePicks fills in as a yes when Places has no opinion.
Used by `applyVoteUI` (map marker classes), `pickedByMe` (trip story),
`renderMyRoute` (My-route overlay polyline).

`RoutePicks` API:
- `has(id)` / `ids()` — read
- `toggle(id)` — write + notify listeners (silently drops unknown place IDs)
- `onChange(fn)` — register listener for UI re-renders

---

## 3. UI changes worth remembering

- **Activity-matrix pills** on Routes are toggle buttons with `data-id`.
  Same place across rows toggles together (one shared state via shared id).
  Visual: outlined chip → green-filled with `✓` prefix when on.
- **Curated route stops** in the detail view are read-only display
  (reverted from buttons after user feedback). Click handler scoped to
  `.pill-tag[data-id]` only, no longer also `.stop[data-id]`.
- **Map marker labels** are hidden by default but **always show for
  markers with a vote/pick class** (`v-yes`, `v-maybe`, `v-skip`).
  Unselected markers still wait for hover or zoom ≥ 9.
- **Results page** — the per-place bar chart is **removed entirely**.
  Trip-story synthesis is the single answer to "what did the group
  pick". Default tab is **My picks**; group tab renamed to
  **What most picked**. Story headline is merged into the paragraph
  with a bold lede that leads with duration:
  > *"**Your trip so far: 7 days across 5 places.** Starting in Hanoi,
  > working south to Ho Chi Minh City. Around ₹54,100 per person."*
- **"stops" → "places"** across all user-facing story copy.
- **Places page** is tagged `Optional · for finer control` and the
  sub-headline now spells out that Places votes override Routes picks.
- **Home** loses the tile grid. Just the hero with the calligraphic
  flow diagram still to come (PR-B).
- **Travel** is no longer in the linear-flow end-CTAs on any other
  page. Reachable through nav and any sidelink mentions only.

---

## 4. PR history additions

| PR | Title | What it landed |
|---|---|---|
| 12 | docs/next-steps + docs/session-logs | Handoff folders + the 2026-06-14 log |
| 13 | Linear flow + drop nav tally chips | Home → Routes → Places → Travel → Map → Results (later restructured) |
| 14 | Onboarding guardrails + matrix-as-reference + climate scroll | Funny rejections, activity matrix as info, climate horizontal scroll |
| 15 | Mobile UI: iOS zoom, tap targets, onboarding overflow | Seven mobile bugs fixed |
| 16 | Post-onboarding scroll + Places skip-button gone + shorter guardrails + hover/zoom map labels | UX cleanups |
| 17 | Range hint after 2 rejections | Budget/buffer hints after repeated fails |
| **18** | **Phase 1: Routes is the primary selection page** | RoutePicks + clickable activity matrix |
| **19** | **Phase 2: Map + Results read combined state** | effectiveVote, default to My picks, drop bar chart, rename group tab |
| **20** | **Map labels + curated stops read-only + Routes copy + tiles Home→Results** | Bug fixes after user testing |
| **21** | **Places Optional tag + hero eyebrow + this log** | Small polish, this doc |

---

## 5. What's queued (see `../next-steps/README.md`)

**PR-B** — Home flow diagram (calligraphic flowing curve, option A from the brainstorm).
**PR-C** — Curated routes UI redesign (replace 3-cards-above-map with tabs + summary + map + horizontal flow).
**PR-D** — RoutePicks Firestore sync (so "What most picked" includes other users' Routes selections).

The day-by-day calendar dates feature (`../next-steps/01-day-by-day-dates.md`)
stays parked until the restructure work is fully done.

---

## 6. Things explicitly NOT changing

All section-2 hard constraints from the 2026-06-14 log still apply
verbatim — anonymity, plain English, free-tier cost, clean inspect
view, story tone, mobile-first. None of the architecture choices
(plain HTML/JS, Firestore, Leaflet, GitHub Pages) have changed.
