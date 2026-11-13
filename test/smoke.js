global.Astronomy = require('../vendor/astronomy.browser.min.js');
['ephemeris','panchang','kundali','dasha','matching','strength','predictions','charts','cities'].forEach(m=>require('../js/'+m+'.js'));
const VA = globalThis.VA;
const NOW = new Date(Date.UTC(2026,6,5));

// Demo defaults shipped in the page
const c1 = VA.computeChart({year:1947,month:8,day:15,hour:0,minute:0,lat:28.6139,lon:77.2090,tz:5.5});
const d1 = VA.vimshottari(c1, NOW);
console.log('Independence chart: Lagna', c1.ascendant.sign, '| Moon', c1.planets.Moon.sign, c1.planets.Moon.nakshatra, '| MD', d1.current.md.lord,'>',d1.current.ad.lord);

// Predictions
const secs = VA.buildPredictions(c1, d1, NOW);
console.log('Predictions sections:', secs.length, '| first title:', secs[0].title, '| items:', secs[0].items.length);
console.log('  Sade Sati line present:', secs.some(s=>s.title.includes('Sade Sati')));

// Cities
console.log('Cities loaded:', VA.CITIES.length, '| has Dhanbad:', VA.CITIES.some(c=>c.name.includes('Dhanbad')));

// All vargas x all styles render to SVG without error
let bad=0;
for (const key of Object.keys(VA.VARGAS)) {
  const data = VA.vargaData(c1, key);
  for (const style of ['north','south','east']) {
    const svg = VA.chartSVG(data, style);
    if (!svg.startsWith('<svg') || !svg.includes('</svg>')) { bad++; console.log('  BAD svg', key, style); }
  }
}
console.log('Varga×style SVGs:', Object.keys(VA.VARGAS).length*3, 'rendered, bad:', bad);

// Matching (Rohit x Leo/Magha and x P.Phalguni for regression)
const rohit = VA.computeChart({year:1998,month:7,day:31,hour:23,minute:45,lat:23.7957,lon:86.4304,tz:5.5});
const g = VA.computeChart({year:2004,month:7,day:20,hour:21,minute:30,lat:23.7957,lon:86.4304,tz:5.5});
const m = VA.gunaMilan(rohit.planets.Moon, g.planets.Moon);
console.log('Match Rohit×Magha/Leo:', m.total, '/36  (expect 12.5)', m.total===12.5?'OK':'FAIL', '| nadiCancellable:', m.doshas.nadiCancellable);
console.log('Manglik girl(2004):', VA.manglik(g).isManglik, '| marsDignity:', VA.manglik(g).marsDignity);
console.log('\nALL SMOKE CHECKS DONE');
