/* charts.js — SVG chart renderers in three regional styles.
 * North: house-based diamond (fixed houses, signs rotate).
 * South: sign-based square grid (fixed signs, lagna marked).
 * East:  sign-based diamond (fixed signs, lagna marked).
 * All three take the same {lagnaSign, occupants[signIdx]=[planetShort...]} data,
 * so they render D1 or any varga identically. */
(function (root) {
  const VA = (root.VA = root.VA || {});
  const W = 320;
  const SS = VA.SIGN_SHORT || ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="vc-line"/>`;
  function cell(x, y, label, planets, isLagna) {
    let s = '';
    if (label) s += `<text x="${x}" y="${y - 6}" class="vc-sign${isLagna ? ' vc-lagna' : ''}" text-anchor="middle">${esc(label)}${isLagna ? ' ⟵La' : ''}</text>`;
    const per = 3;
    planets.forEach((p, i) => {
      const col = i % per, rowN = Math.floor(i / per);
      const px = x + (col - (Math.min(planets.length, per) - 1) / 2) * 22;
      const py = y + 12 + rowN * 15;
      s += `<text x="${px}" y="${py}" class="vc-planet" text-anchor="middle">${esc(p)}</text>`;
    });
    return s;
  }

  // North Indian — fixed house anchors (fraction of W)
  const NORTH = [
    [.50, .25], [.25, .10], [.10, .25], [.25, .50], [.10, .75], [.25, .90],
    [.50, .75], [.75, .90], [.90, .75], [.75, .50], [.90, .25], [.75, .10],
  ];
  function north(data) {
    let s = `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" class="vc-frame"/>`;
    s += line(0, 0, W, W) + line(W, 0, 0, W);
    s += line(W / 2, 0, W, W / 2) + line(W, W / 2, W / 2, W) + line(W / 2, W, 0, W / 2) + line(0, W / 2, W / 2, 0);
    for (let h = 0; h < 12; h++) {
      const signIdx = (data.lagnaSign + h) % 12;
      const [fx, fy] = NORTH[h];
      s += cell(fx * W, fy * W, String(signIdx + 1), data.occupants[signIdx], h === 0);
    }
    return s;
  }

  // South Indian — fixed sign grid (col,row)
  const SOUTH_POS = {
    0: [1, 0], 1: [2, 0], 2: [3, 0], 3: [3, 1], 4: [3, 2], 5: [3, 3],
    6: [2, 3], 7: [1, 3], 8: [0, 3], 9: [0, 2], 10: [0, 1], 11: [0, 0],
  };
  function south(data) {
    const q = W / 4;
    let s = `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" class="vc-frame"/>`;
    for (let i = 1; i < 4; i++) { s += line(i * q, 0, i * q, W) + line(0, i * q, W, i * q); }
    // blank the centre 2x2
    s += `<rect x="${q}" y="${q}" width="${2 * q}" height="${2 * q}" class="vc-center"/>`;
    for (let sign = 0; sign < 12; sign++) {
      const [c, r] = SOUTH_POS[sign];
      const isLagna = sign === data.lagnaSign;
      if (isLagna) s += `<line x1="${c * q}" y1="${r * q}" x2="${c * q + 18}" y2="${r * q + 18}" class="vc-line"/>`;
      s += cell(c * q + q / 2, r * q + 14, SS[sign], data.occupants[sign], isLagna);
    }
    return s;
  }

  // East — sign-fixed diamond (Aries top, clockwise), lagna marked
  const EAST_SIGN_AT = [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // anchor idx -> sign
  function east(data) {
    let s = `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" class="vc-frame"/>`;
    s += line(0, 0, W, W) + line(W, 0, 0, W);
    s += line(W / 2, 0, W, W / 2) + line(W, W / 2, W / 2, W) + line(W / 2, W, 0, W / 2) + line(0, W / 2, W / 2, 0);
    for (let a = 0; a < 12; a++) {
      const sign = EAST_SIGN_AT[a];
      const [fx, fy] = NORTH[a];
      s += cell(fx * W, fy * W, SS[sign], data.occupants[sign], sign === data.lagnaSign);
    }
    return s;
  }

  // West India (Maharashtra/Gujarat) traditionally uses the North diamond format.
  const RENDERERS = { north, south, east, west: north };
  const REF_CHARTS = { LAGNA: 'Lagna / Rashi (D1)', CHANDRA: 'Chandra (Moon) chart', SHUKRA: 'Shukra (Venus) chart' };

  function svg(inner) {
    return `<svg viewBox="0 0 ${W} ${W}" class="vc-svg" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  // Build renderer data from a natal chart (D1) or a varga chart
  function d1Data(chart) {
    const occ = Array.from({ length: 12 }, () => []);
    for (const p of VA.PLANETS) {
      const pl = chart.planets[p];
      occ[pl.signIdx].push(pl.short + (pl.retro ? '↩' : '') + (pl.combust ? '·' : ''));
    }
    return { lagnaSign: chart.lagnaSign, occupants: occ };
  }
  function vargaData(chart, key) {
    if (key === 'D1') return d1Data(chart);
    const v = VA.vargaChart(chart, key);
    const occ = v.occupants.map((arr) => arr.map((p) => VA.PLANET_SHORT[p]));
    return { lagnaSign: v.lagnaSign, occupants: occ };
  }

  // Reference charts: same natal (D1) positions, but read with Moon/Venus as the 1st house.
  function chartData(chart, key) {
    if (key in REF_CHARTS) {
      const base = d1Data(chart);
      let lagnaSign = chart.lagnaSign;
      if (key === 'CHANDRA') lagnaSign = chart.planets.Moon.signIdx;
      else if (key === 'SHUKRA') lagnaSign = chart.planets.Venus.signIdx;
      return { lagnaSign, occupants: base.occupants };
    }
    return vargaData(chart, key);
  }
  function chartName(key) { return REF_CHARTS[key] || (VA.VARGAS[key] && VA.VARGAS[key].name) || key; }

  function render(container, chart, key, style) {
    container.innerHTML = svg(RENDERERS[style](chartData(chart, key)));
  }

  Object.assign(VA, {
    renderChart: render, chartSVG: (data, style) => svg(RENDERERS[style](data)),
    vargaData, chartData, chartName, REF_CHARTS,
  });
  root.VA = VA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
