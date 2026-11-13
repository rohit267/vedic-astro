/* matching.js: Ashtakoota Guna Milan (36 points) + Bhakoot/Nadi/Manglik doshas.
 * Ported verbatim from the Python engine cross-checked in conversation
 * (Magha/Leo → 12.5, Purva Phalguni/Leo → 24.5). */
(function (root) {
  const VA = (root.VA = root.VA || {});

  const VARNA_RANK = { 3: 4, 7: 4, 11: 4, 0: 3, 4: 3, 8: 3, 1: 2, 5: 2, 9: 2, 2: 1, 6: 1, 10: 1 };
  const VG = { 2: 0, 5: 0, 6: 0, 10: 0, 8: 0, 4: 1, 0: 2, 1: 2, 3: 3, 11: 3, 9: 3, 7: 4 };
  const VM = [[2, 1, 1, 1, .5], [0, 2, 1, 1, 1], [1, 1, 2, 1, 1], [1, 1, 1, 2, 1], [1, 0, 1, 1, 2]];
  const YANI = { 0: 0, 23: 0, 1: 1, 26: 1, 2: 2, 7: 2, 3: 3, 4: 3, 5: 4, 18: 4, 6: 5, 8: 5, 9: 6, 10: 6, 11: 7, 25: 7, 12: 8, 14: 8, 13: 9, 15: 9, 16: 10, 17: 10, 19: 11, 21: 11, 20: 12, 22: 13, 24: 13 };
  const ANIMAL = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
  const YM = [
    [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1], [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
    [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1], [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
    [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1], [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
    [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 1, 2, 1, 2], [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
    [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 2], [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 2, 1, 1, 2],
    [1, 2, 2, 2, 0, 3, 1, 3, 2, 2, 4, 2, 2, 1], [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
    [2, 2, 3, 0, 1, 2, 1, 2, 2, 1, 2, 3, 4, 2], [1, 0, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 2, 4]];
  const LORD = { 0: 'Ma', 7: 'Ma', 1: 'Ve', 6: 'Ve', 2: 'Me', 5: 'Me', 3: 'Mo', 4: 'Su', 8: 'Ju', 11: 'Ju', 9: 'Sa', 10: 'Sa' };
  const LORD_FULL = { Su: 'Sun', Mo: 'Moon', Ma: 'Mars', Me: 'Mercury', Ju: 'Jupiter', Ve: 'Venus', Sa: 'Saturn' };
  const FR = {
    Su: { f: ['Mo', 'Ma', 'Ju'], e: ['Ve', 'Sa'] }, Mo: { f: ['Su', 'Me'], e: [] },
    Ma: { f: ['Su', 'Mo', 'Ju'], e: ['Me'] }, Me: { f: ['Su', 'Ve'], e: ['Mo'] },
    Ju: { f: ['Su', 'Mo', 'Ma'], e: ['Me', 'Ve'] }, Ve: { f: ['Me', 'Sa'], e: ['Su', 'Mo'] },
    Sa: { f: ['Me', 'Ve'], e: ['Su', 'Mo', 'Ma'] },
  };
  const DEVA = new Set([0, 4, 6, 7, 12, 14, 16, 21, 26]);
  const RAK = new Set([2, 8, 9, 13, 15, 17, 18, 22, 23]);
  const GM = [[6, 5, 1], [6, 6, 0], [0, 0, 6]];
  const AADI = new Set([0, 5, 6, 11, 12, 17, 18, 23, 24]);
  const MAD = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25]);

  const rel = (a, b) => FR[a].f.includes(b) ? 'f' : (FR[a].e.includes(b) ? 'e' : 'n');
  const ganaType = (n) => DEVA.has(n) ? 0 : (RAK.has(n) ? 2 : 1);
  const nadiType = (n) => AADI.has(n) ? 0 : (MAD.has(n) ? 1 : 2);
  const NADI_NAME = ['Aadi', 'Madhya', 'Antya'];
  const GANA_NAME = ['Deva', 'Manushya', 'Rakshasa'];

  function tara(gn, bn) {
    const one = (a, z) => { const r = (((z - a) % 27 + 27) % 27 + 1) % 9; return (r === 3 || r === 5 || r === 7) ? 0 : 1.5; };
    return one(gn, bn) + one(bn, gn);
  }

  /* groom, bride: Moon objects with {signIdx, nakIdx, sign, nakshatra} */
  function gunaMilan(groom, bride) {
    const g = groom.signIdx, b = bride.signIdx, gn = groom.nakIdx, bn = bride.nakIdx;

    const varna = VARNA_RANK[g] >= VARNA_RANK[b] ? 1 : 0;
    const vashya = VM[VG[g]][VG[b]];
    const ta = tara(gn, bn);
    const yoni = YM[YANI[gn]][YANI[bn]];

    const lg = LORD[g], lb = LORD[b];
    let maitri;
    if (lg === lb) maitri = 5;
    else {
      const s = { 'f,f': 5, 'f,n': 4, 'n,f': 4, 'n,n': 3, 'f,e': 1, 'e,f': 1, 'n,e': .5, 'e,n': .5, 'e,e': 0 };
      maitri = s[`${rel(lg, lb)},${rel(lb, lg)}`];
    }
    const gana = GM[ganaType(gn)][ganaType(bn)];

    const p1 = ((b - g) % 12 + 12) % 12 + 1, p2 = ((g - b) % 12 + 12) % 12 + 1;
    const bhakootBad = [[2, 12], [12, 2], [6, 8], [8, 6], [5, 9], [9, 5]].some(([x, y]) => x === p2 && y === p1);
    const bhakoot = bhakootBad ? 0 : 7;

    const sameNadi = nadiType(gn) === nadiType(bn);
    const nadi = sameNadi ? 0 : 8;
    // Nadi dosha cancellation: same nadi but different nakshatra, sign, and nakshatra-lord
    const nadiCancel = sameNadi && gn !== bn && g !== b && VA.nakLord(gn) !== VA.nakLord(bn);

    const total = varna + vashya + ta + yoni + maitri + gana + bhakoot + nadi;

    return {
      kootas: [
        { name: 'Varna', got: varna, max: 1, note: 'work/ego temperament' },
        { name: 'Vashya', got: vashya, max: 2, note: 'mutual attraction & control' },
        { name: 'Tara', got: ta, max: 3, note: 'health & fortune' },
        { name: 'Yoni', got: yoni, max: 4, note: `physical nature (${ANIMAL[YANI[gn]]} × ${ANIMAL[YANI[bn]]})` },
        { name: 'Graha Maitri', got: maitri, max: 5, note: `mind & wavelength (${LORD_FULL[lg]} × ${LORD_FULL[lb]})` },
        { name: 'Gana', got: gana, max: 6, note: `temperament (${GANA_NAME[ganaType(gn)]} × ${GANA_NAME[ganaType(bn)]})` },
        { name: 'Bhakoot', got: bhakoot, max: 7, note: `family & longevity (${p2}/${p1})` },
        { name: 'Nadi', got: nadi, max: 8, note: `health & progeny (${NADI_NAME[nadiType(gn)]} × ${NADI_NAME[nadiType(bn)]})` },
      ],
      total,
      totalWithNadiCancel: nadiCancel ? total + 8 : total,
      doshas: {
        bhakoot: bhakoot === 0,
        nadi: sameNadi,
        nadiCancellable: nadiCancel,
      },
    };
  }

  /* Manglik / Mangal dosha. The standard verdict (and DrikPanchang's) is taken from
   * Lagna and Chandra (Moon), the two primary references. Shukra (Venus) is a
   * secondary/regional reference. Mars in the SAME sign as the reference planet
   * (1st house = a conjunction) is not counted as a dosha in the standard verdict,
   * which is why Mars-conjunct-Venus does not make someone Manglik. */
  function manglik(chart) {
    const MH = new Set([1, 2, 4, 7, 8, 12]);
    const mars = chart.planets.Mars.signIdx;
    const houseFrom = (refSignIdx) => ((mars - refSignIdx + 12) % 12) + 1;
    const defs = [
      { key: 'Lagna', label: 'Lagna (Ascendant)', signIdx: chart.lagnaSign, primary: true },
      { key: 'Chandra', label: 'Chandra (Moon)', signIdx: chart.planets.Moon.signIdx, primary: true },
      { key: 'Shukra', label: 'Shukra (Venus)', signIdx: chart.planets.Venus.signIdx, primary: false },
    ];
    const references = defs.map((r) => {
      const house = houseFrom(r.signIdx);
      const conjunct = house === 1;                 // Mars in the same sign as the reference
      return { key: r.key, label: r.label, house, primary: r.primary, conjunct,
        manglik: MH.has(house) && !(conjunct && !r.primary) };  // conjunction w/ Venus not counted
    });
    const primaryFlags = references.filter((r) => r.primary && r.manglik);
    return {
      references,
      isManglik: primaryFlags.length > 0,
      flaggedFrom: primaryFlags.map((r) => `${r.key} (${VA.ordinal(r.house)})`),
      marsSign: chart.planets.Mars.sign,
      marsDignity: chart.planets.Mars.dignity,      // debilitated/weak Mars softens the dosha
    };
  }

  /* ---- Full match report: the 36 points, both Manglik statuses with the classical
   * cancellations, an overall %, and plain-word areas. Penalty sizes are judgement calls. ---- */
  const AREA_TEXT = {
    harmony: { name: 'Day-to-day harmony',
      high: 'You think alike and settle into an easy rhythm; small frictions fade fast.',
      mid: 'You get along with some give and take. Talk before things pile up.',
      low: 'Your temperaments pull in different directions; without patience, small things turn into fights.' },
    attraction: { name: 'Attraction and intimacy',
      high: 'There is a strong pull toward each other, and physical closeness comes naturally.',
      mid: 'Attraction is there, but it needs keeping alive with time together.',
      low: 'The physical spark is weak on paper; affection will need conscious effort from both.' },
    family: { name: 'Family, money and a shared future',
      high: 'Good for building a home and money together; you lift each other\'s luck.',
      mid: 'A workable base for family and money, with a few bumps on the way.',
      low: 'Family life and money together are where this match strains: expect disagreements over priorities.' },
    health: { name: 'Health and children',
      high: 'No red flag for health or children.',
      mid: 'The classical red flag for health and children (same Nadi) shows up, but the usual cancellation applies, so it is mild.',
      low: 'The classical red flag for health and children (same Nadi) is present and not cancelled. Families usually take advice on this one.' },
    peace: { name: 'Peace versus fights',
      high: 'Low risk of big fights: the Mars factor is balanced between you.',
      mid: 'Some heat between you. Arguments can flare, so learn to cool off before talking.',
      low: 'High risk of clashes: one of you carries a strong Mars dosha that the other does not, the classic warning for marriage.' },
  };

  /* ---- Every koota in words: what each person is, and what that pairing means ---- */
  const VARNA_NAME = { 4: 'Brahmin (the thinker)', 3: 'Kshatriya (the leader)', 2: 'Vaishya (the provider)', 1: 'Shudra (the doer)' };
  const VASHYA_NAME = ['Manav (human)', 'Vanchar (wild)', 'Chatushpada (four-footed)', 'Jalchar (water)', 'Keet (insect)'];
  const GANA_DESC = ['Deva (gentle, giving, soft-spoken)', 'Manushya (practical, worldly, balanced)', 'Rakshasa (intense, blunt, independent)'];
  const NADI_DESC = ['Aadi (airy, quick)', 'Madhya (fiery, driven)', 'Antya (calm, steady)'];
  const GANA_PAIR = {
    '00': 'Both are Deva: two gentle, giving natures, so the home stays peaceful.',
    11: 'Both are Manushya: practical and worldly, wanting the same kind of life.',
    22: 'Both are Rakshasa: two strong, blunt, independent people. You understand each other\'s fire, but both must learn to back down.',
    '01': 'Deva with Manushya blends well: one softens, the other grounds.',
    '02': 'Deva with Rakshasa is the classic temperament clash: one is gentle and yielding, the other intense and blunt. The gentle one gets hurt and the intense one feels held back.',
    12: 'Manushya with Rakshasa: practical meets fierce. Expect a fight for the upper hand and frequent arguments.',
  };
  const BHAKOOT_PAIR = {
    '1/1': 'Same Moon sign: alike in mind and mood.', '7/7': 'Opposite Moon signs: strong mutual attraction and balance.',
    '3/11': 'A 3/11 placement: friendship, effort and gains together.', '4/10': 'A 4/10 placement: home and career support each other.',
    '2/12': 'A 2/12 placement (Dwirdwadash): money tends to drain, and one gives more than the other.',
    '5/9': 'A 5/9 placement (Navapancham): classically a worry over children and a slow drifting apart.',
    '6/8': 'A 6/8 placement (Shadashtak): the hardest one, pointing to health trouble, quarrels and distance.',
  };
  const BY_SCORE = {
    Vashya: { 2: 'A natural hold on each other: attraction, with neither dominating.', 1: 'Some pull, with one of you tending to lead.',
      0.5: 'A weak pull: staying close takes effort.', 0: 'No natural hold on each other: expect power struggles.' },
    Tara: { 3: 'Each one\'s birth star is lucky for the other: you support each other\'s health and fortune.',
      1.5: 'The star luck runs one way: one of you gains more from the match than the other.',
      0: 'Neither birth star helps the other: watch health and luck as a couple.' },
    Yoni: { 4: 'The same animal: instinctive ease and a strong physical match.', 3: 'Friendly animals: a good physical and instinctive fit.',
      2: 'Neutral animals: an ordinary fit that grows with familiarity.', 1: 'Unfriendly animals: your instincts rub each other the wrong way at times.',
      0: 'Natural enemies in the animal scheme: the strongest warning for intimacy, with instinctive dislike.' },
    'Graha Maitri': { 5: 'The same ruler or mutual friends: you think alike and become real friends.',
      4: 'Friendly on one side and neutral on the other: minds meet easily.', 3: 'Neutral to each other: friendship takes time but comes.',
      1: 'Friendly on one side, hostile on the other: one of you gives more understanding than they get.',
      0.5: 'Neutral on one side, hostile on the other: you often misread each other.',
      0: 'Mutual enemies: you see the world differently and misread each other often.' },
  };
  // Rajju: body part each nakshatra belongs to; the same part for both is a dosha
  const RAJJU = ['feet', 'waist', 'navel', 'neck', 'head', 'neck', 'navel', 'waist', 'feet'];
  const RAJJU_RISK = { feet: 'restlessness and living apart', waist: 'money trouble', navel: 'worry over children',
    neck: 'the wife\'s health', head: 'the husband\'s health' };
  const VEDHA = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [4, 13], [4, 22], [13, 22]];

  function kootaWords(groom, bride, guna, n1, n2, cancel) {
    const g = groom.signIdx, b = bride.signIdx, gn = groom.nakIdx, bn = bride.nakIdx;
    const K = Object.fromEntries(guna.kootas.map((k) => [k.name, k]));
    const ga = ganaType(gn), gb = ganaType(bn), pos = ((g - b) % 12 + 12) % 12 + 1, pos2 = ((b - g) % 12 + 12) % 12 + 1;
    const bhKey = [`${pos}/${pos2}`, `${pos2}/${pos}`].find((k) => BHAKOOT_PAIR[k]);
    const who = (x, y) => `${n1} is ${x}; ${n2} is ${y}.`;
    const the = (p) => (p === 'Sun' || p === 'Moon' ? 'the ' + p : p);
    const cancelled = { Gana: cancel.gana, Bhakoot: cancel.bhakoot, Nadi: guna.doshas.nadiCancellable };
    const words = {
      Varna: ['Work and ego', who(VARNA_NAME[VARNA_RANK[g]], VARNA_NAME[VARNA_RANK[b]]),
        K.Varna.got ? `${n1}'s rank is equal or higher, the classical order, so egos sit comfortably.` : `${n2}'s rank is higher than ${n1}'s, a classical sign of friction over who leads.`],
      Vashya: ['Pull and control', who(VASHYA_NAME[VG[g]], VASHYA_NAME[VG[b]]), BY_SCORE.Vashya[K.Vashya.got]],
      Tara: ['Health and luck', '', BY_SCORE.Tara[K.Tara.got]],
      Yoni: ['Physical match', `${n1}'s star animal is the ${ANIMAL[YANI[gn]]}; ${n2}'s is the ${ANIMAL[YANI[bn]]}.`, BY_SCORE.Yoni[K.Yoni.got]],
      'Graha Maitri': ['Mind and friendship', `${n1}'s Moon sign is ruled by ${the(LORD_FULL[LORD[g]])}; ${n2}'s by ${the(LORD_FULL[LORD[b]])}.`, BY_SCORE['Graha Maitri'][K['Graha Maitri'].got]],
      Gana: ['Temperament', who(GANA_DESC[ga], GANA_DESC[gb]), GANA_PAIR[`${Math.min(ga, gb)}${Math.max(ga, gb)}`]
        + (cancel.gana ? ' It is softened here because your Moon-sign rulers are friends.' : '')],
      Bhakoot: ['Family and money', `${n1}'s Moon is in ${groom.sign}; ${n2}'s is in ${bride.sign}.`, (BHAKOOT_PAIR[bhKey] || 'A neutral placement.')
        + (cancel.bhakoot ? ' It is cancelled here because your Moon-sign rulers are friends.' : '')],
      Nadi: ['Health and children', who(NADI_DESC[nadiType(gn)], NADI_DESC[nadiType(bn)]),
        !guna.doshas.nadi ? 'Different constitutions: you complement each other, which is good for health and children.'
          : guna.doshas.nadiCancellable ? 'The same constitution, the classical flag for children\'s health, but it is cancelled here (different star, sign and star lord).'
            : 'The same constitution: the classical flag for the health of children and for vitality. Families usually take advice on this.'],
    };
    return guna.kootas.map((k) => {
      const [topic, people, meaning] = words[k.name], p = k.got / k.max * 100;
      // a cancelled dosha shows amber, not red
      return { name: k.name, topic, got: k.got, max: k.max, pct: p, tone: p >= 70 ? 'good' : p >= 40 || cancelled[k.name] ? 'warn' : 'bad', text: `${people} ${meaning}`.trim() };
    });
  }

  // Four checks from the ten-porutham tradition; person 1 is taken as the groom, person 2 as the bride
  function extraChecks(groom, bride) {
    const gn = groom.nakIdx, bn = bride.nakIdx, count = ((gn - bn + 27) % 27) + 1;   // groom's star counted from the bride's
    const rg = RAJJU[gn % 9], rajju = rg === RAJJU[bn % 9];
    const vedha = VEDHA.some(([x, y]) => (x === gn && y === bn) || (x === bn && y === gn));
    return [
      { name: 'Rajju', bad: rajju, text: rajju ? `Both stars fall in the same Rajju (${rg}): a serious classical flag, linked with ${RAJJU_RISK[rg]}.` : 'Different Rajju: no flag over how long and how safely the marriage runs.' },
      { name: 'Vedha', bad: vedha, text: vedha ? 'Your two stars are a Vedha pair, said to block each other: obstacles and hurt feelings.' : 'No Vedha: your stars do not obstruct each other.' },
      { name: 'Mahendra', good: [4, 7, 10, 13, 16, 19, 22, 25].includes(count), text: [4, 7, 10, 13, 16, 19, 22, 25].includes(count) ? 'Mahendra is present: good for children and long-term wellbeing.' : 'Mahendra is absent, which is neutral.' },
      { name: 'Stree Deergha', good: count >= 13, text: count >= 13 ? 'Stree Deergha is present: prosperity and the wife\'s wellbeing.' : 'Stree Deergha is weak, which is neutral to mildly unfavourable.' },
    ];
  }

  // One person's Mangal dosha in numbers: severity 0..1 after the softeners that apply to them alone
  function manglikDetail(chart, now) {
    const m = manglik(chart), flags = m.references.filter((r) => r.primary && r.manglik).length;
    const age = (now.getTime() - Date.UTC(chart.input.year, chart.input.month - 1, chart.input.day)) / (365.2425 * 86400000);
    const soft = [];
    if (flags === 1) soft.push('it shows from only one of Lagna and Moon');
    if (['Own sign', 'Exalted', 'Debilitated'].includes(m.marsDignity)) soft.push(`Mars is ${m.marsDignity.toLowerCase()}, which takes the edge off`);
    if (m.isManglik && age >= 28) soft.push('it weakens after age 28');
    const severity = !m.isManglik ? 0 : (flags === 2 ? 1 : 0.6) * (['Own sign', 'Exalted', 'Debilitated'].includes(m.marsDignity) ? 0.5 : 1) * (age >= 28 ? 0.6 : 1);
    return { ...m, flags, age, soft, severity };
  }

  function matchReport(c1, c2, now, n1, n2) {
    const g = gunaMilan(c1.planets.Moon, c2.planets.Moon), K = Object.fromEntries(g.kootas.map((k) => [k.name, k]));
    // classical cancellations: Nadi (already in gunaMilan); Bhakoot when the Moon-sign lords are friends
    const friends = K['Graha Maitri'].got >= 4;
    const bhakootCancel = g.doshas.bhakoot && friends, ganaCancel = K.Gana.got <= 1 && friends;
    const effective = g.total + (g.doshas.nadiCancellable ? 8 : 0) + (bhakootCancel ? 7 : 0) + (ganaCancel ? 6 - K.Gana.got : 0);
    const extras = extraChecks(c1.planets.Moon, c2.planets.Moon);
    const extraPenalty = (extras[0].bad ? 6 : 0) + (extras[1].bad ? 4 : 0);   // Rajju, Vedha

    const a = manglikDetail(c1, now), b = manglikDetail(c2, now);
    // a non-Manglik partner with Saturn in the 1st, 4th, 7th, 8th or 12th cancels the other's dosha
    const saturnCancels = (x, other) => !x.isManglik && other.isManglik && [1, 4, 7, 8, 12].includes((x === a ? c1 : c2).planets.Saturn.house);
    const cancelBySaturn = saturnCancels(a, b) || saturnCancels(b, a);
    const mismatch = Math.abs(a.severity - b.severity) * (cancelBySaturn ? 0.4 : 1);
    const state = a.isManglik && b.isManglik ? 'both' : a.isManglik || b.isManglik ? 'one' : 'none';
    const manglikPenalty = Math.round(12 * mismatch);
    const overall = Math.max(0, Math.min(100, effective / 36 * 100 - manglikPenalty - extraPenalty));

    const person = (x, name) => (!x.isManglik ? `${name} is not Manglik.`
      : `${name} is Manglik: Mars is ${x.references.filter((r) => r.primary && r.manglik).map((r) => `${VA.ordinal(r.house)} from the ${r.key === 'Chandra' ? 'Moon' : 'Lagna'}`).join(' and ')}.${x.soft.length ? ' It is softened because ' + x.soft.join(', and ') + '.' : ' It is at full strength.'}`);
    const pair = state === 'none' ? 'Neither of you is Manglik, so there is nothing to balance here.'
      : state === 'both' ? `Both of you are Manglik, which classically cancels out${mismatch > 0.3 ? ', though one side is clearly stronger than the other' : ''}.`
      : cancelBySaturn ? 'Only one of you is Manglik, but the other\'s Saturn sits in a house that classically cancels it.'
      : mismatch <= 0.35 ? 'Only one of you is Manglik, and that dosha is already softened, so the mismatch is mild.'
      : 'Only one of you is Manglik and the dosha is strong: this is the classic warning families act on.';

    const ratio = (...names) => names.reduce((x, k) => x + K[k].got, 0) / names.reduce((x, k) => x + K[k].max, 0) * 100;
    const pcts = {
      harmony: ((ganaCancel ? 6 : K.Gana.got) + K['Graha Maitri'].got) / 11 * 100,
      attraction: ratio('Yoni', 'Vashya'),
      family: ((bhakootCancel ? 7 : K.Bhakoot.got) + K.Tara.got + K.Varna.got) / 11 * 100,
      health: g.doshas.nadi ? (g.doshas.nadiCancellable ? 55 : 0) : 100,
      peace: (0.6 * (1 - mismatch) + 0.4 * (ganaCancel ? 6 : K.Gana.got) / 6) * 100,
    };
    const areas = Object.keys(AREA_TEXT).map((key) => {
      const p = pcts[key], level = p >= 70 ? 'high' : p >= 40 ? 'mid' : 'low';
      return { key, name: AREA_TEXT[key].name, pct: p, level, tone: { high: 'good', mid: 'warn', low: 'bad' }[level], text: AREA_TEXT[key][level] };
    });
    const verdict = overall >= 75 ? 'A strong match on paper.' : overall >= 60 ? 'A good match, with a few things to work on.'
      : overall >= 50 ? 'A workable match: it clears the traditional pass mark of 18 out of 36.' : 'Below the traditional pass mark of 18 out of 36, so it needs a careful look.';
    const kootas = kootaWords(c1.planets.Moon, c2.planets.Moon, g, n1, n2, { gana: ganaCancel, bhakoot: bhakootCancel });
    return { guna: g, effective, bhakootCancel, ganaCancel, overall, verdict, areas, manglikPenalty, kootas, extras, extraPenalty,
      manglik: { a, b, state, mismatch, cancelBySaturn, text: [person(a, n1), person(b, n2), pair] } };
  }

  Object.assign(VA, { gunaMilan, manglik, matchReport });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
