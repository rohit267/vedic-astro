# ✦ Vedic Astro

A private, **front-end-only** Vedic (sidereal) astrology calculator. Everything is
computed live in your browser: no backend, no tracking, nothing ever leaves your device.

**Live:** https://rohit267.github.io/vedic-astro/

## Features

- **Kundali**: full birth chart: every planet's sign, degree, nakshatra + pada, house,
  and state (exalted / debilitated / own / retrograde / combust).
- **Charts D1–D9**: Rashi (D1), Hora (D2), Drekkana (D3), Chaturthamsa (D4),
  Saptamsa (D7) and Navamsa (D9), each drawn in **North / South / East** style (toggle).
- **Dasha**: Vimshottari Mahā → Antar → Pratyantar, with the current period highlighted.
- **Timing**: Sade Sati status, Manglik check, and the flavour of the periods ahead.
- **Matching**: an overall match %, what will work and what will not in plain words, every one of
  the 36-point kootas explained for the pair (Deva, Manushya, Rakshasa and the rest), both people's
  Manglik status with the classical cancellations, Rajju, Vedha, Mahendra, Stree Deergha, and the
  best shared marriage window.
- **Readings**: plain-spoken, honest interpretations, **each with a percentage** and a
  "Why" breakdown. A chart is treated as a *map of tendencies and seasons*, never a verdict.
- **Life areas with timing**: marriage, love, children, home, money and career, each with
  the most likely period, its strongest months and a chance for every period (Timing tab).
- **Difficult periods**: money loss, health worries, worry or loss in the family, with dates.
- **The next 12 months**: one entry per dasha period, a paragraph on work, money, love, home and health, with a good % and a bad %.
- **Shareable links**: birth details, tab and section live in the URL after `#` (never sent to the server), so reload, back/forward and bookmarks work.
- **Strength tables**: seven classical balas per planet (virupas) and full Ashtakavarga.
- **Installable, works offline**: add it to your home screen or desktop. After the first
  visit it runs with no network; online it always loads the latest release.

## How the accuracy works

Raw planetary positions come from **[astronomy-engine](https://github.com/cosinekitty/astronomy)**
(MIT, vendored as a single file). The astrology-specific steps are implemented here and
checked against **Swiss Ephemeris** (Lahiri, 400 random instants 1900–2100, `test/reference.json`):

| Quantity | Worst error | Note |
|---|---|---|
| Lahiri ayanamsa | 0.001″ | J2000 value + IAU 2006 precession |
| Sun | 2″ | |
| Moon | 3″ for dates to 2026 | 14″ by 2100, where ΔT is a forecast |
| Mars, Mercury, Jupiter, Saturn | 10–11″ | limit of the library's truncated VSOP87 |
| Venus | 19″ | same limit, worst near inferior conjunction |
| Mean Rahu / Ketu | 0.3″ | |
| Ascendant, Midheaven | 4″, 2″ | |

What makes the difference: nutation is removed before the ayanamsa is subtracted (the stars
do not nutate), and ΔT uses observed IERS values from 2005 on. For scale, even the
worst-case 20″ puts a planet in the wrong navamsa only about 1 time in 600, and the Moon's 3″ shifts a dasha
date by under half a day. Birth time accepts seconds, and Indian cities get the offset India
actually kept on that date (for example +6:30 war time in 1942–45).

## What the percentages mean

Every reading shows one or both of:

- **A score** (expression / support / strength / favourable): how strongly the classical
  indicators line up in this chart. It is a weighted blend of planet strength (uccha, rasi and
  navamsa dignity, kendra, dig, paksha and cheshta bala, in virupas), Ashtakavarga bindus,
  house lordship, placement, occupants and aspects. "Why" under each reading shows the sum.
  The bala formulas and bindu tables are from Brihat Parashara Hora Shastra; the blend
  weights are this app's own and sit in three small tables at the bottom of `js/strength.js`.
- **Birth-time stable**: the chart is re-cast at 21 times across your "± min" window and
  this is the share that give the same reading. Plain facts (Lagna sign, Sade Sati) show
  only this, as "certain".

Neither number is a measured chance of an event. No such data exists for astrology, and
controlled tests have not found it to predict outcomes. The percentages make the reading
transparent and repeatable; they do not make it a forecast.

```bash
node test/accuracy.js   # positions vs Swiss Ephemeris, with an arc-second budget per body
node test/strength.js   # bala formulas, Ashtakavarga checksums (337), stability
node test/validate.js   # reproduces known charts + guna scores (15 checks)
node test/smoke.js      # full-pipeline integration run
```

## Birthplace and time zone

Pick a city and the offset from UTC is filled in for that date: daylight saving,
India's +6:30 war time, Ireland's Dublin Mean Time, and the town's own local mean time
before its country adopted standard time (dates from the IANA tz database). Two limits
are flagged under the field when they apply:

- Browsers lack the pre-1970 clock history of 86 zones, among them the Netherlands,
  Norway, Sweden, Denmark, Iceland and much of Africa.
- Indian towns before 1906 kept assorted local times.

In those cases check the offset against the birth record. Anywhere not listed works with
manual latitude, longitude and offset.

City data: [GeoNames](https://www.geonames.org/) (CC BY 4.0).

## Run locally

No build step. Just serve the folder:

```bash
python3 -m http.server 8137
# open http://127.0.0.1:8137/
```

## Project layout

```
index.html              page + tab structure
manifest.webmanifest    app name, colours and icons for installing
sw.js                   offline cache (serve cached, refresh in the background)
icons/                  app icons
styles.css              dark celestial theme, responsive
vendor/astronomy…js     planetary ephemeris (MIT)
vendor/fonts            Eczar and Mukta (SIL Open Font License), self-hosted
js/ephemeris.js         sidereal longitudes, ayanamsa, ascendant, midheaven, nodes, ΔT
js/panchang.js          signs/nakshatras, dignity, combustion, varga rules D1–D9
js/kundali.js           assemble a full chart
js/dasha.js             Vimshottari dasha
js/matching.js          Ashtakoota guna milan + doshas
js/strength.js          planet balas, Ashtakavarga, house and dasha scores
js/timing.js            when life events are likely: dasha ties, double transit, age
js/predictions.js       rule-based readings with percentages + birth-time stability
js/charts.js            North / South / East SVG renderers
js/cities.js            birthplaces: hand-made Indian list + 1,227 world cities with time zones
js/app.js               UI wiring
```

## A note

Sidereal · Lahiri ayanamsa · whole-sign houses. This is a tool for reflection and for the
family-side matching process, not a source of destiny. Read it, use the timing, then drive
your own life.
