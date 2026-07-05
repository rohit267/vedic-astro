/* kundali.js — assemble a full birth chart from birth data.
 * Depends on ephemeris.js + panchang.js. */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const norm360 = (x) => ((x % 360) + 360) % 360;

  /* input: {year, month, day, hour, minute, tz (hours, e.g. 5.5), lat, lon, name?} */
  function computeChart(input) {
    const t = VA.makeTime(input.year, input.month, input.day, input.hour, input.minute, input.tz);
    const rk = VA.rahuKetu(t);
    const rawLon = {
      Sun: VA.siderealLon('Sun', t),
      Moon: VA.siderealLon('Moon', t),
      Mars: VA.siderealLon('Mars', t),
      Mercury: VA.siderealLon('Mercury', t),
      Jupiter: VA.siderealLon('Jupiter', t),
      Venus: VA.siderealLon('Venus', t),
      Saturn: VA.siderealLon('Saturn', t),
      Rahu: rk.rahu,
      Ketu: rk.ketu,
    };
    const ascLon = VA.ascendant(t, input.lat, input.lon);
    const asc = VA.decompose(ascLon);
    const lagnaSign = asc.signIdx;
    const sunLon = rawLon.Sun;

    const planets = {};
    for (const p of VA.PLANETS) {
      const d = VA.decompose(rawLon[p]);
      const retro = (p === 'Rahu' || p === 'Ketu') ? true : VA.isRetro(p, t);
      const house = ((d.signIdx - lagnaSign + 12) % 12) + 1;
      const vargas = {};
      for (const key of Object.keys(VA.VARGAS)) vargas[key] = VA.VARGAS[key].fn(rawLon[p]);
      planets[p] = {
        name: p, short: VA.PLANET_SHORT[p], lon: d.lon,
        sign: d.sign, signIdx: d.signIdx, signShort: d.signShort, signDeg: d.signDeg,
        nakshatra: d.nakshatra, nakIdx: d.nakIdx, nakLord: d.nakLord, pada: d.pada,
        house, retro,
        combust: (p === 'Rahu' || p === 'Ketu' || p === 'Sun') ? false
          : VA.isCombust(p, rawLon[p], sunLon, retro),
        dignity: (p === 'Rahu' || p === 'Ketu') ? '' : VA.dignity(p, d.signIdx),
        vargas,
      };
    }

    // Whole-sign house cusps (sign occupying each house)
    const houses = [];
    for (let h = 0; h < 12; h++) houses.push((lagnaSign + h) % 12);

    return {
      input, time: t,
      ascendant: { ...asc, lon: ascLon },
      lagnaSign, houses, planets,
      ayanamsa: VA.ayanamsa(t),
    };
  }

  // Varga chart: which sign each planet + lagna falls into for a given division key
  function vargaChart(chart, key) {
    const lagna = key === 'D1' ? chart.lagnaSign : VA.VARGAS[key].fn(chart.ascendant.lon);
    const occupants = Array.from({ length: 12 }, () => []);
    for (const p of VA.PLANETS) {
      const sIdx = chart.planets[p].vargas[key];
      occupants[sIdx].push(p);
    }
    return { key, name: VA.VARGAS[key].name, lagnaSign: lagna, occupants };
  }

  Object.assign(VA, { computeChart, vargaChart, norm360 });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
