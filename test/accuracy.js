/* accuracy.js — sidereal longitudes vs Swiss Ephemeris (test/reference.json:
 * 400 random instants 1900–2100, Lahiri, generated with pyswisseph 2.10 in Moshier mode).
 * Prints the error in arc-seconds per body and fails if any exceeds its budget. */
global.Astronomy = require('../vendor/astronomy.browser.min.js');
require('../js/ephemeris.js');
const VA = globalThis.VA, A = global.Astronomy;
const ref = require('./reference.json');

const arcsec = (a, b) => { let x = a - b; while (x > 180) x -= 360; while (x < -180) x += 360; return x * 3600; };
const errs = {};
const add = (k, v) => (errs[k] = errs[k] || []).push(Math.abs(v));
const PAST = 2461042; // JD of 2026-01-01: ΔT is measured before this, extrapolated after

for (const r of ref) {
  const t = A.MakeTime(r.jd - 2451545.0);
  add('Ayanamsa', (VA.ayanamsa(t) - r.ayan) * 3600);
  for (const p of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const e = arcsec(VA.siderealLon(p, t), r.lons[p]);
    add(p, e);
    if (p === 'Moon' && r.jd < PAST) add('Moon (to 2026)', e);
    if (p !== 'Sun' && p !== 'Moon' && VA.isRetro(p, t) !== (r.speed[p] < 0)) add('Retro flag', 3600);
  }
  add('Rahu (mean)', arcsec(VA.rahuKetu(t).rahu, r.lons.Rahu));
  add('Ascendant', arcsec(VA.ascendant(t, r.lat, r.lon), r.asc));
  add('Midheaven', arcsec(VA.midheaven(t, r.lon), r.mc));
}

// Budgets in arc-seconds. Planets are limited by astronomy-engine's truncated VSOP87.
const BUDGET = { Ayanamsa: 0.01, Sun: 3, Moon: 20, 'Moon (to 2026)': 8, Mars: 15, Mercury: 15, Jupiter: 15,
  Venus: 25, Saturn: 15, 'Rahu (mean)': 1, Ascendant: 6, Midheaven: 6, 'Retro flag': 0 };
let fail = 0;
for (const k of Object.keys(BUDGET)) {
  const v = errs[k] || [0];
  const max = Math.max(...v), mean = v.reduce((a, b) => a + b, 0) / v.length;
  const ok = max <= BUDGET[k];
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${k.padEnd(15)} mean ${mean.toFixed(2).padStart(6)}"  max ${max.toFixed(2).padStart(6)}"  (budget ${BUDGET[k]}")`);
}
console.log(fail ? `\n${fail} over budget` : '\nAll within budget');
process.exit(fail ? 1 : 0);
