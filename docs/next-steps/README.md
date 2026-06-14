# next-steps — what to build next

Each `.md` in this folder is a **ready-to-ship plan** for one feature.
They are numbered in priority order. If you're a fresh LLM picking
this up, skim [`../session-logs/`](../session-logs/) first to get the
product context, then come back here and pick the lowest-numbered
open file.

## Currently queued

Three PRs to finish the UX restructure that shipped in PRs #18–#21
(see the 2026-06-15 session log for the picture so far).

| # | Branch label | One-line summary | Plan written? |
|---|---|---|---|
| **B** | `feature/home-flow-diagram` | Replace the bare Home page with a calligraphic flowing-curve SVG illustration of the trip journey. Single Plan-the-trip CTA below. Option A from the UX brainstorm. | Not yet — write when starting |
| **C** | `feature/curated-routes-redesign` | Replace 3-cards-above-map with tabs + summary line + map + horizontal flow of city pills below. The map itself stays. | Not yet |
| **D** | `feature/route-picks-firestore-sync` | Sync `RoutePicks` to Firestore so the group view ("What most picked") includes other users' Routes selections. Currently localStorage only. Needs Firestore rules update. | Not yet |

## After PR-D — small follow-ups

| Item | Note |
|---|---|
| Remove the `Scroll ↓` cue arrow under the home hero | Once PR-B's flow diagram is rendering below the hero, the explicit scroll cue is redundant. Wait until the page below the hero feels visually complete (post-D), then drop the `.scrollcue` block. |

## Held back for later

| Idea | Why parked |
|---|---|
| **01 — Day-by-day calendar dates** ([`01-day-by-day-dates.md`](./01-day-by-day-dates.md)) | Plan was ready before the restructure. Paused until B/C/D ship. **Tile already shown on Results as "Soon · Coming next phase".** |
| Photos & food gallery | Tile shown on Results as "Soon · Coming next phase". Build when there's time + content. |
| "X days to departure" countdown badge | Only useful after date feature ships. |
| Per-user displayed names on Results | Explicit user rule: anonymity is non-negotiable. |

## How to pick this up

1. Read the next numbered plan top-to-bottom (or write one if it's a
   queued PR with no plan yet — match the shape of `01-day-by-day-dates.md`).
2. Create a branch following the naming convention from past PRs
   (`feature/<short-slug>` or `tweak/<short-slug>`).
3. Apply the changes in the order the plan suggests.
4. Smoke test (the plan lists the cases).
5. Open a PR using the project's PR-body shape (`## Summary` + change
   list + `## Test plan` checklist).
6. Squash-merge, delete the branch, sync local `main`, mark the plan
   here as **Shipped** and add a dated entry under
   [`../session-logs/`](../session-logs/).

## House rule

Never ship a feature that isn't in this folder first. Plans live here;
session logs capture what landed.
