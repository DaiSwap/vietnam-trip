# Vietnam '26 — a group trip-planning site

**Live:** [daiswap.github.io/vietnam-trip](https://daiswap.github.io/vietnam-trip/)

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

The nav reflects the order people should move through it:

| Step | Page | What it answers |
|---|---|---|
| 1 | **Home** | What is this? |
| 2 | **Routes** | What could the trip look like? (activities-by-city, 3 curated routes on a map, when to go) |
| 3 | **Travel** | How do I get there and around? (flights from India, visa, in-country transit) |
| 4 | **Places** | Which of these are right for us? (compare, suggest a missing place, vote) |
| 5 | **Map** | Where are they, and where do my picks connect? |
| 6 | **Results** | What did the group decide? *(the closing story, coming soon)* |

The whole arc is **explore → decide together → see the trip you chose**.

---

## What's live now

- **Story-first onboarding** — five plain questions (name, age, group
  size, ₹ budget per person, ₹ buffer per person). No login.
- **Routes page** — activity matrix (caves, mountains, beaches…),
  three curated routes drawn on a real satellite map with km, days and
  per-person ₹ estimates, climate by month and region.
- **Places page** — every shortlisted place, side by side, with a
  *crowd × activity* chart and Yes / Maybe / Skip voting. Anonymous —
  names stay private; only totals show.
- **"Got a place we missed?"** — anonymous suggestion form on Places.
  Adds up across the group, dedups by place name.
- **Map** — every place on satellite imagery. *"My route"* overlay
  draws a line through your Yes + Maybe picks and shows km between
  consecutive stops.
- **Results page** — live horizontal bar chart of votes, scaled
  against the group's maximum possible score.
- **Live sync via Firebase Firestore** — votes and suggestions
  propagate in real time across browsers. Local-storage fallback when
  Firebase isn't reachable.

---

## What's coming

The **synthesis block on Results** — one paragraph that reads back
the group's leaning as a trip story:

> *"Your group is leaning toward a 12-day north-to-central trip —
> Hanoi, Ha Giang, Phong Nha, Hoi An. Around ₹68,000 per person."*

Plus a compact strip showing each stop with nights and km between
them. Read-only. Group-default with a *My picks* toggle.

The full thinking — including a 10-specialist review of the original
"day-by-day builder" idea and why it was rewritten into this much
smaller block — lives in [`docs/day-by-day-builder/`](./docs/day-by-day-builder/).

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
git clone https://github.com/DaiSwap/vietnam-trip
cd vietnam-trip
python3 -m http.server 8765
# then open http://localhost:8765
```

Firebase is optional locally — the app falls back to localStorage if
the `firebaseConfig` placeholders aren't filled in.

---

## Folder layout

```
.
├── index.html        Home
├── routes.html       Routes & when to go (start here for trip-shape)
├── travel.html       Flights, visa, in-country transit
├── places.html       Compare + vote + suggestions
├── map.html          Satellite map + "My route" overlay
├── results.html      Live tally (synthesis block forthcoming)
├── styles.css        Shared
├── app.js            Shared (PLACES data, voting, suggestions,
│                     onboarding, page inits)
└── docs/
    └── day-by-day-builder/
        ├── README.md         Index + cross-review themes
        ├── plan-v0.md        Original proposal (now superseded)
        ├── plan-v1.md        The current direction (synthesis-on-Results)
        └── review-01..10.md  10 specialist critiques of v0
```

---

## Contributing

This is a family project. If you stumble on it, you're welcome to
read, fork, take ideas. The trip dates and group size are obviously
specific to one family — adapting the data is just editing the
`PLACES` and `ROUTES` arrays at the top of `app.js`.
