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
    { key: 'love', name: 'Love and romance', house: 5, also: [7, 11], karaka: 'Venus', ages: [15, 45], age: [23, 5] },
    { key: 'children', name: 'Children', house: 5, also: [2, 11], karaka: 'Jupiter', ages: [20, 45], age: [30, 5] },
    { key: 'home', name: 'Home and property', house: 4, also: [2, 11], karaka: 'Mars', ages: [22, 75], age: [38, 12] },
    { key: 'money', name: 'Money and gains', house: 11, also: [2, 9], karaka: 'Jupiter', ages: [18, 75] },
    { key: 'career', name: 'Career rise', house: 10, also: [6, 11], karaka: 'Sun', ages: [18, 62] },
    // Difficult periods: tied to the houses of loss (12th), illness (6th) and grief (8th),
    // triggered by Saturn and Rahu in transit instead of Jupiter. 4th and 9th = mother, father.
    { key: 'loss', name: 'Money loss', house: 12, also: [8, 2], karaka: 'Rahu', ages: [18, 80], bad: true },
    { key: 'health', name: 'Health worries', house: 6, also: [8, 12], karaka: 'Saturn', ages: [0, 90], age: [70, 25], bad: true },
    { key: 'family', name: 'Worry or loss in the family', house: 8, also: [4, 9], karaka: 'Ketu', ages: [10, 80], age: [50, 15], bad: true },
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
      signs.set(k, [Math.floor(VA.siderealLon('Jupiter', t) / 30), Math.floor(VA.siderealLon('Saturn', t) / 30),
        Math.floor(VA.rahuKetu(t).rahu / 30)]);
    }
    return signs.get(k);
  }
  const JUP = [1, 5, 7, 9], SAT = [1, 3, 7, 10], RAHU = [1, 5, 7, 9];   // signs each planet influences, counted from itself
  const reach = (from, to, list) => list.includes(((to - from + 12) % 12) + 1);

  // Good events: 1 = Jupiter and Saturn both on the house or its lord, 0.5 Jupiter only, 0.2 Saturn only.
  // Difficult ones: 1 = Saturn and Rahu both, 0.7 Saturn only, 0.4 Rahu only.
  function transitLevel(chart, e, ms) {
    const [j, s, r] = transitSigns(ms);
    const from = (base, weight) => {
      const sign = (base + e.house - 1) % 12, lordSign = chart.planets[VA.SIGN_LORD[sign]].signIdx;
      const hit = (x, list) => reach(x, sign, list) || reach(x, lordSign, list);
      const J = hit(j, JUP), S = hit(s, SAT);
      if (e.bad) { const R = hit(r, RAHU); return weight * (S && R ? 1 : S ? 0.7 : R ? 0.4 : 0); }
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
      let signal = 0, raw = 0, months = 0, double = 0, peak = null, run = null, best = 0;
      for (let t = a; t < b; t += MONTH) {
        const lv = transitLevel(chart, e, t), age = (t - birth) / YEAR;
        const w = Math.min(1, (b - t) / MONTH) * (e.age ? Math.exp(-0.5 * ((age - e.age[0]) / e.age[1]) ** 2) : 1);
        signal += d * (0.25 + 0.75 * lv) * w; raw += d * (0.25 + 0.75 * lv); months++;
        if (lv >= 0.7) double++;
        // peak = longest run of months at this period's highest transit level (Jupiter at least)
        if (lv > best) { best = lv; run = null; peak = null; }
        if (lv === best && lv >= 0.5) {
          run = run ? { from: run.from, to: t } : { from: t, to: t };
          if (!peak || run.to - run.from > peak.to - peak.from) peak = { ...run };
        } else run = null;
      }
      // density: how strong the signal is in this period on its own, 0..1, ignoring age and length
      out.periods.push({ md: md.lord, ad: ad.lord, startMs: a, endMs: b, signal, density: raw / months, tieMd, tieAd, months, double, peak });
    }
    const total = out.periods.reduce((x, p) => x + p.signal, 0);
    out.periods.forEach((p) => { p.share = p.signal / total * 100; });
    out.ranked = out.periods.slice().sort((x, y) => y.share - x.share);
    return out;
  }

  /* The next 12 months: for each month, how active each life area is (dasha down to the
   * pratyantar x transit), plus the Sun's monthly transit from the Moon (good in the 3rd,
   * 6th, 10th and 11th). good / bad = the two strongest good areas / the strongest
   * difficult one, scaled so 0.6 activity reads as 100%, nudged 8 points by the Sun. */
  function monthsAhead(chart, dasha, now, n = 12) {
    const birth = VA.birthMs(chart.input);
    const out = [];
    for (let i = 0; i < n; i++) {
      const y = now.getUTCFullYear(), m = now.getUTCMonth() + i;
      const start = Date.UTC(y, m, 1), end = Date.UTC(y, m + 1, 1), mid = (start + end) / 2;
      const per = VA.periodAt(dasha, mid);
      if (!per) break;
      const age = (mid - birth) / YEAR, areas = {};
      for (const e of EVENTS) {
        // marriage and children keep their age windows; the rest matter every month at any age
        if ((e.key === 'marriage' || e.key === 'children') && (age < e.ages[0] || age > e.ages[1])) continue;
        const d = Math.max(0.03, 0.25 * tie(chart, per.md.lord, e) + 0.35 * tie(chart, per.ad.lord, e) + 0.4 * tie(chart, per.pd.lord, e));
        areas[e.key] = d * (0.25 + 0.75 * transitLevel(chart, e, mid));
      }
      const vals = (bad) => EVENTS.filter((e) => !!e.bad === bad && e.key in areas).map((e) => areas[e.key]).sort((x, y) => y - x);
      const sunHouse = ((Math.floor(VA.siderealLon('Sun', VA.timeOf(new Date(mid))) / 30) - chart.planets.Moon.signIdx + 12) % 12) + 1;
      const sunGood = [3, 6, 10, 11].includes(sunHouse);
      const pctOf = (v, nudge) => Math.round(Math.max(0, Math.min(100, v / 0.6 * 100 + nudge)));
      const gv = vals(false), bv = vals(true);
      const good = pctOf(((gv[0] || 0) + (gv[1] || 0)) / 2, sunGood ? 8 : -8), bad = pctOf(bv[0] || 0, sunGood ? -8 : 8);
      // a sub-period (ad) or sub-sub-period (pd) boundary inside this month
      const a = VA.periodAt(dasha, start), b = VA.periodAt(dasha, end - 1);
      const change = a && b && a.ad !== b.ad ? 'ad' : a && b && a.pd !== b.pd ? 'pd' : '';
      out.push({ start, end, md: per.md.lord, ad: per.ad.lord, pd: per.pd.lord, areas, sunGood, good, bad, change });
    }
    return out;
  }

  Object.assign(VA, { LIFE_EVENTS: EVENTS, eventTiming, eventTie: tie, monthsAhead });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
