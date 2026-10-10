(function () {
  const t = (key, fallback) =>
    (window.I18n && window.translations &&
      window.translations[window.I18n.getLanguage()] &&
      window.translations[window.I18n.getLanguage()][key]) || fallback;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (n) => '$' + Number(n).toFixed(2);

  async function request(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Request failed');
    return body.data;
  }

  const listEl = document.getElementById('live-list');
  const startListEl = document.getElementById('start-list');
  let state = { live: [], startable: [] };
  let editingId = null;
  let timer = null;

  const scoreModal = () => bootstrap.Modal.getOrCreateInstance(document.getElementById('score-modal'));
  const startModal = () => bootstrap.Modal.getOrCreateInstance(document.getElementById('start-modal'));

  function skeleton() {
    listEl.innerHTML = [1, 2].map(() =>
      `<div class="col-12 col-lg-6"><div class="live-card skeleton" style="height:240px"></div></div>`
    ).join('');
  }

  function render() {
    if (!state.live.length) {
      listEl.innerHTML = `
        <div class="col-12">
          <div class="empty-state text-center py-5">
            <h2 class="h5">${esc(t('live.emptyTitle', 'No live bets right now.'))}</h2>
            <p class="text-muted">${esc(t('live.emptyText', 'Start a live bet from one of your pending bets to follow it here.'))}</p>
          </div>
        </div>`;
    } else {
      listEl.innerHTML = state.live.map(cardHtml).join('');
    }
    renderStartList();
  }

  function cardHtml(b) {
    const minute = b.live_minute ? esc(b.live_minute) : '';
    return `
      <div class="col-12 col-lg-6">
        <article class="live-card sport-${esc(b.sport_slug)}" data-id="${b.id}">
          <header class="d-flex align-items-center justify-content-between mb-3">
            <span class="small fw-semibold">${esc(b.sport_name)}${b.league ? ' · ' + esc(b.league) : ''}</span>
            <span class="live-badge"><span class="live-dot" aria-hidden="true"></span>${esc(t('live.badge', 'LIVE'))}${minute ? ' ' + minute : ''}</span>
          </header>

          <div class="live-score">
            <span class="live-team text-end">${esc(b.home_team)}</span>
            <span class="live-score-num">${b.home_score ?? 0} — ${b.away_score ?? 0}</span>
            <span class="live-team">${esc(b.away_team)}</span>
          </div>

          <dl class="live-meta">
            <div><dt>${esc(t('bet.selection', 'Pick'))}</dt><dd>${esc(b.selection)}</dd></div>
            <div><dt>${esc(t('bet.odds', 'Odds'))}</dt><dd>${Number(b.odds).toFixed(2)}</dd></div>
            <div><dt>${esc(t('bet.stake', 'Stake'))}</dt><dd>${money(b.stake)}</dd></div>
            <div><dt>${esc(t('live.potential', 'Potential'))}</dt><dd>${money(b.stake * b.odds)}</dd></div>
          </dl>

          <footer class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-sm btn-outline-secondary" data-action="score">${esc(t('live.updateScore', 'Update score'))}</button>
            <div class="ms-auto d-flex gap-2">
              <button class="btn btn-sm btn-success" data-action="won">${esc(t('result.won', 'Won'))}</button>
              <button class="btn btn-sm btn-danger" data-action="lost">${esc(t('result.lost', 'Lost'))}</button>
              <button class="btn btn-sm btn-outline-secondary" data-action="void">${esc(t('result.void', 'Void'))}</button>
            </div>
          </footer>
        </article>
      </div>`;
  }

  function renderStartList() {
    if (!state.startable.length) {
      startListEl.innerHTML = `<p class="text-muted mb-0">${esc(t('live.noPending', 'No pending bets available.'))}</p>`;
      return;
    }
    startListEl.innerHTML = state.startable.map((b) => `
      <button class="live-pick" data-start="${b.id}">
        <span class="fw-medium">${esc(b.home_team)} vs ${esc(b.away_team)}</span>
        <span class="small text-muted">${esc(b.sport_name)} · ${esc(b.selection)} @ ${Number(b.odds).toFixed(2)} · ${money(b.stake)}</span>
      </button>`).join('');
  }

  async function load(showSkeleton) {
    if (showSkeleton) skeleton();
    try {
      state = await request('/api/live-bets');
      render();
    } catch (err) {
      listEl.innerHTML = `
        <div class="col-12 text-center py-5">
          <h2 class="h5">${esc(t('states.error', 'Something went wrong.'))}</h2>
          <button class="btn btn-outline-primary mt-2" id="live-retry">${esc(t('actions.retry', 'Try again'))}</button>
        </div>`;
      document.getElementById('live-retry').addEventListener('click', () => load(true));
    }
  }

  // Card actions
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.closest('.live-card').dataset.id);
    const bet = state.live.find((b) => b.id === id);
    const action = btn.dataset.action;

    if (action === 'score') {
      editingId = id;
      document.getElementById('score-match').textContent = `${bet.home_team} vs ${bet.away_team}`;
      document.getElementById('score-home-label').textContent = bet.home_team;
      document.getElementById('score-away-label').textContent = bet.away_team;
      document.getElementById('score-home').value = bet.home_score ?? 0;
      document.getElementById('score-away').value = bet.away_score ?? 0;
      document.getElementById('score-minute').value = bet.live_minute || '';
      document.getElementById('score-error').classList.add('d-none');
      scoreModal().show();
      return;
    }

    // won / lost / void
    const label = t('result.' + action, action);
    if (!window.confirm(`${t('live.confirmSettle', 'Settle this bet as')} "${label}"?`)) return;
    btn.disabled = true;
    try {
      await request(`/api/live-bets/${id}/settle`, {
        method: 'POST', body: JSON.stringify({ result: action }),
      });
      await load(false);
    } catch (err) {
      btn.disabled = false;
      window.alert(err.message);
    }
  });

  // Save score
  document.getElementById('score-save').addEventListener('click', async () => {
    const errEl = document.getElementById('score-error');
    try {
      await request(`/api/live-bets/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          home_score: document.getElementById('score-home').value,
          away_score: document.getElementById('score-away').value,
          live_minute: document.getElementById('score-minute').value,
        }),
      });
      scoreModal().hide();
      await load(false);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('d-none');
    }
  });

  // Start a live bet
  startListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-start]');
    if (!btn) return;
    try {
      await request(`/api/live-bets/${btn.dataset.start}/start`, { method: 'POST' });
      startModal().hide();
      await load(false);
    } catch (err) {
      window.alert(err.message);
    }
  });

  // Refresh every 30s while the tab is visible
  function startPolling() {
    stopPolling();
    timer = setInterval(() => load(false), 30000);
  }
  function stopPolling() { if (timer) clearInterval(timer); timer = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPolling();
    else { load(false); startPolling(); }
  });

  document.addEventListener('i18n:change', render);

  load(true);
  startPolling();
})();