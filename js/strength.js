/* strength.js — the arithmetic behind every percentage: seven classical balas per
 * planet (in virupas), Ashtakavarga bindus, aspects, and the house / dasha scores
 * blended from them. Bala formulas and bindu tables follow Brihat Parashara Hora
 * Shastra; the blend weights (PLACE, OWNED, W) are this app's own judgement calls. */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const { norm360, ordinal, SIGN_LORD } = VA;
  const SEVEN = VA.PLANETS.slice(0, 7);
  const D2R = Math.PI / 180;
  const arc = (a, b) => { const d = norm360(a - b); return d > 180 ? 360 - d : d; };   // 0..180
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const blend = (factors) => factors.reduce((a, f) => a + f.pct * f.w, 0) / factors.reduce((a, f) => a + f.w, 0);

  /* ---- planet strength ---- */
  const DEEP_EXALT = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
  // Moolatrikona: [sign, from°, to°)
  const MOOLA = { Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20],
    Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20] };
  const FRIENDS = { Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'] };
  const ENEMIES = { Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'] };
  // Point where each planet has zero directional strength, as an offset from [asc, mc]
  const DIG_WEAK = { Sun: ['mc', 180], Mars: ['mc', 180], Jupiter: ['asc', 180], Mercury: ['asc', 180],
    Moon: ['mc', 0], Venus: ['mc', 0], Saturn: ['asc', 0] };
  // Mean tropical longitudes, degrees + degrees per Julian century from J2000 (Meeus, table 31.A)
  const MEAN_LON = { Mercury: [252.250906, 149474.0722491], Venus: [181.979801, 58519.2130302],
    Earth: [100.466457, 36000.7698278], Mars: [355.433, 19141.6964471],
    Jupiter: [34.351519, 3036.3027748], Saturn: [50.077444, 1223.5110686] };
  const MAX = { uccha: 60, rasi: 45, navamsa: 30, kendra: 60, dig: 60, paksha: 60, cheshta: 60 };
  const MAX_TOTAL = Object.values(MAX).reduce((a, b) => a + b, 0);

  /* Dignity of planet p in a sign, in virupas: moolatrikona 45 (rasi only, pass deg), own 30,
   * then compound friendship with the sign lord: 20 / 15 / 10 / 4 / 2. */
  function dignityVirupas(chart, p, signIdx, deg) {
    const m = MOOLA[p];
    if (deg != null && m[0] === signIdx && deg >= m[1] && deg < m[2]) return 45;
    const lord = SIGN_LORD[signIdx];
    if (lord === p) return 30;
    const natural = FRIENDS[p].includes(lord) ? 1 : ENEMIES[p].includes(lord) ? -1 : 0;
    const from = ((chart.planets[lord].signIdx - chart.planets[p].signIdx + 12) % 12) + 1;
    const temporary = [2, 3, 4, 10, 11, 12].includes(from) ? 1 : -1;
    return { 2: 20, 1: 15, 0: 10, '-1': 4, '-2': 2 }[natural + temporary];
  }

  /* Cheshta (motional) bala for Mars..Saturn: 0 at conjunction with the Sun, 60 at the
   * middle of the retrograde loop. Kendra = sheeghrocha − (mean + true longitude) / 2. */
  function cheshta(p, trueTrop, T) {
    const L = (b) => norm360(MEAN_LON[b][0] + MEAN_LON[b][1] * T);
    const meanSun = L('Earth') + 180;
    const inner = p === 'Mercury' || p === 'Venus';
    const madhya = inner ? meanSun : L(p), sheeghra = inner ? L(p) : meanSun;
    const avg = madhya + (((trueTrop - madhya) % 360 + 540) % 360 - 180) / 2;
    return arc(sheeghra, avg) / 3;
  }

  function planetStrengths(chart) {
    const P = chart.planets, T = chart.time.tt / 36525;
    const bright = arc(P.Moon.lon, P.Sun.lon) / 3;                 // paksha bala of a benefic
    const out = {};
    for (const p of SEVEN) {
      const pl = P[p], [ref, off] = DIG_WEAK[p];
      const parts = {
        uccha: arc(pl.lon, DEEP_EXALT[p] + 180) / 3,
        rasi: dignityVirupas(chart, p, pl.signIdx, pl.signDeg),
        navamsa: dignityVirupas(chart, p, pl.vargas.D9),
        kendra: [60, 30, 15][(pl.house - 1) % 3],
        dig: arc(pl.lon, (ref === 'mc' ? chart.mc : chart.ascendant.lon) + off) / 3,
        paksha: ['Sun', 'Mars', 'Saturn'].includes(p) ? 60 - bright : bright,
      };
      if (p === 'Moon') parts.cheshta = bright;                    // BPHS: the Moon's cheshta is its paksha bala
      else if (p === 'Sun') {                                      // ...and the Sun's is its ayana (declination) bala
        const eps = 23.44, decl = Math.asin(Math.sin(eps * D2R) * Math.sin((pl.lon + chart.ayanamsa) * D2R)) / D2R;
        parts.cheshta = (eps + decl) / (2 * eps) * 60;
      } else parts.cheshta = cheshta(p, pl.lon + chart.ayanamsa, T);
      const total = Object.values(parts).reduce((a, b) => a + b, 0);
      out[p] = { parts, total, pct: total / MAX_TOTAL * 100 };
    }
    return out;
  }

  /* ---- Ashtakavarga: benefic places counted from Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna ---- */
  const BAV = {
    Sun: [[1, 2, 4, 7, 8, 9, 10, 11], [3, 6, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [3, 5, 6, 9, 10, 11, 12],
      [5, 6, 9, 11], [6, 7, 12], [1, 2, 4, 7, 8, 9, 10, 11], [3, 4, 6, 10, 11, 12]],
    Moon: [[3, 6, 7, 8, 10, 11], [1, 3, 6, 7, 10, 11], [2, 3, 5, 6, 9, 10, 11], [1, 3, 4, 5, 7, 8, 10, 11],
      [1, 4, 7, 8, 10, 11, 12], [3, 4, 5, 7, 9, 10, 11], [3, 5, 6, 11], [3, 6, 10, 11]],
    Mars: [[3, 5, 6, 10, 11], [3, 6, 11], [1, 2, 4, 7, 8, 10, 11], [3, 5, 6, 11],
      [6, 10, 11, 12], [6, 8, 11, 12], [1, 4, 7, 8, 9, 10, 11], [1, 3, 6, 10, 11]],
    Mercury: [[5, 6, 9, 11, 12], [2, 4, 6, 8, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 3, 5, 6, 9, 10, 11, 12],
      [6, 8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 2, 4, 6, 8, 10, 11]],
    Jupiter: [[1, 2, 3, 4, 7, 8, 9, 10, 11], [2, 5, 7, 9, 11], [1, 2, 4, 7, 8, 10, 11], [1, 2, 4, 5, 6, 9, 10, 11],
      [1, 2, 3, 4, 7, 8, 10, 11], [2, 5, 6, 9, 10, 11], [3, 5, 6, 12], [1, 2, 4, 5, 6, 7, 9, 10, 11]],
    Venus: [[8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11, 12], [3, 5, 6, 9, 11, 12], [3, 5, 6, 9, 11],
      [5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 10, 11], [3, 4, 5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 11]],
    Saturn: [[1, 2, 4, 7, 8, 10, 11], [3, 6, 11], [3, 5, 6, 10, 11, 12], [6, 8, 9, 10, 11, 12],
      [5, 6, 11, 12], [6, 11, 12], [3, 5, 6, 11], [1, 3, 4, 6, 10, 11]],
  };
  function ashtakavarga(chart) {
    const refs = [...SEVEN.map((p) => chart.planets[p].signIdx), chart.lagnaSign];
    const bav = {};
    for (const p of SEVEN) {
      bav[p] = Array(12).fill(0);
      BAV[p].forEach((places, r) => places.forEach((h) => bav[p][(refs[r] + h - 1) % 12]++));
    }
    const sav = bav.Sun.map((_, s) => SEVEN.reduce((a, p) => a + bav[p][s], 0));
    return { bav, sav };       // bindus per sign index; sav sums to 337
  }

  // Everything derived from one chart, computed once
  function analyse(chart) {
    return chart.analysis || (chart.analysis = { strength: planetStrengths(chart), av: ashtakavarga(chart) });
  }
  // Rahu / Ketu have no bala of their own: they act through the lord of their sign
  const rulerOf = (chart, p) => (SEVEN.includes(p) ? p : SIGN_LORD[chart.planets[p].signIdx]);
  const strengthOf = (chart, p) => analyse(chart).strength[rulerOf(chart, p)].pct;

  /* ---- aspects and benefics ---- */
  const EXTRA_ASPECT = { Mars: [3, 7], Jupiter: [4, 8], Saturn: [2, 9] };   // sign offsets beyond the 7th
  const aspects = (chart, p, house) => {
    const off = (house - chart.planets[p].house + 12) % 12;
    return SEVEN.includes(p) && (off === 6 || (EXTRA_ASPECT[p] || []).includes(off));
  };
  const isBenefic = (chart, p) => ['Jupiter', 'Venus', 'Mercury'].includes(p)
    || (p === 'Moon' && norm360(chart.planets.Moon.lon - chart.planets.Sun.lon) < 180);   // waxing Moon

  /* ---- blended scores (0–100). These three tables are the judgement calls. ---- */
  const PLACE = { 1: 85, 4: 85, 5: 85, 7: 85, 9: 85, 10: 85, 2: 70, 11: 70, 3: 50, 6: 25, 12: 25, 8: 15 };  // sitting in house
  const OWNED = { 1: 90, 5: 90, 9: 90, 10: 75, 4: 70, 7: 60, 11: 55, 2: 50, 3: 35, 6: 25, 12: 25, 8: 15 }; // ruling house
  const W = { lord: 30, bindus: 20, placement: 20, influence: 15, karaka: 15 };

  // How well a house (life area) is supported. karakas = its natural significators.
  function houseScore(chart, house, karakas) {
    const { av } = analyse(chart), sign = chart.houses[house - 1], lord = SIGN_LORD[sign];
    const lordHouse = chart.planets[lord].house;
    let influence = 50; const notes = [];
    for (const p of VA.PLANETS) {
      const here = chart.planets[p].house === house;
      if (!here && !aspects(chart, p, house)) continue;
      const good = isBenefic(chart, p) || (here && [3, 6, 10, 11].includes(house));   // malefics do well in upachaya houses
      influence += (good ? 1 : -1) * (here ? 15 : 8);
      notes.push(`${p} ${here ? 'in it' : 'aspects it'} (${good ? '+' : '−'})`);
    }
    const factors = [
      { label: `${lord}, the house lord — strength`, pct: strengthOf(chart, lord), w: W.lord },
      { label: `Ashtakavarga — ${av.sav[sign]} of 56 bindus (28 is average)`, pct: av.sav[sign] / 56 * 100, w: W.bindus },
      { label: `Lord sits in the ${ordinal(lordHouse)} house`, pct: PLACE[lordHouse], w: W.placement },
      { label: notes.length ? notes.join(', ') : 'No planet occupies or aspects it', pct: clamp(influence), w: W.influence },
      { label: `${karakas.join(' + ')}, the significator — strength`, pct: mean(karakas.map((k) => strengthOf(chart, k))), w: W.karaka },
    ];
    return { pct: blend(factors), factors, lord, lordHouse, sign };
  }

  // How favourable a dasha lord is for this particular chart
  function lordScore(chart, p) {
    const ruler = rulerOf(chart, p);
    const owned = chart.houses.map((s, i) => (SIGN_LORD[s] === ruler ? i + 1 : 0)).filter(Boolean);
    return blend([
      { pct: strengthOf(chart, p), w: 40 },
      { pct: mean(owned.map((h) => OWNED[h])), w: 35 },
      { pct: PLACE[chart.planets[p].house], w: 25 },
    ]);
  }
  function periodScore(chart, md, ad) {
    const rel = ((chart.planets[ad].signIdx - chart.planets[md].signIdx + 12) % 12) + 1;
    const factors = [
      { label: `${md} (mahadasha lord): strength, houses ruled, placement`, pct: lordScore(chart, md), w: 40 },
      { label: `${ad} (antardasha lord): strength, houses ruled, placement`, pct: lordScore(chart, ad), w: 40 },
      { label: `${ad} is ${ordinal(rel)} from ${md}`, pct: [2, 6, 8, 12].includes(rel) ? 25 : rel === 3 || rel === 11 ? 55 : 80, w: 20 },
    ];
    return { pct: blend(factors), factors };
  }

  // Gochara: bindus the transiting planet has in the sign it is in right now (4+ of 8 is favourable)
  function transit(chart, planet, t) {
    const sign = Math.floor(VA.siderealLon(planet, t) / 30);
    return { sign, bindus: analyse(chart).av.bav[planet][sign] };
  }

  Object.assign(VA, { analyse, strengthOf, houseScore, periodScore, transit, STRENGTH_MAX: MAX, SEVEN });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
