# 03 — Home page flow diagram (PR-B)

**Status:** Plan ready, not started.
**Estimated diff size:** ~250 lines (~180 SVG + ~50 CSS + a handful of HTML/JS).
**Single PR.**

---

## The idea in one sentence

Replace the bare-hero home page with a single calligraphic flowing-curve
SVG illustration that shows the trip-planning journey at a glance, ending
in a single **Start planning →** CTA below.

This was **Option A** from the 2026-06-15 brainstorm: hand-drawn-feel
postcard route, not numbered nodes with arrows.

---

## Visual concept

```
      ╭──────────────────────● Routes
      │                       │
   ●──╯                       │
   YOU                        ╰─────● Map ─────● Results
   here                       │             ╲
                              │              ● Travel ↺ (sidelink)
                              ╰──● Places (optional)
```

- A single SVG with viewBox sized to the section width.
- One **continuous flowing path** from YOU on the left, through ROUTES,
  with two optional branches (PLACES and TRAVEL) drawn in a lighter
  weight or dotted stroke that rejoin the main line.
- The main line ends at RESULTS on the right with a small star/badge.
- Each stage label sits along the path (text-on-path or static text
  with leader line — whichever reads cleaner at 360px width).
- Subtle hand-drawn texture: slight stroke wobble + warm accent color
  (use `var(--accent)`).
- Optional: a **draw-in animation** on first visit (only if reduced-motion
  is not requested).

---

## File-by-file plan

| File | Change |
|---|---|
| `index.html` | Drop the empty section that currently sits below the hero. Replace with a new `<section class="flow">` containing the SVG and the single CTA. |
| `styles.css` | New block `.flow { ... }` covering SVG sizing, stroke styles, label typography, the draw-in animation. ~50 lines. |
| `app.js` | One small init in `initHero()` to trigger the draw animation. Or pure CSS if simpler. |

---

## SVG anatomy

The SVG is plain inline markup — no external assets. Aim for ~180 lines
including all paths + text labels. Key elements:

```html
<svg class="flow-svg" viewBox="0 0 900 380" role="img"
     aria-label="Trip planning journey: from you, through Routes, to Map and Results">
  <!-- main flowing curve, hand-drawn feel via slight Bezier wobble -->
  <path class="flow-main" d="M 60 200 C 200 80, 320 80, 450 180 S 700 280, 840 200" />

  <!-- two optional branches, drawn lighter -->
  <path class="flow-branch" d="M 450 180 C 480 240, 540 280, 580 250" />  <!-- to Places -->
  <path class="flow-branch" d="M 690 220 C 720 280, 760 290, 780 280" />  <!-- to Travel -->

  <!-- stage markers -->
  <g class="flow-stage" transform="translate(60,200)">
    <circle class="flow-dot start" r="10" />
    <text class="flow-label" y="-22">You</text>
  </g>
  <g class="flow-stage" transform="translate(310,110)">
    <circle class="flow-dot" r="10" />
    <text class="flow-label" y="-22">Routes</text>
  </g>
  ...etc for Map, Results, Places, Travel
</svg>
```

Path geometry should be tuned visually — these are placeholders. Use a
vector tool (or hand-iterate in the browser) to get curves that feel
natural without looking like a wireframe.

---

## CSS sketch

```css
.flow{padding:60px 24px 100px;text-align:center}
.flow-svg{width:100%;max-width:880px;height:auto;display:block;margin:0 auto}
.flow-main{
  fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;
  stroke-dasharray:1500;stroke-dashoffset:1500;
  animation:flow-draw 2s 0.3s ease-out forwards;
}
.flow-branch{
  fill:none;stroke:var(--accent);stroke-width:2;stroke-linecap:round;
  stroke-dasharray:6 8;opacity:0.55;
  stroke-dashoffset:300;
  animation:flow-draw-branch 1.4s 1.2s ease-out forwards;
}
.flow-dot{fill:var(--accent)}
.flow-dot.start{fill:var(--ink)}
.flow-label{
  font-family:inherit;font-size:14px;font-weight:600;fill:var(--ink);
  text-anchor:middle;letter-spacing:-.01em;
}
@keyframes flow-draw{to{stroke-dashoffset:0}}
@keyframes flow-draw-branch{to{stroke-dashoffset:0}}

.flow-cta{margin-top:60px}
.flow-cta .hbtn{padding:16px 32px;font-size:16px}

@media(prefers-reduced-motion: reduce){
  .flow-main,.flow-branch{animation:none;stroke-dashoffset:0}
}

@media(max-width:600px){
  .flow{padding:40px 16px 60px}
  .flow-label{font-size:12px}
}
```

---

## Accessibility

- The SVG has `role="img"` and a descriptive `aria-label`.
- The CTA below is the **only** focusable element on the section — keyboard
  users get a single clear action.
- `prefers-reduced-motion` disables the draw-in animation; the diagram is
  fully visible immediately.
- Labels use real `<text>` elements so screen-readers can read them
  (not images).

---

## Mobile considerations

At 360px width the diagram needs to compress. Two options:

- **(A)** Keep the same SVG but let the viewBox squish — labels stay
  positioned along the curve, just at smaller scale.
- **(B)** Switch to a more vertical layout on phone (CSS-only — the
  same SVG with `transform: rotate(90deg)` on small screens). More
  complex.

Default to **(A)** unless smoke testing shows it's illegible.

---

## Risks / what could go wrong

1. **Calligraphic feel is subjective** — the first version might read as
   "wireframe" rather than "hand-drawn". Iterate visually before
   merging. Get one other set of eyes on it.
2. **Animation timing on slow devices** — 2-second draw might feel
   sluggish. If so, drop to 1.2s.
3. **Label collision at smaller widths** — Routes/Map labels sit close
   in horizontal space. Tune transforms accordingly.
4. **SVG file size** — keep under 6KB inline. No filters, no gradients,
   pure strokes.

---

## What's NOT in this PR

- Re-adding tiles to Home (those moved to Results in PR #20 and stay there)
- Any change to the hero typography itself (already approved)
- Changes to Routes/Travel/Places pages

---

## How to ship

1. `git checkout -b feature/home-flow-diagram`
2. Iterate the SVG until it reads "calligraphic" not "wireframe"
3. Apply CSS + minor JS for the reveal trigger
4. Smoke test on iPhone, Android, desktop
5. PR + merge + move row in feedback-log
