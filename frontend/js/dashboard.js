(function () {
  const { t, escapeHtml, money, signedMoney, formatDate } = window.Utils;

  const $recent = document.getElementById('recent-bets');

  const RESULT_META = {
    won:     { cls: 'won',     icon: 'bi-check-circle-fill', key: 'dash.result.won' },
    lost:    { cls: 'lost',    icon: 'bi-x-circle-fill',     key: 'dash.result.lost' },
    pending: { cls: 'pending', icon: 'bi-hourglass-split',   key: 'dash.result.pending' },
    void:    { cls: 'void',    icon: 'bi-dash-circle',       key: 'dash.result.void' },
  };
  const KNOWN_SPORTS = ['football', 'basketball', 'tennis', 'baseball', 'volleyball'];

  /* ---------- Stat cards ---------- */

  function setStat(name, value, sub, tone) {
    const valueEl = document.querySelector(`[data-stat="${name}"]`);
    const subEl = document.querySelector(`[data-stat-sub="${name}"]`);
    valueEl.textContent = value;
    valueEl.className = 'db-stat-value' + (tone ? ` is-${tone}` : '');
    subEl.textContent = sub || '';
  }

  function resetStats() {
    document.querySelectorAll('[data-stat]').forEach((el) => {
      el.className = 'db-stat-value';
      el.innerHTML = '<span class="db-skeleton"></span>';
    });
    document.querySelectorAll('[data-stat-sub]').forEach((el) => { el.textContent = ''; });
  }

  function renderStats(s) {
    const tone = s.profitLoss > 0 ? 'positive' : s.profitLoss < 0 ? 'negative' : '';
    setStat('totalBets', s.totalBets, t('dash.sub.pending', { n: s.pending }));
    setStat('won', s.won, t('dash.sub.lost', { n: s.lost }), s.won > 0 ? 'positive' : '');
    setStat('winRate', s.winRate === null ? '—' : `${s.winRate.toFixed(1)}%`,
      t('dash.sub.settled', { n: s.won + s.lost }));
    setStat('profitLoss', signedMoney(s.profitLoss),
      t('dash.sub.staked', { amount: money(s.totalStake) }), tone);
  }

  function renderStatsError() {
    ['totalBets', 'won', 'winRate', 'profitLoss'].forEach((name) => setStat(name, '—', ''));
  }

  /* ---------- Recent bets ---------- */

  function sportLabel(bet) {
    const key = `dash.sport.${bet.sportSlug}`;
    const label = t(key);
    return label === key ? bet.sportName : label;
  }

  function betCard(bet) {
    const meta = RESULT_META[bet.result] || RESULT_META.pending;
    const accent = KNOWN_SPORTS.includes(bet.sportSlug) ? bet.sportSlug : 'other';
    const hasScore = bet.homeScore !== null && bet.awayScore !== null;
    const isPending = bet.result === 'pending';
    const tone = bet.profitLoss > 0 ? 'positive' : bet.profitLoss < 0 ? 'negative' : '';
    const plLabel = bet.result === 'lost' ? t('dash.loss') : t('dash.profit');
    const plValue = isPending ? '—' : signedMoney(bet.profitLoss);
    const footer = [bet.league, formatDate(bet.betDate)].filter(Boolean).map(escapeHtml).join(' · ');

    return `
      <article class="db-bet db-sport-${accent}">
        <header class="db-bet-head">
          <span class="db-sport">${escapeHtml(sportLabel(bet))}</span>
          <span class="db-result db-result-${meta.cls}">
            <i class="bi ${meta.icon}" aria-hidden="true"></i>${escapeHtml(t(meta.key))}
          </span>
        </header>
        <div class="db-bet-teams">
          <span class="db-team">${escapeHtml(bet.homeTeam)}</span>
          <span class="db-score">${hasScore ? `${bet.homeScore} — ${bet.awayScore}` : 'vs'}</span>
          <span class="db-team db-team-away">${escapeHtml(bet.awayTeam)}</span>
        </div>
        <dl class="db-bet-meta">
          <div><dt>${escapeHtml(t('dash.pick'))}</dt><dd>${escapeHtml(bet.selection)}</dd></div>
          <div><dt>${escapeHtml(t('dash.odds'))}</dt><dd>${Number(bet.odds).toFixed(2)}</dd></div>
          <div><dt>${escapeHtml(t('dash.stake'))}</dt><dd>${money(bet.stake)}</dd></div>
          <div><dt>${escapeHtml(plLabel)}</dt><dd class="${tone ? `is-${tone}` : ''}">${plValue}</dd></div>
        </dl>
        <footer class="db-bet-foot">${footer}</footer>
      </article>`;
  }

  function renderSkeleton() {
    $recent.setAttribute('aria-busy', 'true');
    $recent.innerHTML = '<div class="db-bet is-loading" aria-hidden="true"></div>'.repeat(3);
  }

  function renderEmpty() {
    $recent.innerHTML = `
      <div class="db-state">
        <i class="bi bi-journal-plus" aria-hidden="true"></i>
        <h3>${escapeHtml(t('dash.empty.title'))}</h3>
        <p>${escapeHtml(t('dash.empty.text'))}</p>
        <a class="btn btn-primary" href="/bets/create">
          <i class="bi bi-plus-lg" aria-hidden="true"></i> ${escapeHtml(t('dash.createBet'))}
        </a>
      </div>`;
  }

  function renderError() {
    $recent.innerHTML = `
      <div class="db-state" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <h3>${escapeHtml(t('dash.error.title'))}</h3>
        <button type="button" class="btn btn-outline-secondary" id="db-retry">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> ${escapeHtml(t('dash.error.retry'))}
        </button>
      </div>`;
    document.getElementById('db-retry').addEventListener('click', load);
  }

    /* ---------- Load ---------- */

  let lastData = null;

  function render(data) {
    window.Layout.setUser(data.user);
    renderStats(data.stats);
    if (data.recentBets.length) {
      $recent.innerHTML = data.recentBets.map(betCard).join('');
    } else {
      renderEmpty();
    }
  }

  async function load() {
    lastData = null;
    resetStats();
    renderSkeleton();
    try {
      const { data } = await window.Api.get('/dashboard/summary');
      lastData = data;
      render(data);
    } catch (err) {
      if (err.status === 401) return; // api.js is already redirecting to /login
      renderStatsError();
      renderError();
    } finally {
      $recent.setAttribute('aria-busy', 'false');
    }
  }

  // Re-render translated text (stat subtitles, cards, dates) when the language changes
  document.addEventListener('i18n:change', () => {
    if (lastData) render(lastData);
  });

  load();
})();