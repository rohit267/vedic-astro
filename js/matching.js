/* matching.js — Ashtakoota Guna Milan (36 points) + Bhakoot/Nadi/Manglik doshas.
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
   * Lagna and Chandra (Moon) — the two primary references. Shukra (Venus) is a
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

  Object.assign(VA, { gunaMilan, manglik });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
