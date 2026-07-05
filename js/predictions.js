/* predictions.js — rule-based readings written in a plain, honest, warm voice.
 * Nothing here is fate. A chart is a map of tendencies and seasons; you still
 * drive. The wording deliberately keeps that front and centre. */
(function (root) {
  const VA = (root.VA = root.VA || {});

  const LAGNA = {
    Aries: 'You lead from the front. Direct, restless, quick to start — your challenge is finishing what you begin and not burning hot when things stall.',
    Taurus: 'Steady and grounded. You want security, comfort and things that last. You move slowly, but once you commit you hold on. Stubbornness is the shadow side.',
    Gemini: 'A quick, curious mind that lives in words and ideas. You adapt easily and talk your way through life — but scattered focus is the thing to watch.',
    Cancer: 'You feel everything deeply and protect the people you love. Home and belonging matter more to you than status. Moods run strong; guard your soft heart.',
    Leo: 'Warm, proud, made to be seen. You lead with heart and want to matter. When respected you give generously; when ignored the ego stings.',
    Virgo: 'Sharp, practical, detail-minded. You fix and improve everything, including yourself — sometimes too harshly. Learn to let "good enough" be enough.',
    Libra: 'You seek balance, fairness and harmony, and you read people well. Relationships are central to your life. The catch: deciding, and not losing yourself to keep the peace.',
    Scorpio: 'Intense, private, all-or-nothing. You feel in extremes and keep your real self hidden until you trust. Powerful when focused; the shadow is control and grudges.',
    Sagittarius: 'Free, honest, forever seeking meaning. You need room to roam — in mind or map. Optimistic and blunt; watch the restlessness and the over-promising.',
    Capricorn: 'Serious, patient, built for the long climb. You mature early and carry responsibility young. Success comes late but solid — just don\'t let duty crowd out joy.',
    Aquarius: 'Independent and different by design. You think ahead of your time and care about the bigger picture more than the crowd. Warmth can hide behind the detachment.',
    Pisces: 'Gentle, imaginative, deeply feeling. You absorb the world and dream past it. Compassion is your gift; boundaries and staying grounded are the lifelong work.',
  };

  const MOON = {
    Aries: 'emotionally quick and hot — you react fast, forgive fast, and need action to feel okay.',
    Taurus: 'you calm down through comfort, routine and touch; you need to feel safe before you open (Moon is exalted here — a naturally steady heart).',
    Gemini: 'your feelings live in your head; you talk to process, and need mental stimulation to feel alive.',
    Cancer: 'deeply feeling and nurturing; home and mother-figures shape you strongly (Moon\'s own sign — emotionally rich).',
    Leo: 'you need to be seen and appreciated; your heart is warm and proud, and coldness wounds you most.',
    Virgo: 'you soothe yourself by fixing and ordering things; you worry, and you show love through usefulness.',
    Libra: 'you need harmony and a partner to feel whole; conflict unsettles you, and you weigh everything twice.',
    Scorpio: 'you feel in extremes and hide the depth; old wounds run deep here (Moon is debilitated — the heart carries more weight and needs healing).',
    Sagittarius: 'you need freedom and meaning to feel content; you\'re hopeful, restless, and honest to a fault.',
    Capricorn: 'you keep feelings controlled and private; you learned early to be strong, sometimes too early.',
    Aquarius: 'you feel best with space and cannot be caged; you care widely but guard the personal.',
    Pisces: 'you feel the whole world and dream past it; tender, intuitive, and in need of quiet to refill.',
  };

  const DASHA_NATURE = {
    Sun: 'a Sun chapter — about identity, standing on your own, recognition and health. You\'re meant to step forward and be seen; ego and authority-figures are the friction.',
    Moon: 'a Moon chapter — softer, emotional, about home, mother, comfort and the inner life. Good for peace and connection; moods can swing.',
    Mars: 'a Mars chapter — high energy, drive and courage. Great for building and fighting for things, but temper, haste and conflict need a leash.',
    Mercury: 'a Mercury chapter — mind, skill, communication, business and learning. A clever, busy, wordy season; keep the nerves and overthinking in check.',
    Jupiter: 'a Jupiter chapter — the kindest season. Growth, wisdom, luck, teachers, marriage and children. Doors open; just don\'t get complacent.',
    Venus: 'a Venus chapter — love, marriage, beauty, comfort and pleasure. One of the sweetest periods for relationships and the good things of life.',
    Saturn: 'a Saturn chapter — the strict teacher who makes you earn everything. It can feel heavy, slow, even lonely, but nothing built now is fragile. What you earn here, you keep.',
    Rahu: 'a Rahu chapter — hunger, ambition, the unusual and the foreign. Sudden rises and strange turns; exciting but can pull you off-centre if you chase illusions.',
    Ketu: 'a Ketu chapter — letting go, turning inward, spirituality and quiet loss. Worldly things can feel flat; it\'s a season for meaning, not gain.',
  };

  const sign = (i) => VA.SIGNS[i];
  const wrap = (icon, title, paras) => ({ icon, title, paras: paras.filter(Boolean) });

  function build(chart, dasha, now) {
    const P = chart.planets;
    const sections = [];
    const asc = chart.ascendant.sign;

    sections.push(wrap('🧭', 'Who you are (Lagna + Moon)', [
      LAGNA[asc],
      `Your Moon in ${P.Moon.sign} means emotionally, ${MOON[P.Moon.sign]}`,
      `And your Sun in ${P.Sun.sign} is the core you\'re growing into — your will and your sense of self.`,
    ]));

    // Current life phase from dasha
    if (dasha) {
      const md = dasha.current.md.lord, ad = dasha.current.ad.lord;
      const fmt = (ms) => new Date(ms).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      sections.push(wrap('⏳', 'The season you are in now', [
        `You are in ${DASHA_NATURE[md]}`,
        `Inside it, the sub-period is ${ad} (until ${fmt(dasha.current.ad.endMs)}) — so ${md} sets the weather, and ${ad} colours these particular months.`,
        `Remember: a dasha is a *season*, not a sentence. It tilts the odds; you still choose how you walk through it.`,
      ]));
    }

    // Marriage / relationships — 7th house, Venus, Jupiter (wife significator for a man)
    const seventhSign = chart.houses[6];
    const seventhLordName = VA.SIGN_LORD[seventhSign];
    const seventhOccupants = VA.PLANETS.filter((p) => P[p].house === 7);
    sections.push(wrap('💍', 'Love & marriage', [
      `Your 7th house — partnership — is ${sign(seventhSign)}, ruled by ${seventhLordName}. That colours the kind of partner and married life you\'re drawn to.`,
      seventhOccupants.length
        ? `Sitting in that house: ${seventhOccupants.join(', ')} — ${seventhOccupants.includes('Saturn') ? 'a serious, loyal, sometimes delayed union.' : seventhOccupants.includes('Venus') ? 'love, charm and comfort in partnership.' : seventhOccupants.includes('Mars') ? 'passion and heat — mind the friction.' : 'a strong influence on your marriage.'}`
        : 'No planet sits in the 7th, which is common and fine — the house lord and Venus/Jupiter carry the story.',
      `Venus (love, for everyone) is in ${P.Venus.sign}${P.Venus.dignity ? ' [' + P.Venus.dignity + ']' : ''}, and Jupiter (for a man, the wife-significator) is in ${P.Jupiter.sign}${P.Jupiter.dignity ? ' [' + P.Jupiter.dignity + ']' : ''}. Between them they sketch who fits you.`,
      `None of this names a person. It describes what feels like home to you — so you recognise it when you meet it.`,
    ]));

    // Manglik
    const mang = VA.manglik(chart);
    sections.push(wrap('🔥', 'Mangal (Manglik) status', [
      mang.isManglik
        ? `You carry a Mangal-dosha signature — Mars falls in a sensitive spot from ${mang.flaggedFrom.join(' and ')}.${mang.marsDignity === 'Debilitated' ? ' But your Mars is debilitated (weak), which softens it a lot.' : mang.marsDignity === 'Exalted' ? ' Your Mars is strong here.' : ''} It mostly matters for matching, and most forms are mild or cancellable.`
        : 'You are non-Manglik — Mars sits clear of the sensitive houses. One less thing for families to worry about.',
    ]));

    // Sade Sati (transit Saturn vs natal Moon)
    if (now) {
      const t = VA.makeTime(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 0);
      const satSign = Math.floor(VA.siderealLon('Saturn', t) / 30);
      const fromMoon = ((satSign - P.Moon.signIdx + 12) % 12) + 1;
      const inSadeSati = [12, 1, 2].includes(fromMoon);
      sections.push(wrap('🪐', 'Sade Sati (Saturn over your Moon)', [
        inSadeSati
          ? `You are currently in Sade Sati — transiting Saturn is in ${sign(satSign)}, the ${fromMoon === 12 ? '12th (rising phase)' : fromMoon === 1 ? '1st (peak phase)' : '2nd (setting phase)'} from your Moon. It\'s a maturing, pressure-filled ~2.5-year stretch. Heavy, but it builds real strength — go steady, rest, and don\'t make fear-based decisions.`
          : `You are not in Sade Sati right now — transiting Saturn is in ${sign(satSign)}, the ${VA.ordinal(fromMoon)} from your Moon. Saturn\'s hardest pass on your mind is not active.`,
      ]));
    }

    // Strengths & things to work with
    const strengths = [], caution = [];
    for (const p of VA.PLANETS) {
      if (P[p].dignity === 'Exalted' || P[p].dignity === 'Own sign') strengths.push(`${p} is ${P[p].dignity.toLowerCase()} in ${P[p].sign} — a genuine strength.`);
      if (P[p].dignity === 'Debilitated') caution.push(`${p} is debilitated in ${P[p].sign} — an area you grow through effort, not ease.`);
      if (P[p].combust) caution.push(`${p} is combust (too close to the Sun) — its voice can get drowned out; give it conscious attention.`);
    }
    sections.push(wrap('⚖️', 'Your natural strengths & growth edges', [
      strengths.length ? '**Strengths:** ' + strengths.join(' ') : '**Strengths:** your strength is spread evenly rather than concentrated in one planet.',
      caution.length ? '**Grow through:** ' + caution.join(' ') : '**Grow through:** no planet is badly placed — a balanced chart.',
    ]));

    sections.push(wrap('🕊️', 'One honest note', [
      'This is a map of tendencies and seasons, not a script of what must happen. It is very good at describing *you* and the *weather*; it is not the boss of your choices. Read it, use the timing, and then drive it yourself.',
    ]));

    return sections;
  }

  Object.assign(VA, { buildPredictions: build });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
