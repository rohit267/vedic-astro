/* panchang.js — the fixed Vedic tables and the decomposition of a sidereal
 * longitude into sign / nakshatra / pada, plus dignity, combustion and the
 * divisional-chart (varga) rules D1–D9. Pure data + arithmetic, no ephemeris. */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const norm360 = (x) => ((x % 360) + 360) % 360;

  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SIGN_SHORT = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
    'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula',
    'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  // Vimshottari lord per nakshatra (cycle of 9)
  const NAK_LORD = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const nakLord = (nakIdx) => NAK_LORD[nakIdx % 9];

  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const PLANET_SHORT = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

  const NAK_LEN = 360 / 27;      // 13°20'
  const PADA_LEN = NAK_LEN / 4;  // 3°20'

  // Decompose a sidereal longitude
  function decompose(lon) {
    lon = norm360(lon);
    const signIdx = Math.floor(lon / 30);
    const nakIdx = Math.floor(lon / NAK_LEN);
    const pada = Math.floor((lon % NAK_LEN) / PADA_LEN) + 1;
    return {
      lon,
      signIdx, sign: SIGNS[signIdx], signShort: SIGN_SHORT[signIdx],
      signDeg: lon % 30,
      nakIdx, nakshatra: NAKSHATRAS[nakIdx], nakLord: nakLord(nakIdx),
      pada,
    };
  }

  // Dignity: exaltation / debilitation / own / moolatrikona
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 }; // sign index
  const DEBIL = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const OWN = {
    Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
    Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
  };
  function dignity(planet, signIdx) {
    if (EXALT[planet] === signIdx) return 'Exalted';
    if (DEBIL[planet] === signIdx) return 'Debilitated';
    if (OWN[planet] && OWN[planet].includes(signIdx)) return 'Own sign';
    return '';
  }

  // Combustion (asta): planet too close to the Sun. Thresholds in degrees.
  const COMBUST = { Mercury: 14, Venus: 10, Mars: 17, Jupiter: 11, Saturn: 15, Moon: 12 };
  const COMBUST_RETRO = { Mercury: 12, Venus: 8 };
  function isCombust(planet, planetLon, sunLon, retro) {
    if (!(planet in COMBUST)) return false;
    let sep = Math.abs(norm360(planetLon) - norm360(sunLon));
    if (sep > 180) sep = 360 - sep;
    const thr = (retro && COMBUST_RETRO[planet]) ? COMBUST_RETRO[planet] : COMBUST[planet];
    return sep <= thr;
  }

  /* ---- Divisional charts (vargas) D1–D9. Each returns a sign index 0–11. ---- */
  // D1 Rashi
  function d1(lon) { return Math.floor(norm360(lon) / 30); }
  // D2 Hora: odd sign 1st half → Leo(Sun), 2nd half → Cancer(Moon); even sign reversed
  function d2(lon) {
    lon = norm360(lon); const s = Math.floor(lon / 30); const half = (lon % 30) < 15 ? 0 : 1;
    const oddSign = s % 2 === 0; // Aries(0) is odd sign in 1-based terms
    if (oddSign) return half === 0 ? 4 : 3;   // Leo : Cancer
    return half === 0 ? 3 : 4;                // Cancer : Leo
  }
  // D3 Drekkana: 0–10 same, 10–20 5th, 20–30 9th
  function d3(lon) {
    lon = norm360(lon); const s = Math.floor(lon / 30); const part = Math.floor((lon % 30) / 10);
    return (s + [0, 4, 8][part]) % 12;
  }
  // D4 Chaturthamsa: quarters map to same, 4th, 7th, 10th
  function d4(lon) {
    lon = norm360(lon); const s = Math.floor(lon / 30); const part = Math.floor((lon % 30) / 7.5);
    return (s + [0, 3, 6, 9][part]) % 12;
  }
  // D7 Saptamsa: odd sign start same; even sign start 7th; then count forward
  function d7(lon) {
    lon = norm360(lon); const s = Math.floor(lon / 30); const part = Math.floor((lon % 30) / (30 / 7));
    const start = (s % 2 === 0) ? s : (s + 6) % 12;
    return (start + part) % 12;
  }
  // D9 Navamsa: continuous 3°20' division across the zodiac from Aries
  function d9(lon) { return Math.floor(norm360(lon) / (10 / 3)) % 12; }

  const VARGAS = {
    D1: { name: 'Rashi (D1)', fn: d1 },
    D2: { name: 'Hora (D2)', fn: d2 },
    D3: { name: 'Drekkana (D3)', fn: d3 },
    D4: { name: 'Chaturthamsa (D4)', fn: d4 },
    D7: { name: 'Saptamsa (D7)', fn: d7 },
    D9: { name: 'Navamsa (D9)', fn: d9 },
  };

  Object.assign(VA, {
    SIGNS, SIGN_SHORT, SIGN_LORD, NAKSHATRAS, PLANETS, PLANET_SHORT,
    NAK_LEN, PADA_LEN, nakLord, decompose, dignity, isCombust, VARGAS, norm360,
  });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
