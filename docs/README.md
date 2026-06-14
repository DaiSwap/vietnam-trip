# docs — context, plans and session history

This folder is the project's institutional memory. It exists so that
the next person (human, Claude, or any other LLM) picking up the
codebase can get **oriented in minutes, not hours**.

**Live site:** [daiswap.github.io/mY-sTory](https://daiswap.github.io/mY-sTory/)
&nbsp;·&nbsp;
**Repo root:** [`../README.md`](../README.md)

## Where to start

| If you want to… | Read… |
|---|---|
| Understand what this product *is* + the current state | [`session-logs/`](./session-logs/) — start with the newest |
| See every piece of user feedback and where it stands | [`feedback-log.md`](./feedback-log.md) |
| See what's planned next and pick a feature to ship | [`next-steps/`](./next-steps/) |
| Understand the day-by-day builder review process (historical) | [`day-by-day-builder/`](./day-by-day-builder/) |

## File map

```
docs/
├── README.md                  ← you are here
├── feedback-log.md            running record of every user suggestion
│                              with status (open / shipped / parked).
│                              Single source of truth for "what does the
│                              user want, and where is it in the pipeline."
├── session-logs/              dated snapshots of the codebase state.
│                              Newest first. Don't edit old ones.
│                              ├── README.md
│                              ├── 2026-06-14-state-of-site.md
│                              ├── 2026-06-15-restructure-shipped.md
│                              └── 2026-06-15-followups-and-prd.md
├── next-steps/                ready-to-ship plans, one per feature.
│                              Each has file paths, code skeletons,
│                              test plan, risks. Numbered in priority.
│                              ├── README.md            ← queue
│                              ├── 01-day-by-day-dates.md  (parked)
│                              ├── 02-quick-fixes.md       (shipped #25)
│                              ├── 03-home-flow-diagram.md (queued PR-B)
│                              ├── 04-curated-routes-redesign.md (shipped #29)
│                              └── 05-routepicks-firestore-sync.md (shipped #26)
└── day-by-day-builder/        historical 10-reviewer critique of the
                               original day-by-day plan v0 and the
                               smaller v1 synthesis block that shipped
                               instead. Useful background but not
                               needed for day-to-day work.
```

## How to add new content

| Adding… | Where it goes |
|---|---|
| A new piece of user feedback | One-line row in [`feedback-log.md`](./feedback-log.md) under the right section. |
| A new feature plan | New `NN-slug.md` file in [`next-steps/`](./next-steps/). Match the shape of an existing one. Link from `next-steps/README.md`. |
| A snapshot after material work shipped | New `YYYY-MM-DD-slug.md` in [`session-logs/`](./session-logs/). Link from `session-logs/README.md`. Don't edit old logs. |

## House style for these docs

- **Plain English.** Same constraint as the user-facing site.
- **Relative paths from repo root** (`app.js`, `docs/next-steps/...`), never absolute (`/Users/...`).
- When quoting code, **include the file path and approximate line number** so the reader can find it.
- Date all session logs in `YYYY-MM-DD` ISO format in the filename.
- One feature per file in `next-steps/`. Number them so reading order is obvious.
- Keep each doc **scannable in under 5 minutes** — the point is fast orientation, not exhaustive coverage.
