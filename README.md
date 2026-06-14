# mY'sTory — a group trip-planning site

> Project name: **mY'sTory**. First trip planned with it: Vietnam.

**Live:** [daiswap.github.io/mY-sTory](https://daiswap.github.io/mY-sTory/)

---

## What problem are we solving?

A **group itinerary that takes everyone's inputs in and reads back as a
clean story** — so the group can actually agree on the trip, plan it
neatly, and go.

Most planning tools force one person to drive a spreadsheet, then chase
the others for input. That input ends up scattered across messages,
calls and screenshots. By the end nobody has the whole picture, and
the trip is shaped by whoever was loudest, not by what the group
actually wanted.

This site collapses that into one shared place:

1. Everyone explores the same shortlist of places.
2. Everyone votes (Yes / Maybe / Skip) — names stay private; only
   totals are shared.
3. The site reads the votes back as a single trip narrative the group
   can act on.

> The whole point is that the site **chooses like a story** (the
> exploration + voting flow) and **outputs as a story** (the trip you
> end up with). Friendly for users of any age — no jargon, no edit
> complexity, no spreadsheet feel.

---

## How the site flows

The linear flow is short — selection happens on Routes, results on
Results. Everything else is optional:

```
Home → Routes (the picker) → Map → Results
              │
              ├──→ Places (optional, in-depth voting · overrides Routes)
              │
              └──→ Travel (optional, logistics reference)
```

| Page | What it answers |
|---|---|
| **Home** | What is this? Single CTA: Plan the trip. |
| **Routes** | What could the trip look like, and which places do I want? Activities-by-region pills (tap to select), three curated routes on a satellite map, climate by month and region. |
| **Places** *(optional)* | Want finer control? Yes / Maybe / Skip voting per place. Places votes **always override** Routes picks. |
| **Travel** *(optional)* | Flights from India, visa, in-country transit times. |
| **Map** | Every place on satellite, coloured by your effective state. "My route" overlay draws a line through your picks. |
| **Results** | What did the group decide? Trip-story synthesis with two tabs — *My picks* and *What most picked*. |

The whole arc is **explore → decide together → see the trip you chose**.

---

## What's live now

- **Story-first onboarding** — five plain questions (name, age, group
  size, ₹ budget per person, ₹ buffer per person). Funny-but-helpful
  rejection messages when answers don't make sense; after two failed
  tries on budget/buffer the accepted range is appended. No login.
- **Routes page (the picker)** — activity matrix where tapping a place
  pill adds it to your picks (same place across rows toggles together).
  Three curated routes drawn on a real satellite map with km, days and
  per-person ₹ estimates. Climate by month and region.
- **Places page (optional, in-depth)** — every shortlisted place, side
  by side, with a *crowd × activity* chart and Yes / Maybe / Skip voting.
  Anonymous — names stay private; only counts show. Tagged
  *Optional · for finer control* at the top. Places votes always
  override Routes picks.
- **"Got a place we missed?"** — anonymous suggestion form on Places.
  Count-only — individual suggestions never displayed. Min 2 chars, max
  2 sentences; longer feedback nudges users to message daiswap directly.
- **Map** — every place on satellite imagery, coloured by **effective
  state** (Places vote wins, else Routes pick treated as Yes). Marker
  labels appear after one zoom-in step. *"My route"* overlay draws a
  line through your effective picks with km between consecutive places.
- **Results page** — trip-story synthesis as the single answer to
  "what did the group decide". Two tabs: *My picks* (default) and
  *What most picked*. Below it, a tile grid lets users navigate back
  to any page.
- **Live sync via Firebase Firestore** — votes, suggestions and
  RoutePicks propagate in real time across users. Local-storage
  fallback when Firebase isn't reachable.

---

## What's coming

See [`docs/next-steps/`](./docs/next-steps/) for the queue with detailed
per-PR plans. At time of writing:

- **PR-C — Curated routes UI redesign.** Replaces the 3-cards-above-map
  layout with tabs + summary + map + horizontal city flow.
- **PR-B — Home flow diagram.** Calligraphic flowing-curve SVG instead
  of the current bare-hero home page.

Parked for later (not on the active queue):

- **Day-by-day calendar dates** — adds a 6th onboarding step for the
  trip start date so the story reads *"You'll arrive on August 14…"*
  instead of *"12 days…"*. Full plan at
  [`docs/next-steps/01-day-by-day-dates.md`](./docs/next-steps/01-day-by-day-dates.md).
- **Photos & food gallery** — shown on Results as a "Soon · Coming next
  phase" tile.

The full thinking on the day-by-day builder — including a 10-specialist
review of the original proposal and why it was rewritten into a much
smaller synthesis block — lives in
[`docs/day-by-day-builder/`](./docs/day-by-day-builder/).

---

## How it's built

Deliberately small stack:

- **Plain HTML / CSS / JS.** No framework, no bundler, no build step.
- **Cloud Firestore** for real-time vote and suggestion sync (Spark /
  free tier — never hits the paid plan at family scale).
- **Leaflet** + Esri / OpenStreetMap tiles for maps.
- **GitHub Pages** for hosting.

Why so plain: this is a planning aid, not a portfolio piece. Every
addition should make the *story* clearer, not the codebase.

Security:

- Strict Firestore rules validate every write (field whitelist,
  type, regex, length).
- Every user-supplied value is HTML-escaped before render
  (`escapeHTML`).
- CSP `<meta>` on every page whitelists exactly the CDNs we use.
- `Profile.get()`, `sanitiseVote()`, suggestion sanitiser drop bad
  data on every read.
- Trade-offs (no login, public reads, anyone can delete) are
  documented in the rules file and accepted at family scale.

---

## Running it locally

```bash
git clone https://github.com/DaiSwap/mY-sTory
cd mY-sTory
python3 -m http.server 8765
# then open http://localhost:8765
```

Firebase is optional locally — the app falls back to localStorage if
the `firebaseConfig` placeholders aren't filled in.

---

## Folder layout

```
.
├── README.md              you are here
├── LICENSE                MIT
├── index.html             Home (hero + Plan-the-trip CTA only)
├── routes.html            Routes — the primary picker (activity matrix,
│                          three curated routes, climate)
├── places.html            Compare + vote + suggestions (optional)
├── travel.html            Flights, visa, in-country transit (optional)
├── map.html               Satellite map + "My route" overlay
├── results.html           Trip story (My picks / What most picked) +
│                          tile grid for navigating back
├── styles.css             Shared
├── app.js                 Shared — PLACES data, TripVotes, RoutePicks,
│                          effectiveVote resolver, voting, suggestions,
│                          onboarding, page inits
└── docs/                  see docs/README.md for the full index
    ├── README.md
    ├── feedback-log.md    every user suggestion with status
    ├── next-steps/        plans for the next features
    ├── session-logs/      dated snapshots of the codebase state
    └── day-by-day-builder/ historical 10-reviewer critique
```

For anyone picking this up cold: start with
[`docs/session-logs/`](./docs/session-logs/) (newest first), then
[`docs/feedback-log.md`](./docs/feedback-log.md), then pick the
top item from [`docs/next-steps/README.md`](./docs/next-steps/README.md).

---

## Contributing

This is a family project. If you stumble on it, you're welcome to
read, fork, take ideas. The trip dates and group size are obviously
specific to one family — adapting the data is just editing the
`PLACES` and `ROUTES` arrays at the top of `app.js`.

## License

[MIT](./LICENSE). Use, fork, adapt freely — no warranty.
