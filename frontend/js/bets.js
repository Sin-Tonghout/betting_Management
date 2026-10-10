(function () {
  const { t, escapeHtml, money, signedMoney, formatDate } = window.Utils;

  const $ = (id) => document.getElementById(id);
  const $results = $('bt-results');
  const $summary = $('bt-summary');
  const $pagination = $('bt-pagination');

  const RESULT_META = {
    won:     { cls: 'won',     icon: 'bi-check-circle-fill', key: 'dash.result.won' },
    lost:    { cls: 'lost',    icon: 'bi-x-circle-fill',     key: 'dash.result.lost' },
    pending: { cls: 'pending', icon: 'bi-hourglass-split',   key: 'dash.result.pending' },
    void:    { cls: 'void',    icon: 'bi-dash-circle',       key: 'dash.result.void' },
  };
  const KNOWN_SPORTS = ['football', 'basketball', 'tennis', 'baseball', 'volleyball'];

  const DEFAULTS = {
    search: '', sport: '', league: '', result: '', betType: '',
    dateFrom: '', dateTo: '', minStake: '', maxStake: '',
    sort: 'date', dir: 'desc', page: 1,
  };
  const FILTER_KEYS = ['search', 'sport', 'league', 'result', 'betType', 'dateFrom', 'dateTo', 'minStake', 'maxStake'];
  const MORE_KEYS = ['league', 'betType', 'dateFrom', 'dateTo', 'minStake', 'maxStake'];

  let state = { ...DEFAULTS };
  let meta = { sports: [], leagues: [], usedLeagues: [], betTypes: [] };
  let lastResponse = null;
  let requestId = 0;
  let pendingDelete = null;

  /* ---------- State <-> URL ---------- */

  function readUrl() {
    const p = new URLSearchParams(window.location.search);
    Object.keys(DEFAULTS).forEach((k) => {
      if (p.has(k)) state[k] = k === 'page' ? Math.max(1, parseInt(p.get(k), 10) || 1) : p.get(k);
    });
  }

  function queryString(includePageSize) {
    const p = new URLSearchParams();
    Object.keys(DEFAULTS).forEach((k) => {
      if (String(state[k]) !== String(DEFAULTS[k])) p.set(k, state[k]);
    });
    if (includePageSize) p.set('pageSize', '10');
    return p.toString();
  }

  function syncUrl() {
    const qs = queryString(false);
    history.replaceState(null, '', `/bets${qs ? `?${qs}` : ''}`);
  }

  const hasFilters = () => FILTER_KEYS.some((k) => state[k] !== '');

  /* ---------- Filter controls ---------- */

  const sportLabel = (s) => {
    const key = `dash.sport.${s.slug}`;
    const label = t(key);
    return label === key ? s.name : label;
  };

  function fillSelect(select, options, selected) {
    select.innerHTML = options.map((o) =>
      `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    select.value = options.some((o) => String(o.value) === String(selected)) ? selected : '';
  }

  function leagueOptions() {
    const sportId = state.sport ? Number(state.sport) : null;
    const names = new Set();
    meta.leagues.forEach((l) => { if (!sportId || l.sportId === sportId) names.add(l.name); });
    meta.usedLeagues.forEach((l) => { if (!sportId || l.sportId === sportId) names.add(l.name); });
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    return [{ value: '', label: t('bet.filters.allLeagues') }, ...sorted.map((n) => ({ value: n, label: n }))];
  }

  function buildSelects() {
    fillSelect($('f-sport'),
      [{ value: '', label: t('bet.filters.allSports') }, ...meta.sports.map((s) => ({ value: String(s.id), label: sportLabel(s) }))],
      state.sport);
    fillSelect($('f-league'), leagueOptions(), state.league);
    fillSelect($('f-betType'),
      [{ value: '', label: t('bet.filters.allTypes') }, ...meta.betTypes.map((b) => ({ value: b, label: t(`bet.type.${b}`) }))],
      state.betType);
    // a league that no longer belongs to the chosen sport is dropped
    if ($('f-league').value !== state.league) state.league = $('f-league').value;
  }

  function syncControls() {
    $('f-search').value = state.search;
    $('f-result').value = state.result;
    $('f-sort').value = `${state.sort}:${state.dir}`;
    $('f-dateFrom').value = state.dateFrom;
    $('f-dateTo').value = state.dateTo;
    $('f-minStake').value = state.minStake;
    $('f-maxStake').value = state.maxStake;
    buildSelects();
  }

  function setMoreOpen(open) {
    $('f-more').hidden = !open;
    $('f-toggle').setAttribute('aria-expanded', String(open));
    const key = open ? 'bet.filters.less' : 'bet.filters.more';
    const label = $('f-toggle-label');
    label.setAttribute('data-i18n', key);
    label.textContent = t(key);
  }

  function change(patch) {
    state = { ...state, ...patch, page: patch.page || 1 };
    syncUrl();
    load();
  }

  function bindControls() {
    let timer;
    $('f-search').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => change({ search: e.target.value.trim() }), 300);
    });
    $('f-sport').addEventListener('change', (e) => {
      state.sport = e.target.value;
      fillSelect($('f-league'), leagueOptions(), '');
      change({ sport: e.target.value, league: '' });
    });
    $('f-league').addEventListener('change', (e) => change({ league: e.target.value }));
    $('f-result').addEventListener('change', (e) => change({ result: e.target.value }));
    $('f-betType').addEventListener('change', (e) => change({ betType: e.target.value }));
    $('f-dateFrom').addEventListener('change', (e) => change({ dateFrom: e.target.value }));
    $('f-dateTo').addEventListener('change', (e) => change({ dateTo: e.target.value }));
    $('f-minStake').addEventListener('change', (e) => change({ minStake: e.target.value }));
    $('f-maxStake').addEventListener('change', (e) => change({ maxStake: e.target.value }));
    $('f-sort').addEventListener('change', (e) => {
      const [sort, dir] = e.target.value.split(':');
      change({ sort, dir });
    });
    $('f-toggle').addEventListener('click', () => setMoreOpen($('f-more').hidden));
    $('f-reset').addEventListener('click', () => {
      state = { ...DEFAULTS };
      syncControls();
      syncUrl();
      load();
    });
  }

  /* ---------- Rendering ---------- */

  function resultBadge(result) {
    const m = RESULT_META[result] || RESULT_META.pending;
    return `<span class="db-result db-result-${m.cls}"><i class="bi ${m.icon}" aria-hidden="true"></i>${escapeHtml(t(m.key))}</span>`;
  }

  function plCell(b) {
    if (b.result === 'pending' || b.result === 'void') return '<span class="text-muted">—</span>';
    const tone = b.profitLoss > 0 ? 'positive' : b.profitLoss < 0 ? 'negative' : '';
    return `<span class="bt-pl${tone ? ` is-${tone}` : ''}">${signedMoney(b.profitLoss)}</span>`;
  }

  const accent = (b) => (KNOWN_SPORTS.includes(b.sportSlug) ? b.sportSlug : 'other');
  const sportName = (b) => sportLabel({ slug: b.sportSlug, name: b.sportName });

  function actionButtons(b) {
    return `
      <a class="bt-icon-btn" href="/bets/${b.id}" title="${escapeHtml(t('bet.edit'))}" aria-label="${escapeHtml(t('bet.edit'))}: ${escapeHtml(b.matchTitle)}">
        <i class="bi bi-pencil" aria-hidden="true"></i></a>
      <button type="button" class="bt-icon-btn is-danger" data-delete="${b.id}" title="${escapeHtml(t('bet.delete'))}" aria-label="${escapeHtml(t('bet.delete'))}: ${escapeHtml(b.matchTitle)}">
        <i class="bi bi-trash3" aria-hidden="true"></i></button>`;
  }

  function row(b) {
    return `
      <tr>
        <td class="bt-num" style="text-align:left">${escapeHtml(formatDate(b.betDate))}</td>
        <td><span class="bt-sport db-sport-${accent(b)}"><span class="bt-dot" aria-hidden="true"></span>${escapeHtml(sportName(b))}</span></td>
        <td class="bt-match">${escapeHtml(b.matchTitle)}${b.league ? `<span class="bt-sub">${escapeHtml(b.league)}</span>` : ''}</td>
        <td>${escapeHtml(t(`bet.type.${b.betType}`))}</td>
        <td>${escapeHtml(b.selection)}</td>
        <td class="bt-num">${b.odds.toFixed(2)}</td>
        <td class="bt-num">${money(b.stake)}</td>
        <td>${resultBadge(b.result)}</td>
        <td class="bt-num">${plCell(b)}</td>
        <td class="bt-num"><span class="bt-actions">${actionButtons(b)}</span></td>
      </tr>`;
  }

  function card(b) {
    const hasScore = b.homeScore !== null && b.awayScore !== null;
    const tone = b.result === 'pending' || b.result === 'void' ? '' : b.profitLoss > 0 ? 'positive' : b.profitLoss < 0 ? 'negative' : '';
    const plLabel = b.result === 'lost' ? t('dash.loss') : t('dash.profit');
    const plValue = b.result === 'pending' || b.result === 'void' ? '—' : signedMoney(b.profitLoss);
    return `
      <article class="db-bet db-sport-${accent(b)}">
        <header class="db-bet-head">
          <span class="db-sport">${escapeHtml(sportName(b))}</span>
          ${resultBadge(b.result)}
        </header>
        <div class="db-bet-teams">
          <span class="db-team">${escapeHtml(b.homeTeam)}</span>
          <span class="db-score">${hasScore ? `${b.homeScore} — ${b.awayScore}` : 'vs'}</span>
          <span class="db-team db-team-away">${escapeHtml(b.awayTeam)}</span>
        </div>
        <dl class="db-bet-meta">
          <div><dt>${escapeHtml(t('dash.pick'))}</dt><dd>${escapeHtml(b.selection)}</dd></div>
          <div><dt>${escapeHtml(t('dash.odds'))}</dt><dd>${b.odds.toFixed(2)}</dd></div>
          <div><dt>${escapeHtml(t('dash.stake'))}</dt><dd>${money(b.stake)}</dd></div>
          <div><dt>${escapeHtml(plLabel)}</dt><dd class="${tone ? `is-${tone}` : ''}">${plValue}</dd></div>
        </dl>
        <footer class="db-bet-foot">${[b.league, formatDate(b.betDate)].filter(Boolean).map(escapeHtml).join(' · ')}</footer>
        <div class="bt-card-actions">
          <a class="btn btn-outline-secondary btn-sm" href="/bets/${b.id}"><i class="bi bi-pencil" aria-hidden="true"></i> ${escapeHtml(t('bet.edit'))}</a>
          <button type="button" class="btn btn-outline-danger btn-sm" data-delete="${b.id}"><i class="bi bi-trash3" aria-hidden="true"></i> ${escapeHtml(t('bet.delete'))}</button>
        </div>
      </article>`;
  }

  function renderList(data) {
    const { items, pagination, summary } = data;

    if (!items.length) {
      renderSummary(null);
      $pagination.innerHTML = '';
      const filtered = hasFilters();
      $results.innerHTML = `
        <div class="db-state">
          <i class="bi ${filtered ? 'bi-funnel' : 'bi-journal-plus'}" aria-hidden="true"></i>
          <h3>${escapeHtml(t(filtered ? 'bet.empty.filteredTitle' : 'dash.empty.title'))}</h3>
          <p>${escapeHtml(t(filtered ? 'bet.empty.filteredText' : 'dash.empty.text'))}</p>
          ${filtered
            ? `<button type="button" class="btn btn-outline-secondary" id="empty-reset">${escapeHtml(t('bet.filters.reset'))}</button>`
            : `<a class="btn btn-primary" href="/bets/create"><i class="bi bi-plus-lg" aria-hidden="true"></i> ${escapeHtml(t('bet.newBet'))}</a>`}
        </div>`;
      const reset = $('empty-reset');
      if (reset) reset.addEventListener('click', () => $('f-reset').click());
      return;
    }

    renderSummary(data);
    $results.innerHTML = `
      <div class="bt-table-wrap">
        <table class="bt-table">
          <thead><tr>
            <th scope="col">${escapeHtml(t('bet.col.date'))}</th>
            <th scope="col">${escapeHtml(t('bet.col.sport'))}</th>
            <th scope="col">${escapeHtml(t('bet.col.match'))}</th>
            <th scope="col">${escapeHtml(t('bet.col.betType'))}</th>
            <th scope="col">${escapeHtml(t('bet.col.selection'))}</th>
            <th scope="col" class="bt-num">${escapeHtml(t('bet.col.odds'))}</th>
            <th scope="col" class="bt-num">${escapeHtml(t('bet.col.stake'))}</th>
            <th scope="col">${escapeHtml(t('bet.col.result'))}</th>
            <th scope="col" class="bt-num">${escapeHtml(t('bet.col.profitLoss'))}</th>
            <th scope="col" class="bt-num">${escapeHtml(t('bet.col.actions'))}</th>
          </tr></thead>
          <tbody>${items.map(row).join('')}</tbody>
        </table>
      </div>
      <div class="bt-cards">${items.map(card).join('')}</div>`;
    renderPagination(pagination);
  }

  function renderSummary(data) {
    if (!data) { $summary.innerHTML = ''; return; }
    const { pagination: p, summary: s } = data;
    const from = (p.page - 1) * p.pageSize + 1;
    const to = Math.min(p.page * p.pageSize, p.total);
    const tone = s.totalProfit > 0 ? 'positive' : s.totalProfit < 0 ? 'negative' : '';
    $summary.innerHTML = `
      <span class="bt-summary-count">${escapeHtml(t('bet.summary.showing', { from, to, total: p.total }))}</span>
      <span>${escapeHtml(t('bet.summary.staked'))}: <strong>${money(s.totalStake)}</strong></span>
      <span>${escapeHtml(t('bet.summary.profit'))}: <strong class="${tone ? `is-${tone}` : ''}">${signedMoney(s.totalProfit)}</strong></span>`;
  }

  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1]);
    const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const out = [];
    list.forEach((n, i) => {
      if (i && n - list[i - 1] > 1) out.push('…');
      out.push(n);
    });
    return out;
  }

  function renderPagination(p) {
    if (p.pages <= 1) { $pagination.innerHTML = ''; return; }
    const prevDisabled = p.page <= 1 ? 'disabled' : '';
    const nextDisabled = p.page >= p.pages ? 'disabled' : '';
    $pagination.innerHTML = `<ul>
      <li><button type="button" class="bt-page-btn" data-page="${p.page - 1}" ${prevDisabled} aria-label="${escapeHtml(t('bet.page.prev'))}"><i class="bi bi-chevron-left" aria-hidden="true"></i></button></li>
      ${pageList(p.page, p.pages).map((n) => n === '…'
        ? '<li class="bt-page-gap" aria-hidden="true">…</li>'
        : `<li><button type="button" class="bt-page-btn" data-page="${n}" ${n === p.page ? 'aria-current="page"' : ''}>${n}</button></li>`).join('')}
      <li><button type="button" class="bt-page-btn" data-page="${p.page + 1}" ${nextDisabled} aria-label="${escapeHtml(t('bet.page.next'))}"><i class="bi bi-chevron-right" aria-hidden="true"></i></button></li>
    </ul>`;
  }

  function renderSkeleton() {
    $results.setAttribute('aria-busy', 'true');
    $results.innerHTML = '<div aria-hidden="true">' + '<div class="bt-skel"></div>'.repeat(6) + '</div>';
  }

  function renderError() {
    $summary.innerHTML = '';
    $pagination.innerHTML = '';
    $results.innerHTML = `
      <div class="db-state" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <h3>${escapeHtml(t('dash.error.title'))}</h3>
        <button type="button" class="btn btn-outline-secondary" id="bt-retry">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> ${escapeHtml(t('dash.error.retry'))}
        </button>
      </div>`;
    $('bt-retry').addEventListener('click', load);
  }

  /* ---------- Load ---------- */

  async function load() {
    const id = ++requestId;
    renderSkeleton();
    try {
      const { data } = await window.Api.get(`/bets?${queryString(true)}`);
      if (id !== requestId) return; // a newer request superseded this one
      lastResponse = data;
      if (data.pagination.page !== state.page) { state.page = data.pagination.page; syncUrl(); }
      renderList(data);
    } catch (err) {
      if (err.status === 401 || id !== requestId) return;
      lastResponse = null;
      renderError();
    } finally {
      if (id === requestId) $results.setAttribute('aria-busy', 'false');
    }
  }

  /* ---------- Delete ---------- */

  function bindActions() {
    $results.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]');
      if (!btn || !lastResponse) return;
      const bet = lastResponse.items.find((b) => String(b.id) === btn.dataset.delete);
      if (!bet) return;
      pendingDelete = bet;
      $('delete-text').textContent = t('bet.deleteText', { match: bet.matchTitle });
      bootstrap.Modal.getOrCreateInstance($('delete-modal')).show();
    });

    $pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      change({ page: Number(btn.dataset.page) });
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });

    $('delete-confirm').addEventListener('click', async () => {
      if (!pendingDelete) return;
      const btn = $('delete-confirm');
      btn.disabled = true;
      try {
        await window.Api.del(`/bets/${pendingDelete.id}`);
        bootstrap.Modal.getOrCreateInstance($('delete-modal')).hide();
        window.Toast.show(t('bet.deleted'), 'success');
        pendingDelete = null;
        load();
      } catch (err) {
        if (err.status === 401) return;
        window.Toast.show(t('bet.err.delete'), 'danger');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Init ---------- */

  function showFlash() {
    try {
      const raw = sessionStorage.getItem('flash');
      if (!raw) return;
      sessionStorage.removeItem('flash');
      const flash = JSON.parse(raw);
      if (flash && flash.key) window.Toast.show(t(flash.key), flash.type || 'success');
    } catch (_) { /* ignore */ }
  }

  async function init() {
    readUrl();
    window.Layout.loadUser();
    bindControls();
    bindActions();
    setMoreOpen(MORE_KEYS.some((k) => state[k] !== ''));
    renderSkeleton();
    try {
      const { data } = await window.Api.get('/bets/meta');
      meta = data;
    } catch (err) {
      if (err.status === 401) return;
    }
    syncControls();
    showFlash();
    load();
  }

  // Dynamic text (selects, rows, dates) follows the language
  document.addEventListener('i18n:change', () => {
    syncControls();
    setMoreOpen(!$('f-more').hidden);
    if (lastResponse) renderList(lastResponse);
  });

  init();
})();
