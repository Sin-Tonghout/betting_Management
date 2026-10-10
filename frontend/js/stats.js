(function () {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const tr = (key, fallback) => {
    try {
      const v = window.I18n && window.I18n.t ? window.I18n.t(key) : key;
      return v && v !== key ? v : fallback;
    } catch (e) { return fallback; }
  };

  const plain = (n) => '$' + (Number(n) || 0).toFixed(2);
  const signed = (n) => {
    const v = Number(n) || 0;
    const s = '$' + Math.abs(v).toFixed(2);
    return v < 0 ? '-' + s : v > 0 ? '+' + s : s;
  };
  const pct = (n) => (Number(n) || 0).toFixed(1) + '%';
  const axisNum = (t) => (Math.abs(t) >= 1000 ? t / 1000 + 'k' : String(t));

  const $ = (sel) => document.querySelector(sel);
  const slot = (name) => document.querySelector(`[data-st="${name}"]`);

  const P = { l: 48, r: 12, t: 12, b: 30 };
  let data = null;
  let reqId = 0;
  let current = { range: '30d', from: '', to: '' };
  let lastWidth = 0;

  /* ---------- helpers ---------- */

  function widthOf(el) { return Math.max(280, Math.floor(el.clientWidth || 640)); }
  function heightFor(W) { return W < 480 ? 220 : 260; }

  function niceScale(min, max) {
    if (min === max) max = min + 1;
    const raw = (max - min) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    return { lo, hi, ticks };
  }

  function empty(el) {
    el.innerHTML = `<div class="st-empty">${esc(tr('stats.empty', 'No data for this period.'))}</div>`;
  }

  function gridLines(sc, y, W) {
    return sc.ticks.map((t) =>
      `<line class="st-gl" x1="${P.l}" x2="${W - P.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>` +
      `<text class="st-axis" x="${P.l - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${axisNum(t)}</text>`
    ).join('');
  }

  function applyWidths(el) {
    el.querySelectorAll('[data-w]').forEach((n) => { n.style.width = n.dataset.w + '%'; });
  }

  /* ---------- charts ---------- */

  function lineChart(el, daily) {
    if (!daily.length) return empty(el);
    const W = widthOf(el), H = heightFor(W);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;

    let c = 0;
    const pts = daily.map((d) => {
      c = Math.round((c + d.profit) * 100) / 100;
      return { date: d.date, day: d.profit, v: c };
    });

    const sc = niceScale(Math.min(0, ...pts.map((p) => p.v)), Math.max(0, ...pts.map((p) => p.v)));
    const y = (v) => P.t + ih - ((v - sc.lo) / (sc.hi - sc.lo)) * ih;
    const x = (i) => (pts.length === 1 ? P.l + iw / 2 : P.l + (i * iw) / (pts.length - 1));
    const k = pts[pts.length - 1].v < 0 ? 'neg' : 'pos';

    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const last = pts.length - 1;
    const area = `${path} L${x(last).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

    const dotClass = pts.length <= 45 ? 'st-dot' : 'st-hit';
    const dots = pts.map((p, i) =>
      `<circle class="${dotClass} st-dot-${p.day < 0 ? 'neg' : 'pos'}" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${pts.length <= 45 ? 3.5 : 6}">` +
      `<title>${esc(p.date)} — ${esc(tr('stats.cumulative', 'Total'))}: ${signed(p.v)} (${signed(p.day)})</title></circle>`
    ).join('');

    const idx = [0, Math.floor(last / 2), last].filter((v, i, a) => a.indexOf(v) === i);
    const labels = idx.map((i) =>
      `<text class="st-axis" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 && last > 0 ? 'start' : i === last && last > 0 ? 'end' : 'middle'}">${esc(pts[i].date.slice(5))}</text>`
    ).join('');

    el.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr('stats.chart.profit', 'Profit over time'))}">` +
      gridLines(sc, y, W) +
      `<line class="st-zero" x1="${P.l}" x2="${W - P.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>` +
      `<path class="st-area-${k}" d="${area}"/>` +
      `<path class="st-line-${k}" d="${path}"/>` +
      dots + labels + `</svg>`;
  }

  function vBars(el, items, opts = {}) {
    if (!items.length) return empty(el);
    const W = widthOf(el), H = heightFor(W);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const values = items.map((i) => i.value);
    const sc = niceScale(Math.min(0, ...values), Math.max(0, ...values));
    const y = (v) => P.t + ih - ((v - sc.lo) / (sc.hi - sc.lo)) * ih;

    const band = iw / items.length;
    const bw = Math.max(4, Math.min(44, band * 0.62));
    const every = Math.ceil(items.length / Math.max(1, Math.floor(iw / 56)));
    const fmtVal = opts.fmt || ((v) => String(v));

    const bars = items.map((it, i) => {
      const cx = P.l + band * i + band / 2;
      const y0 = y(0), y1 = y(it.value);
      const cls = opts.neutral ? 'st-info' : it.value < 0 ? 'st-neg' : 'st-pos';
      return `<rect class="st-rect ${cls}" x="${(cx - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y1 - y0)).toFixed(1)}" rx="3">` +
        `<title>${esc(it.label)}: ${esc(fmtVal(it.value))}</title></rect>`;
    }).join('');

    const labels = items.map((it, i) =>
      i % every === 0
        ? `<text class="st-axis" x="${(P.l + band * i + band / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(String(it.short ?? it.label).slice(0, 10))}</text>`
        : ''
    ).join('');

    el.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">` +
      gridLines(sc, y, W) +
      `<line class="st-zero" x1="${P.l}" x2="${W - P.r}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>` +
      bars + labels + `</svg>`;
  }

  function rowsList(el, rows, withSportAccent) {
    if (!rows.length) return empty(el);
    const max = Math.max(...rows.map((r) => r.bets), 1);
    el.innerHTML = `<ul class="st-rows">` + rows.map((r) => `
      <li class="st-row">
        <div class="st-row-head">
          <span class="st-row-name">${esc(r.name)}</span>
          <span class="st-row-profit ${r.profit < 0 ? 'st-text-neg' : 'st-text-pos'}">${signed(r.profit)}</span>
        </div>
        <div class="st-meter"><span class="${withSportAccent && r.slug ? 'st-sport-' + esc(r.slug) : 'st-info'}" data-w="${((r.bets / max) * 100).toFixed(1)}"></span></div>
        <div class="st-row-meta">${r.bets} ${esc(tr('stats.bets', 'bets'))} · ${esc(tr('stats.winRate', 'Win Rate'))} ${pct(r.winRate)} · ${r.won} ${esc(tr('stats.won', 'won'))} / ${r.lost} ${esc(tr('stats.lost', 'lost'))}</div>
      </li>`).join('') + `</ul>`;
    applyWidths(el);
  }

  function donut(el, s) {
    const total = s.won + s.lost + s.pending + s.void;
    if (!total) return empty(el);
    const C = 2 * Math.PI * 54;
    const segs = [
      ['won', 'st-seg-won', tr('stats.won', 'Won')],
      ['lost', 'st-seg-lost', tr('stats.lost', 'Lost')],
      ['pending', 'st-seg-pending', tr('stats.pending', 'Pending')],
      ['void', 'st-seg-void', tr('stats.void', 'Void')],
    ];
    let offset = 0;
    const arcs = segs.filter(([k]) => s[k] > 0).map(([k, cls, label]) => {
      const len = (s[k] / total) * C;
      const out = `<circle class="st-seg ${cls}" cx="70" cy="70" r="54" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(label)}: ${s[k]}</title></circle>`;
      offset += len;
      return out;
    }).join('');

    const legend = segs.map(([k, cls, label]) => `
      <li><span class="st-swatch ${cls}"></span><span>${esc(label)}</span>
      <strong>${s[k]}</strong><span class="st-muted">${pct((s[k] / total) * 100)}</span></li>`).join('');

    el.innerHTML = `
      <div class="st-donut">
        <svg viewBox="0 0 140 140" role="img" aria-label="${esc(tr('stats.chart.winLoss', 'Win / Loss / Pending'))}">
          <g transform="rotate(-90 70 70)">${arcs}</g>
          <text class="st-donut-num" x="70" y="68" text-anchor="middle">${pct(s.winRate)}</text>
          <text class="st-axis" x="70" y="86" text-anchor="middle">${esc(tr('stats.winRate', 'Win Rate'))}</text>
        </svg>
        <ul class="st-legend">${legend}</ul>
      </div>`;
  }

  function compare(el, s) {
    if (!s.bets) return empty(el);
    const max = Math.max(s.stake, s.returned, Math.abs(s.profit), 1);
    const row = (label, value, text, cls) => `
      <li class="st-row">
        <div class="st-row-head"><span class="st-row-name">${esc(label)}</span><span class="st-row-profit">${text}</span></div>
        <div class="st-meter"><span class="${cls}" data-w="${((Math.abs(value) / max) * 100).toFixed(1)}"></span></div>
      </li>`;
    el.innerHTML = `<ul class="st-rows">` +
      row(tr('stats.stake', 'Total Stake'), s.stake, plain(s.stake), 'st-info') +
      row(tr('stats.returned', 'Total Return'), s.returned, plain(s.returned), 'st-pos') +
      row(tr('stats.profit', 'Profit / Loss'), s.profit, signed(s.profit), s.profit < 0 ? 'st-neg' : 'st-pos') +
      `</ul>`;
    applyWidths(el);
  }

  /* ---------- render ---------- */

  function renderSummary(s) {
    $('#st-bets').textContent = s.bets;
    $('#st-bets-sub').textContent = `${s.won} ${tr('stats.won', 'won')} · ${s.lost} ${tr('stats.lost', 'lost')} · ${s.pending} ${tr('stats.pending', 'pending')}`;
    $('#st-winrate').textContent = pct(s.winRate);
    $('#st-winrate-sub').textContent = `${tr('stats.avgOdds', 'Avg odds')} ${s.avgOdds.toFixed(2)}`;
    $('#st-stake').textContent = plain(s.stake);
    $('#st-stake-sub').textContent = `${tr('stats.returned', 'Total Return')} ${plain(s.returned)}`;

    const pEl = $('#st-profit');
    pEl.textContent = signed(s.profit);
    pEl.classList.toggle('st-text-pos', s.profit > 0);
    pEl.classList.toggle('st-text-neg', s.profit < 0);
    $('#st-profit-sub').textContent = `ROI ${s.roi > 0 ? '+' : ''}${s.roi.toFixed(1)}%`;
  }

  function renderCharts() {
    if (!data) return;
    const oddsLabels = { b1: '≤1.50', b2: '1.51–2.00', b3: '2.01–3.00', b4: '3.01+' };

    lineChart(slot('profit'), data.daily);
    donut(slot('winloss'), data.summary);
    compare(slot('compare'), data.summary);

    vBars(slot('stake'),
      data.daily.map((d) => ({ label: d.date, short: d.date.slice(5), value: d.stake })),
      { neutral: true, fmt: plain, label: tr('stats.chart.stake', 'Stake over time') });

    vBars(slot('monthly'),
      data.monthly.map((m) => ({ label: m.month, value: m.profit })),
      { fmt: signed, label: tr('stats.chart.monthly', 'Monthly performance') });

    rowsList(slot('sport'), data.sport, true);
    rowsList(slot('league'), data.league, false);
    rowsList(slot('bettype'), data.betType, false);

    vBars(slot('odds'),
      data.odds.map((o) => ({ label: oddsLabels[o.bucket], value: o.bets })),
      { neutral: true, fmt: (v) => v + ' ' + tr('stats.bets', 'bets'), label: tr('stats.chart.odds', 'Odds distribution') });

    lastWidth = widthOf(slot('profit'));
  }

  function render() {
    if (!data) return;
    renderSummary(data.summary);
    renderCharts();
  }

  /* ---------- loading ---------- */

  async function load() {
    const id = ++reqId;
    const body = $('#st-body');
    const errBox = $('#st-error');
    body.setAttribute('aria-busy', 'true');
    body.classList.add('is-loading');
    errBox.classList.add('d-none');

    const qs = new URLSearchParams({ range: current.range });
    if (current.range === 'custom') { qs.set('from', current.from); qs.set('to', current.to); }

    try {
      const res = await fetch('/api/statistics?' + qs.toString(), { credentials: 'same-origin' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Request failed');
      if (id !== reqId) return; // a newer request replaced this one
      data = json.data;
      render();
    } catch (err) {
      if (id !== reqId) return;
      errBox.classList.remove('d-none');
    } finally {
      if (id === reqId) {
        body.removeAttribute('aria-busy');
        body.classList.remove('is-loading');
      }
    }
  }

  /* ---------- filters ---------- */

  function setPressed(range) {
    document.querySelectorAll('.st-chip').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.range === range)));
  }

  document.querySelector('.st-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.st-chip');
    if (!btn) return;
    const range = btn.dataset.range;
    setPressed(range);

    if (range === 'custom') {
      $('#st-custom').classList.remove('d-none');
      return; // wait for Apply
    }
    $('#st-custom').classList.add('d-none');
    current = { range, from: '', to: '' };
    load();
  });

  $('#st-apply').addEventListener('click', () => {
    const from = $('#st-from').value;
    const to = $('#st-to').value;
    const err = $('#st-custom-error');
    if (!from || !to || from > to) {
      err.textContent = tr('stats.dateError', 'Choose a valid start and end date.');
      err.classList.remove('d-none');
      return;
    }
    err.classList.add('d-none');
    current = { range: 'custom', from, to };
    load();
  });

  $('#st-retry').addEventListener('click', load);

  // Redraw charts when the width changes or the language changes
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (data && widthOf(slot('profit')) !== lastWidth) renderCharts();
    }, 200);
  });
  document.addEventListener('i18n:change', render);

  load();
})();