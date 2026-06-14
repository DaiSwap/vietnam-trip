# session-logs — the project's institutional memory

Each `.md` here is a dated snapshot of the project at a point in
time. They are written so a fresh LLM (or new contributor) can pick
up cold and ship a feature within a single session.

## Read order

**Always read the newest one first.** It supersedes older entries.
Older entries are kept for history, not as current state.

| Date | File | One-line summary |
|---|---|---|
| 2026-06-15 | [`2026-06-15-restructure-shipped.md`](./2026-06-15-restructure-shipped.md) | UX restructure shipped: Routes is the picker, Places is optional with override, Map+Results read combined state, bar chart removed, tiles moved Home→Results. |
| 2026-06-14 | [`2026-06-14-state-of-site.md`](./2026-06-14-state-of-site.md) | After 11 PRs: site is feature-complete for the trip-planning loop. Next up: optional `startDate` in onboarding. |

## When to add a new entry

After every feature or batch of changes that materially shifts the
site, write a new dated log. Don't edit old ones. Each log should
answer:

1. **What's the state of the site right now?**
2. **What changed since the last log, and why?**
3. **What are the active constraints and patterns to preserve?**
4. **What's queued next?**

Keep it scannable. The goal is "fresh LLM can be productive in 5
minutes."
