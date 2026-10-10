// Runs before first paint so the page doesn't flash the wrong theme.
// Kept as an external file because the CSP blocks inline scripts.
(function () {
  try {
    var mode = localStorage.getItem('theme');
    // First visit (nothing saved) follows the device setting; after the first click it's always explicit.
    var dark = mode === 'dark' ||
      (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();