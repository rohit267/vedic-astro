/* predictions.js: rule-based readings, each carrying a percentage.
 * A score (how strongly the classical indicators in strength.js line up) and/or a
 * stability figure (share of birth times inside the ± window that give the same
 * reading). Neither is a measured chance of an event; the wording says so. */
(function (root) {
  const VA = (root.VA = root.VA || {});

  const LAGNA = {
    Aries: 'You lead from the front. Direct, restless, quick to start. Your challenge is finishing what you begin and not burning hot when things stall.',
    Taurus: 'Steady and grounded. You want security, comfort and things that last. You move slowly, but once you commit you hold on. Stubbornness is the shadow side.',
    Gemini: 'A quick, curious mind that lives in words and ideas. You adapt easily and talk your way through life, but scattered focus is the thing to watch.',
    Cancer: 'You feel everything deeply and protect the people you love. Home and belonging matter more to you than status. Moods run strong; guard your soft heart.',
    Leo: 'Warm, proud, made to be seen. You lead with heart and want to matter. When respected you give generously; when ignored the ego stings.',
    Virgo: 'Sharp, practical, detail-minded. You fix and improve everything, including yourself, sometimes too harshly. Learn to let "good enough" be enough.',
    Libra: 'You seek balance, fairness and harmony, and you read people well. Relationships are central to your life. The catch: deciding, and not losing yourself to keep the peace.',
    Scorpio: 'Intense, private, all-or-nothing. You feel in extremes and keep your real self hidden until you trust. Powerful when focused; the shadow is control and grudges.',
    Sagittarius: 'Free, honest, forever seeking meaning. You need room to roam, in mind or map. Optimistic and blunt; watch the restlessness and the over-promising.',
    Capricorn: 'Serious, patient, built for the long climb. You mature early and carry responsibility young. Success comes late but solid. Just don\'t let duty crowd out joy.',
    Aquarius: 'Independent and different by design. You think ahead of your time and care about the bigger picture more than the crowd. Warmth can hide behind the detachment.',
    Pisces: 'Gentle, imaginative, deeply feeling. You absorb the world and dream past it. Compassion is your gift; boundaries and staying grounded are the lifelong work.',
  };

  const MOON = {
    Aries: 'emotionally quick and hot: you react fast, forgive fast, and need action to feel okay.',
    Taurus: 'you calm down through comfort, routine and touch; you need to feel safe before you open (Moon is exalted here, a naturally steady heart).',
    Gemini: 'your feelings live in your head; you talk to process, and need mental stimulation to feel alive.',
    Cancer: 'deeply feeling and nurturing; home and mother-figures shape you strongly (Moon\'s own sign, emotionally rich).',
    Leo: 'you need to be seen and appreciated; your heart is warm and proud, and coldness wounds you most.',
    Virgo: 'you soothe yourself by fixing and ordering things; you worry, and you show love through usefulness.',
    Libra: 'you need harmony and a partner to feel whole; conflict unsettles you, and you weigh everything twice.',
    Scorpio: 'you feel in extremes and hide the depth; old wounds run deep here (Moon is debilitated: the heart carries more weight and needs healing).',
    Sagittarius: 'you need freedom and meaning to feel content; you\'re hopeful, restless, and honest to a fault.',
    Capricorn: 'you keep feelings controlled and private; you learned early to be strong, sometimes too early.',
    Aquarius: 'you feel best with space and cannot be caged; you care widely but guard the personal.',
    Pisces: 'you feel the whole world and dream past it; tender, intuitive, and in need of quiet to refill.',
  };

  const DASHA_NATURE = {
    Sun: 'a Sun chapter: about identity, standing on your own, recognition and health. You\'re meant to step forward and be seen; ego and authority-figures are the friction.',
    Moon: 'a Moon chapter: softer, emotional, about home, mother, comfort and the inner life. Good for peace and connection; moods can swing.',
    Mars: 'a Mars chapter: high energy, drive and courage. Great for building and fighting for things, but temper, haste and conflict need a leash.',
    Mercury: 'a Mercury chapter: mind, skill, communication, business and learning. A clever, busy, wordy season; keep the nerves and overthinking in check.',
    Jupiter: 'a Jupiter chapter: the kindest season. Growth, wisdom, luck, teachers, marriage and children. Doors open; just don\'t get complacent.',
    Venus: 'a Venus chapter: love, marriage, beauty, comfort and pleasure. One of the sweetest periods for relationships and the good things of life.',
    Saturn: 'a Saturn chapter: the strict teacher who makes you earn everything. It can feel heavy, slow, even lonely, but nothing built now is fragile. What you earn here, you keep.',
    Rahu: 'a Rahu chapter: hunger, ambition, the unusual and the foreign. Sudden rises and strange turns; exciting but can pull you off-centre if you chase illusions.',
    Ketu: 'a Ketu chapter: letting go, turning inward, spirituality and quiet loss. Worldly things can feel flat; it\'s a season for meaning, not gain.',
  };

  const sign = (i) => VA.SIGNS[i];

  const PLANET_GIFT = { Sun: 'confidence, authority and vitality', Moon: 'emotional steadiness and warmth',
    Mars: 'drive, courage and stamina', Mercury: 'intellect, speech and business sense',
    Jupiter: 'wisdom, luck and good counsel', Venus: 'love, comfort and taste', Saturn: 'discipline, endurance and long-game results' };

  /* Band cut-points = the lower and upper third of each score over 400 random charts
   * (test/reference.json), so "strong" means stronger than about two charts in three. */
  const CUTS = { area: [49, 57], period: [52, 60], planet: [43, 54] };
  const band = (kind, pct) => (pct >= CUTS[kind][1] ? 'high' : pct >= CUTS[kind][0] ? 'mid' : 'low');
  // What a house lord's placement links a life area with
  const THROUGH = ['', 'your own initiative and personality', 'family, savings or speech',
    'siblings, neighbours, writing, media or your own effort', 'home, mother, property or your hometown',
    'romance, studies, creative work or children', 'work, service, health matters or competition',
    'partners, clients or the public', 'sudden events, in-laws, research or shared money',
    'teachers, father, faith, higher studies or long journeys', 'career, status and public life',
    'friends, networks, elder siblings and gains', 'foreign places, travel, spending or quiet retreat'];
  const LINK = {
    marriage: (x) => `you may meet your partner through ${x}`,
    love: (x) => `romance tends to start through ${x}`,
    children: (x) => `children and your joy in them are tied to ${x}`,
    home: (x) => `home and property come through ${x}`,
    money: (x) => `gains come mainly through ${x}`,
    career: (x) => `your career runs through ${x}`,
  };
  const IN_HOUSE = { Sun: 'pride and authority, sometimes ego clashes', Moon: 'strong feeling and some ups and downs',
    Mars: 'drive and heat, with some friction', Mercury: 'talk, wit and a youthful touch',
    Jupiter: 'growth, wisdom and protection', Venus: 'ease, charm and pleasure', Saturn: 'delay, but durability',
    Rahu: 'the unusual or foreign, and sudden turns', Ketu: 'detachment; it can feel less satisfying than it looks' };
  const LOOKS = { Saturn: 'slower, but lasting', Jupiter: 'protection and growth', Mars: 'energy, and some friction' };
  const SUPPORT_WORD = { high: 'above average', mid: 'average', low: 'below average' };
  const KARAKA_WORD = { high: 'strong', mid: 'of average strength', low: 'weak' };
  const PERIOD_TEXT = { high: 'a supportive stretch for this chart', mid: 'a mixed stretch for this chart', low: 'a demanding stretch for this chart' };

  // Sade Sati: transiting Saturn in the 12th, 1st or 2nd sign from the natal Moon
  function sadeSati(chart, now) {
    const tr = VA.transit(chart, 'Saturn', VA.timeOf(now));
    const fromMoon = ((tr.sign - chart.planets.Moon.signIdx + 12) % 12) + 1;
    return { ...tr, fromMoon, active: [12, 1, 2].includes(fromMoon),
      phase: { 12: '12th (rising phase)', 1: '1st (peak phase)', 2: '2nd (setting phase)' }[fromMoon] };
  }

  /* One reading. id is fixed per slot; key is the outcome it states, so two charts
   * agree on a reading when the keys match. pct/label are omitted for plain facts,
   * whose percentage is the stability figure alone. tone = good | warn | bad.
   * notes = the chart reasoning, shown under "Why" so the text itself stays plain. */
  const item = (id, key, text, pct, label, factors, tone, notes) => ({ id, key: String(key), text, pct, label, factors, tone, notes });
  const toneOf = (kind, pct) => ({ high: 'good', mid: 'warn', low: 'bad' })[band(kind, pct)];

  function build(chart, dasha, now) {
    const P = chart.planets, S = VA.analyse(chart).strength;
    const asc = chart.ascendant.sign, lagnaLord = VA.SIGN_LORD[chart.lagnaSign];
    const sections = [];
    const sec = (icon, title, items, note) => sections.push({ icon, title, items, note });
    const strengthFactor = (p) => Object.entries(S[p].parts).map(([k, v]) =>
      ({ label: `${p} ${k} bala: ${v.toFixed(1)} of ${VA.STRENGTH_MAX[k]} virupas`, pct: v / VA.STRENGTH_MAX[k] * 100 }));

    sec('🧭', 'Who you are (Lagna + Moon + Sun)', [
      item('lagna', asc, `**${asc} rising.** ${LAGNA[asc]}`, VA.strengthOf(chart, lagnaLord), 'expression', strengthFactor(lagnaLord), toneOf('planet', VA.strengthOf(chart, lagnaLord))),
      item('moon', P.Moon.sign, `**Moon in ${P.Moon.sign}**: emotionally, ${MOON[P.Moon.sign]}`, S.Moon.pct, 'expression', strengthFactor('Moon'), toneOf('planet', S.Moon.pct)),
      item('sun', P.Sun.sign, `**Sun in ${P.Sun.sign}** is the core you're growing into: your will and your sense of self.`, S.Sun.pct, 'expression', strengthFactor('Sun'), toneOf('planet', S.Sun.pct)),
    ], '“Expression” is the strength of the planet behind the trait: the stronger it is, the more plainly the trait shows.');

    if (dasha) {
      const md = dasha.current.md.lord, ad = dasha.current.ad.lord;
      const fmt = (ms) => new Date(ms).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      const ps = VA.periodScore(chart, md, ad), t = VA.timeOf(now);
      const items = [item('dasha', `${md}-${ad}-${band('period', ps.pct)}`,
        `You are in ${DASHA_NATURE[md]} The sub-period is **${ad}** (until ${fmt(dasha.current.ad.endMs)}), ${PERIOD_TEXT[band('period', ps.pct)]}.`,
        ps.pct, 'favourable', ps.factors, toneOf('period', ps.pct))];
      for (const p of ['Saturn', 'Jupiter']) {
        const tr = VA.transit(chart, p, t);
        items.push(item('transit-' + p, `${tr.sign}-${tr.bindus}`,
          `**${p} is transiting ${sign(tr.sign)}**, where your chart gives it ${tr.bindus} of 8 Ashtakavarga bindus, ${tr.bindus >= 5 ? 'a helpful' : tr.bindus === 4 ? 'a neutral-to-good' : 'an effortful'} transit (4 or more is the classical pass mark).`,
          tr.bindus / 8 * 100, 'supportive', null, tr.bindus >= 5 ? 'good' : tr.bindus === 4 ? 'warn' : 'bad'));
      }
      sec('⏳', 'The season you are in now', items, 'A dasha is a season, not a sentence. It tilts the odds; you still choose how you walk through it.');

    }

    const mon = (ms) => new Date(ms).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const span = (a, b) => `${mon(a)} to ${mon(b)}`;
    sec('🏠', 'Life areas', VA.LIFE_EVENTS.map((e) => {
      const h = e.house, hs = VA.houseScore(chart, h, [e.karaka]), K = P[e.karaka];
      const link = LINK[e.key](THROUGH[hs.lordHouse]), sb = band('area', hs.pct);
      // plain text: what it means; notes: the chart facts behind it
      const plain = [link[0].toUpperCase() + link.slice(1) + '.'];
      const why = [`Your ${VA.ordinal(h)} lord, ${hs.lord}, sits in your ${VA.ordinal(hs.lordHouse)} house, which links this area with ${THROUGH[hs.lordHouse]}.`];
      if ([6, 8, 12].includes(hs.lordHouse)) { plain.push('Expect some delay, distance or extra effort first.'); why.push('The 6th, 8th and 12th are hard houses for a lord.'); }
      else if (hs.lordHouse === h) why.push('The lord sits in its own house, which keeps this area steady.');
      if (sb === 'high') plain.push('Your chart backs it well.');
      if (sb === 'low') plain.push('It may take more effort than usual.');
      const what = why;
      const here = VA.PLANETS.filter((p) => P[p].house === h);
      here.forEach((p) => what.push(`${p} in the ${VA.ordinal(h)} brings ${IN_HOUSE[p]}.`));
      const looks = Object.keys(LOOKS).filter((p) => !here.includes(p) && VA.aspects(chart, p, h));
      if (looks.length) what.push(looks.map((p) => `${p} aspects it: ${LOOKS[p]}.`).join(' '));
      const kState = [K.dignity && K.dignity.toLowerCase(), K.retro && 'retrograde', K.combust && 'combust'].filter(Boolean);
      what.push(`${e.karaka}, its natural significator, is ${KARAKA_WORD[band('planet', S[e.karaka].pct)]}${kState.length ? ` (${kState.join(', ')})` : ''}.`);
      what.push(`Overall support in your chart: ${Math.round(hs.pct)}%, ${SUPPORT_WORD[sb]}.`);
      const support = hs.factors.map((f) => ({ ...f, label: 'Support: ' + f.label }));

      const r = dasha && now ? VA.eventTiming(chart, dasha, e, now) : { periods: [] };
      if (!r.periods.length) {
        const when = dasha ? `The usual age window (${e.ages[0]} to ${e.ages[1]}) is behind you, so no period is singled out.` : '';
        return item('area-' + e.key, `${hs.lordHouse}-${sb}`, `**${e.name}.** ${when}\n${plain.join(' ')}`,
          hs.pct, 'support', support, toneOf('area', hs.pct), what);
      }
      const [best, next] = r.ranked;
      const when = `Most likely **${span(best.startMs, best.endMs)}**`
        // a peak covering most of the period adds nothing, so only name a narrower one
        + `${best.peak && best.peak.to - best.peak.from < 0.7 * (best.endMs - best.startMs) ? `, strongest ${span(best.peak.from, best.peak.to)}` : ''}.`
        + `${next ? ` Next most likely ${span(next.startMs, next.endMs)} (${Math.round(next.share)}%).` : ''}`;
      what.unshift(`The most likely window is the ${best.md}–${best.ad} period: ${best.md} main period, ${best.ad} sub-period.`);
      return item('area-' + e.key, `${best.md}-${best.ad}-${hs.lordHouse}`, `**${e.name}.** ${when}\n${plain.join(' ')}`,
        best.share, 'chance in this window', [
          { label: `${best.md}, main period lord: tie to the ${VA.ordinal(h)} house and ${e.karaka}`, pct: best.tieMd * 100, w: 40 },
          { label: `${best.ad}, sub-period lord: tie to the ${VA.ordinal(h)} house and ${e.karaka}`, pct: best.tieAd * 100, w: 60 },
          { label: `Months with Jupiter and Saturn both on the ${VA.ordinal(h)} house or its lord: ${best.double} of ${best.months}`, pct: best.double / best.months * 100 },
          { label: `Share of all timing signal from today to ${mon(r.end)}`, pct: best.share },
          ...support,
        ], undefined, what);
    }), '**Chance** is the share of the classical timing signal that falls in that period, counting from today to the end of the usual age window (at most 20 years ahead), assuming it has not happened yet. It comes from the dasha lords tied to the house, Jupiter and Saturn transiting it together, and how common the event is at each age. **Support** is how strongly the chart backs the area as a whole. Every period is listed on the Timing tab.');

    const mang = VA.manglik(chart), flagged = mang.references.filter((r) => r.manglik).length;
    sec('🔥', 'Mangal (Manglik) status', [item('manglik', mang.isManglik,
      mang.isManglik
        ? `You carry a Mangal-dosha signature: Mars falls in a sensitive house from ${mang.flaggedFrom.join(' and ')} (${flagged} of the 3 reference charts flag it).${mang.marsDignity === 'Debilitated' ? ' Your Mars is debilitated, which softens it a lot.' : ''} It mostly matters for matching, and most forms are mild or cancellable.`
        : `You are non-Manglik: Mars sits clear of the sensitive houses from Lagna and Moon${flagged ? ' (only the secondary Venus chart flags it)' : ''}.`,
      (mang.isManglik ? flagged : 3 - flagged) / 3 * 100, mang.isManglik ? 'dosha strength' : 'clear', null, mang.isManglik ? 'warn' : 'good')]);

    if (now) {
      const ss = sadeSati(chart, now);
      sec('🪐', 'Sade Sati (Saturn over your Moon)', [ss.active
        ? item('sadesati', ss.fromMoon, `You are in Sade Sati: transiting Saturn is in ${sign(ss.sign)}, the ${ss.phase} from your Moon. Saturn holds ${ss.bindus} of 8 bindus there, so the pressure is ${ss.bindus >= 4 ? 'on the lighter side' : 'on the heavier side'}. A maturing ~2.5-year stretch per sign: go steady, rest, and don't make fear-based decisions.`,
          (8 - ss.bindus) / 8 * 100, 'pressure', null, ss.bindus >= 4 ? 'warn' : 'bad')
        : item('sadesati', 'off', `You are not in Sade Sati: transiting Saturn is in ${sign(ss.sign)}, the ${VA.ordinal(ss.fromMoon)} from your Moon.`, undefined, undefined, null, 'good')]);
    }

    const ranked = VA.SEVEN.slice().sort((a, b) => S[b].pct - S[a].pct);
    const state = (p) => [P[p].dignity && P[p].dignity.toLowerCase(), P[p].retro && 'retrograde', P[p].combust && 'combust (close to the Sun)'].filter(Boolean).join(', ');
    const GIFT_TEXT = { high: 'a genuine natural strength', mid: 'dependable, though not effortless', low: 'built through effort, not ease' };
    const planetItem = (id, p, rank) => item(id, p,
      `**${p}** in ${P[p].sign}${state(p) ? ` (${state(p)})` : ''} is your ${rank} planet. It governs ${PLANET_GIFT[p]}: ${GIFT_TEXT[band('planet', S[p].pct)]}.`,
      S[p].pct, 'strength', strengthFactor(p), toneOf('planet', S[p].pct));
    sec('⚖️', 'Your natural strengths & growth edges', [
      planetItem('strong1', ranked[0], 'strongest'), planetItem('strong2', ranked[1], 'second-strongest'),
      planetItem('weak2', ranked[5], 'second-weakest'), planetItem('weak1', ranked[6], 'weakest'),
    ]);

    sec('🕊️', 'How to read the percentages', [], 'They are arithmetic, not prophecy. **Expression / support / strength / favourable** say how strongly the classical indicators line up in this chart: planet strength in virupas, Ashtakavarga bindus, house lordship and placement. Open “Why” under any reading to see the sum. **Birth-time stable** is the share of birth times inside your ± window that give the same reading. Neither is a measured chance of anything happening; nobody has that data. Use it as a map of tailwinds and headwinds, then drive.');

    return sections;
  }

  /* Full reading for a birth input, with stability under ± uncMin minutes of birth-time
   * error: re-cast the chart at 21 evenly spaced times across the window (uniform error
   * model) and count how often each reading comes out the same. */
  function readings(input, now, uncMin) {
    const cast = (inp) => {
      const chart = VA.computeChart(inp), dasha = VA.vimshottari(chart, now);
      return { chart, dasha, sections: build(chart, dasha, now) };
    };
    const base = cast(input), items = base.sections.flatMap((s) => s.items);
    const N = uncMin > 0 ? 20 : 0, same = {};
    for (let k = 0; k <= N; k++) {
      const off = N ? Math.round(uncMin * 60 * (2 * k / N - 1)) : 0;
      const keys = off === 0 ? items : cast({ ...input, second: (input.second || 0) + off }).sections.flatMap((s) => s.items);
      const byId = Object.fromEntries(keys.map((i) => [i.id, i.key]));
      for (const i of items) if (byId[i.id] === i.key) same[i.id] = (same[i.id] || 0) + 1;
    }
    for (const i of items) i.stable = same[i.id] / (N + 1) * 100;
    return base;
  }

  Object.assign(VA, { buildPredictions: build, readings, sadeSati, scoreTone: toneOf });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
