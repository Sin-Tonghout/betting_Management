(function () {
  const STORAGE_KEY = 'theme'; // 'light' | 'dark' | 'system'
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function systemTheme() {
    return media.matches ? 'dark' : 'light';
  }

  function getPreference() {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  }

  function applyTheme(theme) {
    const resolved = theme === 'system' ? systemTheme() : theme;
    root.setAttribute('data-theme', resolved);
    document.querySelectorAll('[data-theme-toggle] i').forEach((icon) => {
      icon.className = resolved === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    });
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = root.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply immediately (before DOM is fully ready) to avoid a flash of the wrong theme
  applyTheme(getPreference());

  // Follow OS changes only while the user hasn't picked light/dark explicitly
  media.addEventListener('change', () => {
    if (getPreference() === 'system') applyTheme('system');
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreference()); // re-run so toggle-button icons (need the DOM) get set
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });
  });

  // Exposed for later use (e.g. a Settings page with an explicit "System" option)
  window.Theme = { setTheme, toggleTheme, getPreference };
})();