# Feedback log

A running record of every piece of user feedback in this codebase,
with status. Shipped items reference the PR; open items reference the
plan doc in [`next-steps/`](./next-steps/).

Newest at top. Each entry: **(date) issue → status / plan ref**.

---

## Open — queued

### Quick fixes (bundle into one PR)

See [`next-steps/02-quick-fixes.md`](./next-steps/02-quick-fixes.md) for the full plan.

| Item | Source | Notes |
|---|---|---|
| Apply missed JS zoom-threshold change | PR #23 (was meant to land there, the JS edit failed silently) | Single line in `app.js`: `>= 9` → `>= 7`. |
| Curated route map markers — hide names by default | User feedback 2026-06-15 ("line on the map" UI bad) | Same hover/zoom pattern as `.mk-name` on the main map. |
| Curated route stale state — different lines on reclick | User feedback 2026-06-15 (route-switching bug) | Needs investigation in `showRoute()` / `_layer` cleanup. |
| Suggestion list — hide individual suggestions | User feedback 2026-06-15 | Show only "N suggestions received". No names, no place names from the list. |
| Suggestion guardrails — min/max + contact-daiswap message | User feedback 2026-06-15 | Min 2 chars, max 2 sentences. Beyond max → "For longer feedback, contact daiswap directly." |

### Bigger PRs (each with its own plan)

| PR | Plan | One-line |
|---|---|---|
| **PR-B** | [`next-steps/03-home-flow-diagram.md`](./next-steps/03-home-flow-diagram.md) | Calligraphic flowing-curve SVG on home replacing the bare hero. Option A from the brainstorm. |
| **PR-C** | [`next-steps/04-curated-routes-redesign.md`](./next-steps/04-curated-routes-redesign.md) | Replace 3-cards-above-map with tabs + summary line + map + horizontal flow of city pills. |
| **PR-D** | [`next-steps/05-routepicks-firestore-sync.md`](./next-steps/05-routepicks-firestore-sync.md) | Sync `RoutePicks` to Firestore so "What most picked" includes other users' Routes selections. |

### After PR-D ships

| Item | Note |
|---|---|
| Drop the `Scroll ↓` cue arrow under the hero | Once PR-B fills the area below, the explicit cue is redundant. |

---

## Open — parked (don't ship)

| Idea | Status / reason |
|---|---|
| Day-by-day calendar dates ([`next-steps/01-day-by-day-dates.md`](./next-steps/01-day-by-day-dates.md)) | Plan ready. Paused until restructure (B/C/D) ships. Tile shown on Results as "Soon · Coming next phase". |
| Photos & food gallery | Tile shown on Results as "Soon · Coming next phase". Build when content exists. |
| "X days to departure" countdown | Useless until dates ship. |
| Per-user displayed names anywhere | **Rejected** — anonymity is a hard constraint. |
| Bar chart on Results | **Rejected** — removed in PR #19. The trip-story synthesis is the single answer to "what did the group decide". |

---

## Shipped

### 2026-06-15

| PR | Title | What landed |
|---|---|---|
| #18 | Phase 1 — Routes is the primary selection page | `RoutePicks` localStorage store + clickable activity matrix |
| #19 | Phase 2 — Map + Results read combined state | `effectiveVote` resolver; default tab → My picks; group tab renamed; bar chart removed |
| #20 | Map labels + curated stops read-only + Routes copy + tiles Home→Results | Bug fixes after live testing |
| #21 | PR-A — Places Optional tag + hero eyebrow + docs | "Optional · for finer control" tag; drop year from eyebrow; new session log |
| #22 | Bring back Soon tiles on Results + queue scroll-cue removal | Day-by-day + Photos tiles back as "Coming next phase" |
| #23 | Fix map label overlap | Selected dots scaled +25%, zoom threshold change (JS edit failed — see open quick-fix) |
| #24 (this PR) | Routes copy reorder + comprehensive feedback log + plans for B/C/D | Move "Don't know what each place is like?" to top; drop the redundant "tap again" line; add this log + 4 plan files |

### Earlier (pre-restructure)

See PR list in [`session-logs/2026-06-15-restructure-shipped.md`](./session-logs/2026-06-15-restructure-shipped.md) — covers PRs 1–#17.

---

## How to use this doc

- **When new feedback comes in**: add a one-line entry under the right section. Link to a plan doc for anything non-trivial.
- **When a plan ships**: move the entry to "Shipped" with the PR number. Don't delete it.
- **When a plan is rejected**: move to "Open — parked" with the reason.
- **When the queue gets long**: review whether anything in "queued" should be parked instead.

This doc is the source of truth for "what does the user want, and where is it in the pipeline." Keep it up to date on every PR.
