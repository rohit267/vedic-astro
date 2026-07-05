/* app.js — UI wiring: forms, tabs, rendering, matching, saved profiles. */
(function () {
  const VA = window.VA;
  const $ = (id) => document.getElementById(id);
  const mdBold = (s) => String(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const fmtMY = (ms) => new Date(ms).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
  const fmtDeg = (d) => `${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}'`;

  let chart1 = null, dasha1 = null;
  let curVarga = 'ALL', curStyle = 'north';
  const NOW = new Date();

  /* ---------- input ---------- */
  function readPerson(pre) {
    const [y, mo, d] = $(pre + '-date').value.split('-').map(Number);
    const [hh, mm] = $(pre + '-time').value.split(':').map(Number);
    return {
      name: $(pre + '-name').value.trim(),
      year: y, month: mo, day: d, hour: hh, minute: mm,
      lat: parseFloat($(pre + '-lat').value), lon: parseFloat($(pre + '-lon').value),
      tz: parseFloat($(pre + '-tz').value),
    };
  }
  function setupAutocomplete(pre) {
    const input = $(pre + '-place'), list = $(pre + '-place-list');
    let items = [], active = -1;
    const close = () => { list.classList.remove('open'); list.innerHTML = ''; items = []; active = -1; };
    const apply = (c) => {
      input.value = c.name;
      $(pre + '-lat').value = c.lat; $(pre + '-lon').value = c.lon; $(pre + '-tz').value = 5.5;
      close();
    };
    const paint = () => list.querySelectorAll('.ac-item').forEach((el, i) => el.classList.toggle('active', i === active));
    const render = () => {
      const q = input.value.trim().toLowerCase();
      items = q ? VA.CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8) : [];
      if (!items.length) return close();
      active = -1;
      list.innerHTML = items.map((c, i) => `<div class="ac-item" data-i="${i}">${c.name}</div>`).join('');
      list.classList.add('open');
      list.querySelectorAll('.ac-item').forEach((el) =>
        el.addEventListener('mousedown', (e) => { e.preventDefault(); apply(items[+el.dataset.i]); }));
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', (e) => {
      if (!list.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); apply(items[active]); }
      else if (e.key === 'Escape') { close(); }
    });
  }

  /* ---------- KUNDALI ---------- */
  function renderKundali() {
    const c = chart1, P = c.planets;
    const cur = dasha1.current;
    const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
    let html = `<div class="summary-row">
      ${stat('Lagna', `${c.ascendant.sign} ${fmtDeg(c.ascendant.signDeg)}`)}
      ${stat('Moon (Rashi)', `${P.Moon.sign} · ${P.Moon.nakshatra}-${P.Moon.pada}`)}
      ${stat('Sun', `${P.Sun.sign}`)}
      ${stat('Now running', `${cur.md.lord} › ${cur.ad.lord}`)}
      ${stat('Ayanamsa', `${c.ayanamsa.toFixed(2)}° Lahiri`)}
    </div>`;
    html += `<div class="card"><table class="grid"><thead><tr>
      <th>Planet</th><th>Sign</th><th>Degree</th><th>Nakshatra (Pada)</th><th>House</th><th>State</th></tr></thead><tbody>`;
    for (const p of VA.PLANETS) {
      const pl = P[p];
      const tags = [];
      if (pl.dignity === 'Exalted') tags.push('<span class="pill ex">Exalted</span>');
      if (pl.dignity === 'Debilitated') tags.push('<span class="pill de">Debilitated</span>');
      if (pl.dignity === 'Own sign') tags.push('<span class="pill own">Own</span>');
      if (pl.retro) tags.push('<span class="pill retro">Retro</span>');
      if (pl.combust) tags.push('<span class="pill comb">Combust</span>');
      html += `<tr><td><b>${p}</b></td><td>${pl.sign}</td><td>${fmtDeg(pl.signDeg)}</td>
        <td>${pl.nakshatra} (${pl.pada})</td><td>${pl.house}</td><td>${tags.join(' ') || '—'}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    html += manglikPanel(c);
    $('tab-kundali').innerHTML = html;
  }

  function manglikPanel(chart) {
    const m = VA.manglik(chart);
    const rows = m.references.map((r) => {
      let st;
      if (r.manglik) st = `<span class="pill de">Manglik · ${VA.ordinal(r.house)}</span>`;
      else if (r.conjunct) st = `Mars conjunct <span class="pill own">1st</span> <span class="hint">(conjunction — not a dosha)</span>`;
      else st = `<span class="pill ex">clear · ${VA.ordinal(r.house)}</span>`;
      return `<tr><td><b>${r.label}</b>${r.primary ? '' : ' <span class="hint">(secondary)</span>'}</td><td>${st}</td></tr>`;
    }).join('');
    const verdict = m.isManglik
      ? `Manglik${m.marsDignity === 'Debilitated' ? ' — but Mars is debilitated (weak), so it is mild' : ''}`
      : 'Non-Manglik';
    return `<div class="card"><h3>🔥 Mangal (Manglik) status — Lagna · Chandra · Shukra</h3>
      <table class="grid"><thead><tr><th>Reference chart</th><th>Mars position</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="dosha-note" style="border-left:3px solid var(--${m.isManglik ? 'warn' : 'good'})">
      <b>Overall: ${verdict}.</b> The standard verdict is read from Lagna &amp; Chandra (Moon); Shukra (Venus) is a secondary reference, and Mars conjunct Venus is not counted as a dosha.</div></div>`;
  }

  /* ---------- CHARTS (reference + D1–D9) ---------- */
  const CHART_KEYS = ['LAGNA', 'CHANDRA', 'SHUKRA', 'D2', 'D3', 'D4', 'D7', 'D9'];
  const CHART_LABEL = { ALL: 'All', LAGNA: 'Lagna', CHANDRA: 'Chandra', SHUKRA: 'Shukra', D2: 'D2', D3: 'D3', D4: 'D4', D7: 'D7', D9: 'D9' };
  function renderVargaSeg() {
    const seg = $('varga-seg');
    seg.innerHTML = ['ALL', ...CHART_KEYS].map((k) =>
      `<button data-varga="${k}" class="${k === curVarga ? 'active' : ''}">${CHART_LABEL[k] || k}</button>`).join('');
    seg.querySelectorAll('button').forEach((b) => b.onclick = () => { curVarga = b.dataset.varga; renderVargaSeg(); renderCharts(); });
  }
  function chartBox(key) {
    const box = document.createElement('div'); box.className = 'chart-box';
    box.innerHTML = `<h4>${VA.chartName(key)}</h4><div class="cbody"></div>`;
    VA.renderChart(box.querySelector('.cbody'), chart1, key, curStyle);
    return box;
  }
  function renderCharts() {
    const area = $('charts-area'); area.innerHTML = '';
    const keys = curVarga === 'ALL' ? CHART_KEYS : [curVarga];
    keys.forEach((k) => area.appendChild(chartBox(k)));
  }

  /* ---------- DASHA ---------- */
  function dashaRow(p, isNow) {
    return `<div class="dasha-row ${isNow ? 'now' : ''}"><span class="lord">${p.lord}</span>
      <span class="dates">${fmtMY(p.startMs)} → ${fmtMY(p.endMs)}</span>
      <span>${p.years.toFixed(1)} yr${isNow ? ' • now' : ''}</span></div>`;
  }
  function renderDasha() {
    const d = dasha1, cur = d.current;
    let html = `<div class="card"><h3>Where you are now</h3>
      <p>Mahadasha <b>${cur.md.lord}</b> → Antardasha <b>${cur.ad.lord}</b> → Pratyantar <b>${cur.pd.lord}</b><br/>
      <span class="hint">${cur.md.lord} sets the weather until ${fmtMY(cur.md.endMs)}; ${cur.ad.lord} colours these months (until ${fmtMY(cur.ad.endMs)}).</span></p></div>`;
    html += `<div class="card"><h3>Mahadasha timeline</h3><div class="dasha-list">`;
    d.maha.forEach((md) => { html += dashaRow(md, md === cur.md); });
    html += `</div>`;
    html += `<h3 style="margin-top:16px">Antardashas inside ${cur.md.lord}</h3><div class="sub-list">`;
    cur.md.antar.forEach((ad) => { html += dashaRow(ad, ad === cur.ad); });
    html += `</div>`;
    if (cur.ad.pratyantar) {
      html += `<h3 style="margin-top:16px">Pratyantar inside ${cur.ad.lord}</h3><div class="sub-list">`;
      cur.ad.pratyantar.forEach((pd) => { html += dashaRow(pd, pd === cur.pd); });
      html += `</div>`;
    }
    html += `</div>`;
    $('tab-dasha').innerHTML = html;
  }

  /* ---------- TIMING (good / bad) ---------- */
  const TONE = { Jupiter: ['good', 'expansive & lucky'], Venus: ['good', 'sweet & comfortable'],
    Mercury: ['good', 'busy, clever, communicative'], Moon: ['good', 'gentle & emotional'],
    Sun: ['warn', 'about identity & recognition'], Saturn: ['warn', 'heavy but strengthening'],
    Mars: ['warn', 'high energy, watch temper'], Rahu: ['warn', 'ambitious & unpredictable'],
    Ketu: ['warn', 'inward, detaching, low worldly gain'] };
  function renderTiming() {
    const c = chart1, P = c.planets;
    // Sade Sati
    const t = VA.makeTime(NOW.getUTCFullYear(), NOW.getUTCMonth() + 1, NOW.getUTCDate(), NOW.getUTCHours(), NOW.getUTCMinutes(), 0);
    const satSign = Math.floor(VA.siderealLon('Saturn', t) / 30);
    const fromMoon = ((satSign - P.Moon.signIdx + 12) % 12) + 1;
    const inSS = [12, 1, 2].includes(fromMoon);
    const mang = VA.manglik(c);

    let html = `<div class="card"><h3>Your current season</h3>`;
    const [tone, desc] = TONE[dasha1.current.md.lord];
    html += `<p>You are in a <b>${dasha1.current.md.lord}</b> Mahadasha — ${desc} — with <b>${dasha1.current.ad.lord}</b> running inside it (${desc && TONE[dasha1.current.ad.lord][1]}).</p>`;
    html += `<div class="dosha-note" style="border-left:3px solid var(--${inSS ? 'warn' : 'good'})">
      <b>Sade Sati:</b> ${inSS ? `Active — Saturn is in ${VA.SIGNS[satSign]}, the ${fromMoon === 12 ? '12th (rising)' : fromMoon === 1 ? '1st (peak)' : '2nd (setting)'} from your Moon. A heavy but maturing ~2.5-year stretch; go steady.` : `Not active right now — Saturn is in ${VA.SIGNS[satSign]}, the ${VA.ordinal(fromMoon)} from your Moon.`}</div>`;
    html += `<div class="dosha-note" style="border-left:3px solid var(--${mang.isManglik ? 'warn' : 'good'})">
      <b>Manglik:</b> ${mang.isManglik ? `Yes — flagged from ${mang.flaggedFrom.join(', ')}.${mang.marsDignity === 'Debilitated' ? ' Mars is debilitated (weak), which softens it.' : ''}` : 'No — Mars is clear of the sensitive houses.'}</div>`;
    html += `</div>`;

    // Upcoming antardashas across current + next maha, with tone
    html += `<div class="card"><h3>Periods ahead — the flavour of each</h3><div class="dasha-list">`;
    const upcoming = [];
    const idx = dasha1.maha.indexOf(dasha1.current.md);
    [dasha1.maha[idx], dasha1.maha[idx + 1]].filter(Boolean).forEach((md) => {
      md.antar.forEach((ad) => { if (ad.endMs > NOW.getTime()) upcoming.push({ md: md.lord, ad }); });
    });
    upcoming.slice(0, 10).forEach(({ md, ad }) => {
      const [tn, ds] = TONE[ad.lord];
      html += `<div class="dasha-row" style="border-left:3px solid var(--${tn})">
        <span class="lord">${md}–${ad.lord}</span>
        <span class="dates">${fmtMY(ad.startMs)} → ${fmtMY(ad.endMs)}</span>
        <span style="color:var(--${tn})">${ds}</span></div>`;
    });
    html += `</div><p class="hint">“Good” and “heavy” are tendencies, not guarantees. A Saturn stretch builds things that last; a Venus stretch is pleasant but you still have to show up.</p></div>`;
    $('tab-timing').innerHTML = html;
  }

  /* ---------- READINGS ---------- */
  function renderReading() {
    const secs = VA.buildPredictions(chart1, dasha1, NOW);
    $('tab-reading').innerHTML = secs.map((s) =>
      `<div class="reading-sec"><h3>${s.icon} ${s.title}</h3>${s.paras.map((p) => `<p>${mdBold(p)}</p>`).join('')}</div>`).join('');
  }

  /* ---------- MATCHING ---------- */
  function renderMatch() {
    const inp2 = readPerson('p2');
    if (!inp2.year || isNaN(inp2.lat)) { $('match-result').innerHTML = '<p class="empty">Enter the second person\'s details.</p>'; return; }
    const c2 = VA.computeChart(inp2);
    const m = VA.gunaMilan(chart1.planets.Moon, c2.planets.Moon);
    const n1 = (readPerson('p1').name || 'Person 1'), n2 = (inp2.name || 'Person 2');
    const eff = m.doshas.nadiCancellable ? m.totalWithNadiCancel : m.total;
    const verdictText = eff >= 18
      ? 'On paper this clears the usual family threshold. But paper isn\'t the marriage — meeting and talking is.'
      : 'On paper this is on the lower side. That doesn\'t doom anything — a low score often just means two Moon-signs that differ, and cancellable doshas. The real test is how you actually feel together.';

    let html = `<div class="verdict card">
      <div class="score">${m.total}<span class="of"> / 36</span></div>
      <p>${n1} (${chart1.planets.Moon.sign}/${chart1.planets.Moon.nakshatra}) × ${n2} (${c2.planets.Moon.sign}/${c2.planets.Moon.nakshatra})</p>
      ${m.doshas.nadiCancellable ? `<p class="hint">Nadi dosha looks cancellable → effective ~${m.totalWithNadiCancel}/36</p>` : ''}
    </div>`;
    html += `<div class="card"><table class="grid koota-table"><thead><tr><th>Koota</th><th>Score</th><th>What it covers</th></tr></thead><tbody>`;
    m.kootas.forEach((k) => {
      const cls = k.got === 0 ? 'b' : (k.got >= k.max * 0.75 ? 'g' : '');
      html += `<tr><td><b>${k.name}</b></td><td class="${cls}">${k.got} / ${k.max}</td><td>${k.note}</td></tr>`;
    });
    html += `<tr><td><b>Total</b></td><td><b>${m.total} / 36</b></td><td></td></tr></tbody></table></div>`;

    // doshas
    const mA = VA.manglik(chart1), mB = VA.manglik(c2);
    html += `<div class="card"><h3>Doshas</h3>`;
    html += `<div class="dosha-note">${m.doshas.bhakoot ? '⚠️ <b>Bhakoot dosha</b> present (2/12, 5/9 or 6/8 between Moons) — a family/longevity caution.' : '✅ <b>Bhakoot</b> clean — good for family harmony & longevity.'}</div>`;
    html += `<div class="dosha-note">${m.doshas.nadi ? (m.doshas.nadiCancellable ? '⚠️ <b>Nadi dosha</b> (same nadi) — but <b>cancellable</b> here (different nakshatra, sign & star-lord).' : '⚠️ <b>Nadi dosha</b> (same nadi) — not clearly cancellable; ask a senior astrologer.') : '✅ <b>Nadi</b> clean.'}</div>`;
    html += `<div class="dosha-note"><b>Manglik:</b> ${n1} — ${mA.isManglik ? 'yes' + (mA.marsDignity === 'Debilitated' ? ' (weak Mars)' : '') : 'no'}; ${n2} — ${mB.isManglik ? 'yes' + (mB.marsDignity === 'Debilitated' ? ' (weak Mars)' : '') : 'no'}. ${mA.isManglik === mB.isManglik ? (mA.isManglik ? 'Both Manglik — that mutually cancels.' : 'Neither Manglik — clean.') : 'One is Manglik and the other isn\'t — the classic point families raise; a debilitated/weak Mars makes it mild.'}</div>`;
    html += `</div>`;
    html += `<div class="card"><h3>Honest read</h3><p>${verdictText}</p></div>`;
    $('match-result').innerHTML = html;
  }

  /* ---------- profiles ---------- */
  const PKEY = 'va-profiles';
  function loadProfilesList() {
    const list = JSON.parse(localStorage.getItem(PKEY) || '[]');
    $('load-profile').innerHTML = '<option value="">Load saved…</option>' +
      list.map((p, i) => `<option value="${i}">${p.label}</option>`).join('');
  }
  function saveProfile() {
    const list = JSON.parse(localStorage.getItem(PKEY) || '[]');
    const label = ($('p1-name').value.trim() || $('p1-place').value.trim() || 'Profile') + ' · ' + $('p1-date').value;
    list.push({ label, name: $('p1-name').value, date: $('p1-date').value, time: $('p1-time').value,
      place: $('p1-place').value, lat: $('p1-lat').value, lon: $('p1-lon').value, tz: $('p1-tz').value });
    localStorage.setItem(PKEY, JSON.stringify(list)); loadProfilesList();
  }
  function applyProfile(i) {
    const p = JSON.parse(localStorage.getItem(PKEY) || '[]')[i]; if (!p) return;
    $('p1-name').value = p.name; $('p1-date').value = p.date; $('p1-time').value = p.time;
    $('p1-place').value = p.place; $('p1-lat').value = p.lat; $('p1-lon').value = p.lon; $('p1-tz').value = p.tz;
    calc();
  }

  /* ---------- main ---------- */
  function calc() {
    try {
      chart1 = VA.computeChart(readPerson('p1'));
      dasha1 = VA.vimshottari(chart1, NOW);
      renderKundali(); renderCharts(); renderDasha(); renderTiming(); renderReading();
    } catch (e) {
      $('tab-kundali').innerHTML = `<p class="empty">Could not compute: ${e.message}. Check the date/time/place.</p>`;
      console.error(e);
    }
  }

  function init() {
    setupAutocomplete('p1'); setupAutocomplete('p2');
    renderVargaSeg();
    $('calc-btn').onclick = calc;
    $('match-btn').onclick = renderMatch;
    $('save-btn').onclick = saveProfile;
    $('load-profile').onchange = (e) => { if (e.target.value !== '') applyProfile(+e.target.value); };
    loadProfilesList();
    // tabs
    document.querySelectorAll('#tabs button').forEach((b) => b.onclick = () => {
      document.querySelectorAll('#tabs button').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); $('tab-' + b.dataset.tab).classList.add('active');
    });
    // style seg
    $('style-seg').querySelectorAll('button').forEach((b) => b.onclick = () => {
      $('style-seg').querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); curStyle = b.dataset.style; renderCharts();
    });
    calc();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
