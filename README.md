# ✦ Vedic Astro

A private, **front-end-only** Vedic (sidereal) astrology calculator. Everything is
computed live in your browser — no backend, no tracking, nothing ever leaves your device.

**Live:** https://rohit267.github.io/vedic-astro/

## Features

- **Kundali** — full birth chart: every planet's sign, degree, nakshatra + pada, house,
  and state (exalted / debilitated / own / retrograde / combust).
- **Charts D1–D9** — Rashi (D1), Hora (D2), Drekkana (D3), Chaturthamsa (D4),
  Saptamsa (D7) and Navamsa (D9), each drawn in **North / South / East** style (toggle).
- **Dasha** — Vimshottari Mahā → Antar → Pratyantar, with the current period highlighted.
- **Good / Bad times** — Sade Sati status, Manglik check, and the flavour of the periods ahead.
- **Matching** — full 36-guna Ashtakoota (Guna Milan) with Bhakoot / Nadi / Manglik doshas
  and their cancellation rules.
- **Readings** — plain-spoken, honest interpretations. A chart is treated as a *map of
  tendencies and seasons*, never a verdict.

## How the accuracy works

Raw planetary positions come from **[astronomy-engine](https://github.com/cosinekitty/astronomy)**
(MIT, arc-second accurate, vendored as a single file). Every astrology-specific step —
**Lahiri (Chitrapaksha) ayanamsa**, ascendant, mean-node Rahu/Ketu, whole-sign houses,
nakshatra/pada, Vimshottari dasha and the Ashtakoota tables — is implemented here and
cross-checked against hand-verified charts. See `test/validate.js`.

```bash
node test/validate.js   # reproduces known charts + guna scores (15 checks)
node test/smoke.js      # full-pipeline integration run
```

## Run locally

No build step. Just serve the folder:

```bash
python3 -m http.server 8137
# open http://127.0.0.1:8137/
```

## Project layout

```
index.html              page + tab structure
styles.css              dark celestial theme, responsive
vendor/astronomy…js     planetary ephemeris (MIT)
js/ephemeris.js         sidereal longitudes, ayanamsa, ascendant, nodes
js/panchang.js          signs/nakshatras, dignity, combustion, varga rules D1–D9
js/kundali.js           assemble a full chart
js/dasha.js             Vimshottari dasha
js/matching.js          Ashtakoota guna milan + doshas
js/predictions.js       rule-based readings
js/charts.js            North / South / East SVG renderers
js/cities.js            India birthplace lat/lon lookup
js/app.js               UI wiring
```

## A note

Sidereal · Lahiri ayanamsa · whole-sign houses. This is a tool for reflection and for the
family-side matching process — not a source of destiny. Read it, use the timing, then drive
your own life.
