// Builds the sidebar + topbar around <main id="page-content" data-page="...">.
// Every page reuses this, so the shell only lives in one place.
(function () {
  const APP_NAME = 'Bet Manager';
  const { t, escapeHtml, getLang } = window.Utils;

  const NAV = [
    { page: 'dashboard',  href: '/dashboard',  icon: 'bi-speedometer2',   key: 'shell.dashboard' },
    { page: 'bets',       href: '/bets',       icon: 'bi-journal-text',   key: 'shell.myBets' },
    { page: 'live',       href: '/live-bets',  icon: 'bi-broadcast',      key: 'shell.liveBets' },
    { page: 'sports',     href: '/sports',     icon: 'bi-trophy',         key: 'shell.sports' },
    { page: 'statistics', href: '/statistics', icon: 'bi-bar-chart-line', key: 'shell.statistics' },
    { page: 'calendar',   href: '/calendar',   icon: 'bi-calendar3',      key: 'shell.calendar' },
    { page: 'categories', href: '/categories', icon: 'bi-tags',           key: 'shell.categories' },
  ];

   const THEMES = [
    { mode: 'light', icon: 'bi-sun',        key: 'shell.themeLight' },
    { mode: 'dark',  icon: 'bi-moon-stars', key: 'shell.themeDark' },
  ];

  const label = (key) => `<span data-i18n="${key}">${escapeHtml(t(key))}</span>`;
  // aria-label that is refreshed when the language changes
  const aria = (key) => `data-i18n-aria="${key}" aria-label="${escapeHtml(t(key))}"`;

    // What is actually displayed right now: 'light' or 'dark'
  function getThemeMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function navLinks(active) {
    return NAV.map((n) => `
      <a class="shell-nav-link${n.page === active ? ' active' : ''}" href="${n.href}"${n.page === active ? ' aria-current="page"' : ''}>
        <i class="bi ${n.icon}" aria-hidden="true"></i>${label(n.key)}
      </a>`).join('');
  }

  function shellHtml(active) {
    const lang = getLang();
    const currentTheme = THEMES.find((x) => x.mode === getThemeMode()) || THEMES[0];
    const themeText = `${t('shell.theme')}: ${t(currentTheme.key)}`;

    return `
      <aside class="shell-sidebar d-none d-lg-flex" ${aria('shell.menu')}>
        <a class="shell-brand" href="/dashboard"><i class="bi bi-graph-up-arrow" aria-hidden="true"></i><span>${APP_NAME}</span></a>
        <nav class="shell-nav">${navLinks(active)}</nav>
      </aside>

      <div class="shell-main">
        <header class="shell-topbar">
          <button class="btn btn-outline-secondary d-lg-none" type="button"
                  data-bs-toggle="offcanvas" data-bs-target="#shell-offcanvas"
                  aria-controls="shell-offcanvas" ${aria('shell.menu')}>
            <i class="bi bi-list" aria-hidden="true"></i>
          </button>

          <form class="shell-search" role="search" id="shell-search">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
              <input type="search" class="form-control" name="q" autocomplete="off"
                     placeholder="${escapeHtml(t('shell.search'))}" data-i18n-placeholder="shell.search"
                     ${aria('shell.search')}>
            </div>
          </form>

          <div class="shell-actions">
            <div class="btn-group btn-group-sm" role="group" ${aria('shell.language')}>
              <button type="button" class="btn btn-outline-secondary${lang === 'en' ? ' active' : ''}" data-lang="en" aria-pressed="${lang === 'en'}">EN</button>
              <button type="button" class="btn btn-outline-secondary${lang === 'kh' ? ' active' : ''}" data-lang="kh" aria-pressed="${lang === 'kh'}">ខ្មែរ</button>
            </div>

            <button type="button" class="btn btn-sm btn-outline-secondary" id="shell-theme-btn"
                    aria-label="${escapeHtml(themeText)}" title="${escapeHtml(themeText)}">
              <i class="bi ${currentTheme.icon}" id="shell-theme-icon" aria-hidden="true"></i>
            </button>

            <div class="dropdown">
              <button class="shell-user" type="button" data-bs-toggle="dropdown" aria-expanded="false" ${aria('shell.profile')}>
                <span class="shell-avatar" id="shell-avatar" aria-hidden="true">?</span>
                <span class="shell-user-name d-none d-md-inline" id="shell-user-name"></span>
                <i class="bi bi-chevron-down small d-none d-md-inline" aria-hidden="true"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="/profile">${label('shell.profile')}</a></li>
                <li><a class="dropdown-item" href="/settings">${label('shell.settings')}</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item" data-action="logout">${label('shell.logout')}</button></li>
              </ul>
            </div>
          </div>
        </header>
        <div class="shell-content" id="shell-content"></div>
      </div>`;
  }

  function offcanvasHtml(active) {
    return `
      <div class="offcanvas offcanvas-start" tabindex="-1" id="shell-offcanvas" aria-labelledby="shell-offcanvas-title">
        <div class="offcanvas-header">
          <h2 class="offcanvas-title h5" id="shell-offcanvas-title">${APP_NAME}</h2>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" ${aria('shell.close')}></button>
        </div>
        <div class="offcanvas-body"><nav class="shell-nav">${navLinks(active)}</nav></div>
      </div>`;
  }

  /* ---------- Theme ---------- */

  function updateThemeButton(mode) {
    const cfg = THEMES.find((x) => x.mode === mode) || THEMES[0];
    const btn = document.getElementById('shell-theme-btn');
    const icon = document.getElementById('shell-theme-icon');
    if (!btn || !icon) return;
    const text = `${t('shell.theme')}: ${t(cfg.key)}`;
    icon.className = `bi ${cfg.icon}`;
    btn.setAttribute('aria-label', text);
    btn.setAttribute('title', text);
  }

  function applyTheme(mode) {
    const dark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('theme', mode); } catch (_) { /* ignore */ }
    updateThemeButton(mode);
  }

  function cycleTheme() {
    const i = THEMES.findIndex((x) => x.mode === getThemeMode());
    applyTheme(THEMES[(i + 1) % THEMES.length].mode);
  }

  /* ---------- Language ---------- */
  // Switching itself is handled by language.js ([data-lang] buttons).
  // This only refreshes what data-i18n can't reach.
  function onLanguageChange(lang) {
    document.querySelectorAll('[data-lang]').forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
    document.querySelectorAll('[data-i18n-aria]').forEach((el) =>
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))));
    updateThemeButton(getThemeMode());
  }

  /* ---------- Session ---------- */

  async function logout() {
    try { await window.Api.post('/auth/logout'); } catch (_) { /* go to login anyway */ }
    window.location.href = '/login';
  }

  function setUser(user) {
    if (!user) return;
    const name = (user.name || '').trim();
    const nameEl = document.getElementById('shell-user-name');
    const avatarEl = document.getElementById('shell-avatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (Array.from(name)[0] || '?').toUpperCase();
  }

  /* ---------- Mount ---------- */

  function mount() {
    const main = document.getElementById('page-content');
    if (!main) return;
    const active = main.dataset.page;

    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#page-content';
    skip.setAttribute('data-i18n', 'shell.skip');
    skip.textContent = t('shell.skip');

    const shell = document.createElement('div');
    shell.className = 'shell';
    shell.innerHTML = shellHtml(active);

    main.parentNode.insertBefore(skip, main);
    main.parentNode.insertBefore(shell, main);
    shell.querySelector('#shell-content').appendChild(main);
    document.body.insertAdjacentHTML('beforeend', offcanvasHtml(active));

    document.getElementById('shell-theme-btn').addEventListener('click', cycleTheme);
    document.querySelector('[data-action="logout"]').addEventListener('click', logout);
    document.getElementById('shell-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.elements.q.value.trim();
      window.location.href = q ? `/bets?search=${encodeURIComponent(q)}` : '/bets';
    });
    document.addEventListener('i18n:change', (e) => onLanguageChange(e.detail.lang));
  }

  // Pages that don't load user data themselves can call this to fill the topbar.
  async function loadUser() {
    try {
      const body = await window.Api.get('/auth/me');
      setUser(body && body.user);
    } catch (_) { /* api.js redirects on 401 */ }
  }

  mount();
  window.Layout = { setUser, loadUser };
})();