/* strength.js: self-check for the percentage engine: table checksums, bala formulas
 * at known astronomical moments, ranges over 400 random charts, and stability. */
const assert = require('assert');
global.Astronomy = require('../vendor/astronomy.browser.min.js');
['ephemeris', 'panchang', 'kundali', 'dasha', 'matching', 'strength', 'timing', 'predictions'].forEach((m) => require('../js/' + m + '.js'));
const VA = globalThis.VA;
const NOW = new Date(Date.UTC(2026, 10, 13));
const DELHI = { lat: 28.6139, lon: 77.209, tz: 5.5 };
const at = (y, mo, d, hh = 12, mm = 0, place = { lat: 20, lon: 80, tz: 0 }) => VA.computeChart({ year: y, month: mo, day: d, hour: hh, minute: mm, ...place });
const sum = (a) => a.reduce((x, y) => x + y, 0);

// Ashtakavarga: BPHS totals per planet, 337 overall, in every chart
const ref = require('./reference.json');
const charts = ref.map((r) => {
  const D = new Date((r.jd - 2440587.5) * 86400000);
  return VA.computeChart({ year: D.getUTCFullYear(), month: D.getUTCMonth() + 1, day: D.getUTCDate(), hour: D.getUTCHours(), minute: D.getUTCMinutes(), second: D.getUTCSeconds(), tz: 0, lat: r.lat, lon: r.lon });
});
const WANT = { Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39 };
for (const c of charts) {
  const { av, strength } = VA.analyse(c);
  for (const p of VA.SEVEN) {
    assert.strictEqual(sum(av.bav[p]), WANT[p], `${p} bindus`);
    for (const [k, v] of Object.entries(strength[p].parts)) assert(v >= 0 && v <= VA.STRENGTH_MAX[k] + 1e-9, `${p} ${k} = ${v}`);
  }
  assert.strictEqual(sum(av.sav), 337);
  for (const h of [1, 7, 10]) { const s = VA.houseScore(c, h, ['Jupiter']).pct; assert(s >= 0 && s <= 100); }
}
console.log('✅ Ashtakavarga totals (48/49/39/54/56/52/39 = 337) and bala ranges hold for', charts.length, 'charts');

// Cheshta bala: ~60 mid-retrograde, ~0 at conjunction with the Sun
const ch = (c, p) => VA.analyse(c).strength[p].parts.cheshta;
assert(ch(at(2025, 1, 16), 'Mars') > 57, 'Mars at opposition');
assert(ch(at(2024, 12, 7), 'Jupiter') > 57, 'Jupiter at opposition');
assert(ch(at(2025, 3, 23), 'Venus') > 57, 'Venus at inferior conjunction');
assert(ch(at(2024, 6, 4), 'Venus') < 3, 'Venus at superior conjunction');
console.log('✅ Cheshta bala peaks at opposition / inferior conjunction, vanishes at conjunction');

// Uccha bala: Sun at 10° Aries is 60, at 10° Libra is 0. Paksha: full Moon gives the Moon 60.
const sunAt = (y, mo, d) => { const c = at(y, mo, d); return [c.planets.Sun.lon, VA.analyse(c).strength.Sun.parts.uccha]; };
for (const [lon, u] of [sunAt(2024, 4, 23), sunAt(2024, 10, 27)]) assert(Math.abs(u - (180 - Math.min(Math.abs(lon - 10), 360 - Math.abs(lon - 10))) / 3) < 1e-9);
assert(sunAt(2024, 4, 23)[1] > 59 && sunAt(2024, 10, 27)[1] < 1, 'Sun uccha at exaltation / debilitation');
assert(VA.analyse(at(2024, 4, 23, 23, 49)).strength.Moon.parts.paksha > 59.5, 'full Moon paksha'); // full Moon 2024-04-23 23:49 UT
console.log('✅ Uccha and paksha bala hit 60 / 0 at exaltation, debilitation and full Moon');

// Historical time zone: India ran +6:30 war time in 1943
assert.strictEqual(VA.zoneOffsetHours('Asia/Kolkata', 1943, 6, 1, 12, 0), 6.5);
assert.strictEqual(VA.zoneOffsetHours('Asia/Kolkata', 1998, 7, 31, 23, 45), 5.5);
require('../js/cities.js');
const city = (n) => VA.CITIES.find((c) => c.name.startsWith(n));
const offAt = (n, y, mo) => { const c = city(n); return VA.placeOffsetHours(c.zone, c.lon, c.lmtUntil, y, mo, 1, 12, 0); };
assert.strictEqual(offAt('London', 1975, 7).hours, 1);                       // British Summer Time
assert.strictEqual(offAt('New York City', 1990, 1).hours, -5);
assert(Math.abs(offAt('Cork', 1910, 6).hours - -(25 + 21 / 60) / 60) < 1e-6); // Dublin Mean Time was Ireland's legal time
assert(offAt('New York City', 1880, 1).lmt);                                  // before US standard time (Nov 1883)
assert(Math.abs(offAt('New York City', 1880, 1).hours - city('New York City').lon / 15) < 1e-9);
assert.strictEqual(VA.UNSURE_BEFORE[city('Reykjav').zone], 1970);             // browser lacks Iceland's pre-1970 rules
assert.strictEqual(VA.CITIES.filter((c) => !c.zone || c.lmtUntil === undefined).length, 0);
console.log('✅ Historical time-zone offsets, incl.', VA.CITIES.length, 'cities with zones and local-mean-time dates');

// Every reading carries a percentage; exact birth time means 100% stable
const demo = { year: 1947, month: 8, day: 15, hour: 0, minute: 0, ...DELHI };
const flat = (r) => r.sections.flatMap((s) => s.items);
const exact = flat(VA.readings(demo, NOW, 0));
assert(exact.length >= 15);
for (const i of exact) {
  assert(Number.isFinite(i.stable) && i.stable === 100, i.id);
  if (i.pct != null) assert(i.pct >= 0 && i.pct <= 100 && i.label && i.tone, i.id);
}
console.log('✅', exact.length, 'readings, each with a percentage');

// One minute before the Lagna changes sign, a ±5 min window must split the Lagna reading
let m = 0, first = VA.computeChart(demo).lagnaSign;
while (VA.computeChart({ ...demo, minute: m + 1 }).lagnaSign === first) m++;
const edge = flat(VA.readings({ ...demo, minute: m }, NOW, 5));
const lagna = edge.find((i) => i.id === 'lagna'), moon = edge.find((i) => i.id === 'moon');
assert(lagna.stable > 40 && lagna.stable < 70, `lagna stable ${lagna.stable}`);
assert.strictEqual(moon.stable, 100);
console.log(`✅ Stability: Lagna ${lagna.stable.toFixed(0)}% / Moon sign ${moon.stable.toFixed(0)}% when born 1 min before the Lagna changes (±5 min)`);
// Life-event timing: periods tile the window from today, shares sum to 100
const rohit = VA.computeChart({ year: 1998, month: 7, day: 31, hour: 23, minute: 45, lat: 23.7957, lon: 86.4304, tz: 5.5 });
const rd = VA.vimshottari(rohit, NOW);
for (const e of VA.LIFE_EVENTS) {
  const r = VA.eventTiming(rohit, rd, e, NOW);
  assert(Math.abs(sum(r.periods.map((p) => p.share)) - 100) < 1e-6, e.key);
  assert.strictEqual(r.periods[0].startMs, NOW.getTime());
  r.periods.forEach((p, i) => i && assert.strictEqual(p.startMs, r.periods[i - 1].endMs));
  assert(r.ranked[0].share >= r.ranked[r.ranked.length - 1].share);
}
const old = VA.computeChart({ year: 1940, month: 1, day: 1, hour: 12, minute: 0, ...DELHI });
assert.strictEqual(VA.eventTiming(old, VA.vimshottari(old, NOW), VA.LIFE_EVENTS[0], NOW).periods.length, 0);   // marriage window passed
const when = flat(VA.readings(demo, NOW, 5)).filter((i) => i.id.startsWith('area-'));
assert.strictEqual(when.length, VA.LIFE_EVENTS.filter((e) => !e.bad).length);
const hard = flat(VA.readings(demo, NOW, 0)).filter((i) => i.id.startsWith('hard-'));
assert.strictEqual(hard.length, VA.LIFE_EVENTS.filter((e) => e.bad).length);
for (const i of [...when, ...hard]) assert(['good', 'warn', 'bad'].includes(i.tone), i.id + ' has no colour');
const months = flat(VA.readings(demo, NOW, 0)).filter((i) => i.id.startsWith('dasha-'));
assert(months.length >= 2);
for (const i of months) assert(i.pct >= 0 && i.pct <= 100 && i.bad >= 0 && i.bad <= 100 && i.tone && i.text.length > 200 && !/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|house)\b/.test(i.text.replace(/\([^)]* period\)/, '')), i.text);
console.log('✅ Life-event timing: windows tile from today, shares sum to 100%, past windows handled');
console.log('\nALL STRENGTH CHECKS PASSED');
