/* validate.js — headless accuracy check. Reproduces charts we verified by hand
 * (Rohit + the two candidate charts) and compares signs/nakshatras/degrees. */
global.Astronomy = require('../vendor/astronomy.browser.min.js');
require('../js/ephemeris.js');
require('../js/panchang.js');
require('../js/kundali.js');
require('../js/matching.js');
const VA = globalThis.VA;

const DHANBAD = { lat: 23.7957, lon: 86.4304, tz: 5.5 };
let pass = 0, fail = 0;

function fmt(pl) { return `${pl.sign} ${pl.signDeg.toFixed(2)}° ${pl.nakshatra} p${pl.pada}${pl.retro ? ' R' : ''}${pl.dignity ? ' [' + pl.dignity + ']' : ''}`; }

function check(label, got, wantSign, wantNak, wantDeg, tol = 0.5) {
  let ok = got.sign === wantSign;
  if (wantNak) ok = ok && got.nakshatra === wantNak;
  if (wantDeg != null) ok = ok && Math.abs(got.signDeg - wantDeg) <= tol;
  console.log(`  ${ok ? '✅' : '❌'} ${label.padEnd(10)} got ${fmt(got).padEnd(34)} want ${wantSign}${wantNak ? ' ' + wantNak : ''}${wantDeg != null ? ' ~' + wantDeg + '°' : ''}`);
  ok ? pass++ : fail++;
}

console.log('\n========== ROHIT — 31 Jul 1998, 23:45 IST, Dhanbad ==========');
const r = VA.computeChart({ year: 1998, month: 7, day: 31, hour: 23, minute: 45, ...DHANBAD, name: 'Rohit' });
console.log(`  Ayanamsa: ${r.ayanamsa.toFixed(3)}°   Lagna: ${fmt(r.ascendant)}`);
check('Lagna', r.ascendant, 'Aries', 'Bharani', null);
check('Sun', r.planets.Sun, 'Cancer', 'Pushya', 14.5, 0.6);
check('Moon', r.planets.Moon, 'Libra', 'Swati', 17.3, 0.6);
check('Mars', r.planets.Mars, 'Gemini', null, 23.1, 0.8);
check('Mercury', r.planets.Mercury, 'Leo', null, 4.4, 0.8);
check('Jupiter', r.planets.Jupiter, 'Pisces', null, 3.9, 0.8);
check('Venus', r.planets.Venus, 'Gemini', null, 20.8, 0.8);
check('Saturn', r.planets.Saturn, 'Aries', null, 9.6, 0.8);
check('Rahu', r.planets.Rahu, 'Leo', null, 8.7, 1.0);
check('Ketu', r.planets.Ketu, 'Aquarius', null, 8.7, 1.0);
console.log(`  Jupiter dignity=${r.planets.Jupiter.dignity} retro=${r.planets.Jupiter.retro} | Saturn dignity=${r.planets.Saturn.dignity} | Merc retro=${r.planets.Mercury.retro}`);

console.log('\n========== GIRL 1 — 26 May 2003, 19:32 IST, Dhanbad ==========');
const g1 = VA.computeChart({ year: 2003, month: 5, day: 26, hour: 19, minute: 32, ...DHANBAD });
console.log(`  Lagna: ${fmt(g1.ascendant)}`);
check('Moon', g1.planets.Moon, 'Pisces', 'Revati', null);
check('Mars', g1.planets.Mars, 'Capricorn', null, null); // exalted
check('Jupiter', g1.planets.Jupiter, 'Cancer', null, null); // exalted
console.log(`  Mars dignity=${g1.planets.Mars.dignity} | Jupiter dignity=${g1.planets.Jupiter.dignity} | Lagna sign=${g1.ascendant.sign}`);

console.log('\n========== GIRL 2 — 20 Jul 2004, 09:00 IST, Dhanbad ==========');
const g2 = VA.computeChart({ year: 2004, month: 7, day: 20, hour: 9, minute: 0, ...DHANBAD });
check('Moon(AM)', g2.planets.Moon, 'Leo', 'Magha', null);
const g2e = VA.computeChart({ year: 2004, month: 7, day: 20, hour: 21, minute: 30, ...DHANBAD });
console.log(`  Moon at 21:30 IST: ${fmt(g2e.planets.Moon)} (expect Magha pada 4)`);

console.log('\n========== MATCHING — Rohit × Magha/Leo vs P.Phalguni/Leo ==========');
if (VA.gunaMilan) {
  const m1 = VA.gunaMilan(r.planets.Moon, g2.planets.Moon);
  console.log(`  Rohit (Libra/Swati) × girl (Leo/Magha): ${m1.total}/36  [expect 12.5]  ${Math.abs(m1.total - 12.5) < 0.01 ? '✅' : '❌'}`);
  if (Math.abs(m1.total - 12.5) < 0.01) pass++; else fail++;
} else console.log('  (matching module not present yet)');

console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========\n`);
process.exit(fail ? 1 : 0);
