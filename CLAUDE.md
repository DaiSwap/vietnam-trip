# Vietnam '26 — Trip Planning Site

## What this is
A small **multi-page static site** for our group to (1) decide which Vietnam places to visit by voting, and (2) build the full trip plan together.

- **Live:** https://daiswap.github.io/vietnam-trip/
- **Repo:** local `/Users/pranavvenkatesh/vietnam_trip` → GitHub Pages (`DaiSwap/vietnam-trip`)

## Status (as of July 2026)
- **Date context:** it is currently **July 2026**. **Trip dates: TBD.** The old "April 2026" label was a past placeholder and has been neutralised — a real window still needs to be set (see *Open questions*).
- **Built:** Home, Map (real Esri satellite via Leaflet), Places (+ Crowd×Activity SVG chart), Travel (getting there / around / pick-by-activity), Results (live tally).
- **Voting:** first-name identity, Yes / Maybe / Skip, real-time via **Firebase Firestore** (compat SDK). Falls back to **localStorage** automatically if the Firebase config isn't filled in yet.
- **Firebase:** config NOT yet set — paste the web config into `app.js` and publish the Firestore rules (below) to turn on shared live voting.

## Design references
The visual / interaction language is split deliberately:
- **Home hero only** — bold, expressive, latecheckout-inspired. Big typographic statement, marquee strip, magnetic CTAs, cursor follower (desktop), animated palm SVG. Treat this as the moment of "wow".
- **Rest of the site** — Apple-ish minimal per the rule below. Subtle motion only (marker drop-in, polyline draw, count-up, onboarding slide transitions, gentle tile tilt).

Active references when iterating on interactivity:
- https://www.latecheckout.studio/ — typography direction for the hero (bold sans + italic serif mix).
- http://because-recollection.com/laurent-garnier — main interactive-website benchmark for mood, scroll choreography, and editorial polish.
- https://cyclemon.com/ — animation choreography reference (scroll-driven reveals, scene transitions).

When unsure between "more interaction" vs "less", err on the side of restraint outside the hero — the trip site is a tool, not a portfolio piece.

## Tech & principles (read before changing anything)
- **Plain HTML / CSS / JS. No framework, no build step, no bundler.** This is deliberate. Do **not** add React/Vue/Svelte/Vite/webpack/npm. If a change seems to need a build step, find a simpler way.
- **One shared stylesheet** (`styles.css`) + **one shared script** (`app.js`) loaded by every page.
- Each page is **thin HTML** with `<body data-page="...">`. `app.js` runs the correct init based on `data-page`.
- Hosted on **GitHub Pages** (static only). External libraries via **CDN only**: Leaflet (cdnjs), Firebase (gstatic), fonts (Google).
- **Design tokens** live in `:root` in `styles.css` — Apple-ish light theme, warm accent `#c2622f`, system font stack. Reuse them; don't invent a new colour system.
- **Keep it simple. Do not over-engineer.** Prefer the smallest change that works. No premature abstractions.

## Files
| File | Purpose |
|------|---------|
| `index.html`  | Home — hero + section tiles |
| `map.html`    | Leaflet satellite map + markers (voting) |
| `places.html` | Place cards + Crowd×Activity chart (voting) |
| `travel.html` | Getting there from India, visa, distances, pick-by-activity |
| `results.html`| Live combined results |
| `styles.css`  | All styles (shared) |
| `app.js`      | Data (`PLACES`), Firebase/voting layer (`TripVotes`), nav + name modal + detail sheet, chart, results, page inits |
| `CLAUDE.md`   | This file |

## Data model
- **`PLACES`** array at the top of `app.js`:
  `{ id, tier(1–3), lat, lng, region, name, crowd(1–5), crowdNote, act(1–5), actNote, desc(HTML), doing[], when }`
  Edit place content here — markers, cards, chart and results all read from it.
- **Firestore:** collection `votes`, doc id `` `${name_lower}__${placeId}` ``, fields `{ name, placeId, vote('yes'|'maybe'|'skip'), ts }`.

## Firebase setup (one time)
1. console.firebase.google.com → new project (free, no billing).
2. Build → Firestore Database → Create database → pick `asia-south1`.
3. Project settings → General → Your apps → Web (`</>`) → register → copy the `firebaseConfig` object.
4. Paste it into `app.js` (the `firebaseConfig` block near the top).
5. Firestore → Rules → paste and **Publish** (hardened — validates every field, rejects garbage docs, blocks unknown collections):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Votes: anyone can read/write, but every doc must match the strict shape.
    match /votes/{doc} {
      allow read: if true;

      allow create, update: if
           request.resource.data.keys().hasOnly(['name','placeId','vote','ts'])
        && request.resource.data.keys().hasAll(['name','placeId','vote'])
        && request.resource.data.vote in ['yes','maybe','skip']
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1
        && request.resource.data.name.size() <= 24
        && request.resource.data.name.matches("^[\\p{L}\\p{N} .'\\-]+$")
        && request.resource.data.placeId is string
        && request.resource.data.placeId.size() <= 32
        && request.resource.data.placeId.matches("^[a-z0-9_-]+$")
        && (!('ts' in request.resource.data) || request.resource.data.ts is int);

      allow delete: if true;
    }

    // Block every other collection by default.
    match /{document=**} { allow read, write: if false; }
  }
}
```
The web config (apiKey etc.) is **public-by-design and safe to commit**; security comes from the rules. **Never** put a `service_role`/admin key in client code.

> **Known trade-off:** `allow delete: if true` lets anyone with the link delete any vote (votes are unauthenticated by design — no Firebase Auth yet). Fine for a small family planning site; if abuse appears, switch to anonymous Firebase Auth and gate writes/deletes on `request.auth.uid`.

## Conventions for changes
- **Add a place:** append to `PLACES` with `lat`/`lng` and all fields. Everything (markers, cards, chart, results) picks it up automatically.
- **New page:** copy an existing page's `<head>` + script tags (incl. the **CSP meta**), set `data-page`, add an `init<Page>()` in `app.js`, add a link in `injectChrome()`, and add a home tile.
- **Voting:** never duplicate vote logic. Call `requestVote(placeId, vote)`. All vote UI re-syncs through `applyVoteUI()` on each Firestore snapshot.
- **Images (when added):** use **only freely-licensed** sources (Unsplash, Wikimedia Commons) with **visible attribution**. No copyrighted images. Lazy-load them.
- **Secrets:** never commit any private key. Firebase web config is the only "key" here and it's meant to be public.

## Security & logging conventions (read before adding code)
- **Profile data is captured upfront via onboarding** (`Profile` in `app.js`) — name, age, group size, per-person budget, buffer. Stored only in `localStorage` (private, free, never uploaded). `Profile.get()` validates every field on read; tampered values are dropped silently.
- **Always escape user-provided strings before HTML insertion** with `escapeHTML(s)`. Never template a name (or any Firestore value) directly into `innerHTML`. Defence-in-depth on top of the Firestore name-regex rule.
- **Use the `Log` module for diagnostics** — `Log.info/warn/error(tag, msg, extra)`. Entries are persisted to `localStorage.tripLog` (last 50). Inspect anytime in DevTools: `Log.dump()`. Replace any raw `console.warn`/`console.error` you see with `Log.*` so issues are debuggable later.
- **All Firestore reads pass through `sanitiseVote()`** — anything that doesn't match the expected shape is dropped and logged. Treat the database as untrusted input.
- **Every page ships a CSP `<meta>` tag** that whitelists the exact CDNs we use (gstatic for Firebase, cdnjs for Leaflet, Google Fonts, tile providers). Adding a new CDN means adding it to every page's CSP. Avoid inline `<script>` blocks — they're blocked by the policy. Inline `style="..."` attributes are allowed only because `style-src 'unsafe-inline'` is set; prefer classes when adding new code.

## Roadmap (build in this order; one small change at a time)

### Phase B — Routes + When to go
- `routes.html`: 2–3 curated route options (ordered stops + nights). Add a `ROUTES` array to `app.js`: `{ id, name, days, stops:[placeId...], note }`. Selecting a route draws a **Leaflet polyline** through the stop coords in order and lists the legs.
- When-to-go: a static **month × region** suitability strip (North / Central / South × Jan–Dec) with the chosen window highlighted. Climate data is static — no weather API needed (the trip is months out).

### Phase C — Photos + Food
- Add `photos:[urls]` and `dishes:[...]` to `PLACES`. Show a gallery in the detail sheet and a lead image on place cards. Lazy-load + blur-up + attribution.
- Image sources: Unsplash / Wikimedia Commons only.

### Phase D — Itinerary builder + costs
- `itinerary.html`: drag the winning places into days (SortableJS via CDN). Persist per-person to localStorage (optionally Firestore).
- Structured transport legs (mode / time / cost) extending the Travel data.
- Rough **budget**: flights + nights + intra-Vietnam transport + activities → per-person ₹ estimate.

### Flights & hotels (the "we'll add next" items)
- **Flights:** a maintained table of India→Vietnam options (city, airline, direct?, ~time, ~₹). Manual data is fine; optionally add Google Flights deep links. Live fare APIs are out of scope unless we decide otherwise.
- **Hotels:** per place, 2–3 options with price band + rating + booking link. Store as `hotels:[{name, band, rating, url}]` on each `PLACES` entry; render in the detail sheet.

## Open questions (need Pranav)
- **Real travel window (month/year).** April 2026 has passed. North & central Vietnam are best ~**Sep–Dec** and ~**Feb–Apr**; pick a window so when-to-go + budget are accurate.
- **Spam guard:** add a shared trip code to gate voting? Currently it's name-only + a public URL (fine for family, open to anyone with the link).

## Group-aware content conventions
The trip is now sized off whatever the user enters in onboarding (`Profile.groupSize`). Never bake a literal group size into copy. Two ways to keep content dynamic:
- **In PLACES / ROUTES strings:** drop `{n}` where the number belongs, e.g. `"With {n} of you, use easy-rider drivers."` — render through `applyProfileTokens(d.when)` (already wired into `openSheet`).
- **In static HTML (travel.html, etc.):** use `<span data-profile="groupSizeAdults">your group</span>`. The fallback text inside the span shows when no profile is set; `hydrateProfileTokens()` replaces it on every page load and after onboarding finishes. Supported keys: `name`, `groupSize`, `groupSizeAdults`, `budgetPP`, `budgetTotal`.
