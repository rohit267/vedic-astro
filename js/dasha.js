/* dasha.js — Vimshottari Dasha (Maha → Antar → Pratyantar), seeded from the
 * Moon's nakshatra. 120-year cycle. Validated: Rohit → Saturn MD 2018–2037. */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const ORDER = [['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7],
    ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17]];
  const TOTAL = 120;
  const YEAR_MS = 365.2425 * 86400000;
  const idxOf = (lord) => ORDER.findIndex((o) => o[0] === lord);

  function birthMs(input) {
    return Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, input.second || 0) - input.tz * 3600000;
  }

  // Build sub-periods of `parentYears` starting at `startMs`, cycling from `startLord`.
  function subPeriods(startLord, parentYears, startMs) {
    const s = idxOf(startLord);
    const out = [];
    let cur = startMs;
    for (let i = 0; i < 9; i++) {
      const [lord, yrs] = ORDER[(s + i) % 9];
      const dur = parentYears * yrs / TOTAL;
      const end = cur + dur * YEAR_MS;
      out.push({ lord, years: dur, startMs: cur, endMs: end });
      cur = end;
    }
    return out;
  }

  function vimshottari(chart, now) {
    const nowMs = now.getTime();
    const moon = chart.planets.Moon;
    const startLord = moon.nakLord;
    const frac = (moon.lon % VA.NAK_LEN) / VA.NAK_LEN;          // portion of nakshatra already traversed
    const elapsedYears = ORDER[idxOf(startLord)][1] * frac;
    const bMs = birthMs(chart.input);
    const firstStartMs = bMs - elapsedYears * YEAR_MS;          // true start of the running MD (before birth)

    // Maha dashas
    const maha = [];
    let cur = firstStartMs;
    const s = idxOf(startLord);
    for (let i = 0; i < 9; i++) {
      const [lord, yrs] = ORDER[(s + i) % 9];
      const end = cur + yrs * YEAR_MS;
      maha.push({ lord, years: yrs, startMs: cur, endMs: end });
      cur = end;
    }

    const inRange = (p) => nowMs >= p.startMs && nowMs < p.endMs;
    const currentMD = maha.find(inRange) || maha[0];
    currentMD.antar = subPeriods(currentMD.lord, currentMD.years, currentMD.startMs);
    const currentAD = currentMD.antar.find(inRange) || currentMD.antar[0];
    currentAD.pratyantar = subPeriods(currentAD.lord, currentAD.years, currentAD.startMs);
    const currentPD = currentAD.pratyantar.find(inRange) || currentAD.pratyantar[0];

    // also expand antars for every maha (for the full browsable list)
    maha.forEach((md) => { if (!md.antar) md.antar = subPeriods(md.lord, md.years, md.startMs); });

    return {
      startLord, balanceAtBirthYears: ORDER[idxOf(startLord)][1] * (1 - frac),
      maha, current: { md: currentMD, ad: currentAD, pd: currentPD },
    };
  }

  Object.assign(VA, { vimshottari });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
