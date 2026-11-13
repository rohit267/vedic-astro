/* timing.js: when life events are most likely, from the two classical timing rules.
 * 1. Dasha: an event comes in the period of planets tied to its house (sitting in it,
 *    ruling it, aspecting it, or its natural significator), MD and AD lord together.
 * 2. Double transit: Jupiter and Saturn both touch the house or its lord, counted from
 *    the Lagna or the Moon.
 * Each month's signal = dasha tie x transit x how common the event is at that age. A
 * period's chance is its share of all the signal in the event's age window from today.
 * The tie and transit weights are this app's judgement calls; the age curves are rough
 * real-world base rates (median first-marriage and first-child ages). */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const YEAR = 365.2425 * 86400000, MONTH = YEAR / 12;
  const HORIZON = 20;                                 // years ahead to look

  // house = main house; also = supporting houses; karaka = natural significator;
  // age = [mean, spread] of a bell curve for how common the event is at each age
  const EVENTS = [
    { key: 'marriage', name: 'Marriage', house: 7, also: [2, 11], karaka: 'Venus', ages: [18, 45], age: [27, 5] },
    { key: 'love', name: 'Love and romance', house: 5, also: [7, 11], karaka: 'Venus', ages: [15, 50], age: [25, 8] },
    { key: 'children', name: 'Children', house: 5, also: [2, 11], karaka: 'Jupiter', ages: [20, 45], age: [30, 5] },
    { key: 'home', name: 'Home and property', house: 4, also: [2, 11], karaka: 'Mars', ages: [22, 75], age: [38, 12] },
    { key: 'money', name: 'Money and gains', house: 11, also: [2, 9], karaka: 'Jupiter', ages: [18, 75] },
    { key: 'career', name: 'Career rise', house: 10, also: [6, 11], karaka: 'Sun', ages: [18, 62] },
  ];

  // How tied planet p is to an event, 0..1. Rahu and Ketu rule through their sign lord.
  function tie(chart, p, e) {
    const ruler = VA.rulerOf(chart, p), house = chart.planets[p].house;
    const rules = (h) => VA.SIGN_LORD[chart.houses[h - 1]] === ruler;
    let w = (rules(e.house) ? 3 : 0) + (house === e.house ? 3 : 0)
      + (VA.aspects(chart, p, e.house) ? 2 : 0) + (p === e.karaka ? 2 : 0);
    for (const h of e.also) w += (rules(h) ? 1 : 0) + (house === h ? 1 : 0);
    return Math.min(1, w / 5);
  }

  // Signs of transiting Jupiter and Saturn, one lookup per calendar month (shared by all charts)
  const signs = new Map();
  function transitSigns(ms) {
    const k = Math.floor(ms / MONTH);
    if (!signs.has(k)) {
      const t = VA.timeOf(new Date((k + 0.5) * MONTH));
      signs.set(k, [Math.floor(VA.siderealLon('Jupiter', t) / 30), Math.floor(VA.siderealLon('Saturn', t) / 30)]);
    }
    return signs.get(k);
  }
  const JUP = [1, 5, 7, 9], SAT = [1, 3, 7, 10];      // signs each planet influences, counted from itself
  const reach = (from, to, list) => list.includes(((to - from + 12) % 12) + 1);

  // 1 = Jupiter and Saturn both on the house or its lord, 0.5 Jupiter only, 0.2 Saturn only
  function transitLevel(chart, e, ms) {
    const [j, s] = transitSigns(ms);
    const from = (base, weight) => {
      const sign = (base + e.house - 1) % 12, lordSign = chart.planets[VA.SIGN_LORD[sign]].signIdx;
      const hit = (x, list) => reach(x, sign, list) || reach(x, lordSign, list);
      const J = hit(j, JUP), S = hit(s, SAT);
      return weight * (J && S ? 1 : J ? 0.5 : S ? 0.2 : 0);
    };
    return Math.max(from(chart.lagnaSign, 1), from(chart.planets.Moon.signIdx, 0.7));
  }

  function eventTiming(chart, dasha, e, now) {
    const birth = VA.birthMs(chart.input), nowMs = now.getTime();
    const start = Math.max(nowMs, birth + e.ages[0] * YEAR);
    const end = Math.min(birth + e.ages[1] * YEAR, nowMs + HORIZON * YEAR);
    const out = { event: e, start, end, periods: [], promise: VA.houseScore(chart, e.house, [e.karaka]).pct };
    if (end <= start) return out;
    for (const md of dasha.maha) for (const ad of md.antar) {
      const a = Math.max(ad.startMs, start), b = Math.min(ad.endMs, end);
      if (b <= a) continue;
      const tieMd = tie(chart, md.lord, e), tieAd = tie(chart, ad.lord, e);
      const d = Math.max(0.03, 0.4 * tieMd + 0.6 * tieAd);
      let signal = 0, months = 0, double = 0, peak = null, run = null, best = 0;
      for (let t = a; t < b; t += MONTH) {
        const lv = transitLevel(chart, e, t), age = (t - birth) / YEAR;
        const w = Math.min(1, (b - t) / MONTH) * (e.age ? Math.exp(-0.5 * ((age - e.age[0]) / e.age[1]) ** 2) : 1);
        signal += d * (0.25 + 0.75 * lv) * w; months++;
        if (lv >= 0.7) double++;
        // peak = longest run of months at this period's highest transit level (Jupiter at least)
        if (lv > best) { best = lv; run = null; peak = null; }
        if (lv === best && lv >= 0.5) {
          run = run ? { from: run.from, to: t } : { from: t, to: t };
          if (!peak || run.to - run.from > peak.to - peak.from) peak = { ...run };
        } else run = null;
      }
      out.periods.push({ md: md.lord, ad: ad.lord, startMs: a, endMs: b, signal, tieMd, tieAd, months, double, peak });
    }
    const total = out.periods.reduce((x, p) => x + p.signal, 0);
    out.periods.forEach((p) => { p.share = p.signal / total * 100; });
    out.ranked = out.periods.slice().sort((x, y) => y.share - x.share);
    return out;
  }

  Object.assign(VA, { LIFE_EVENTS: EVENTS, eventTiming, eventTie: tie });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
