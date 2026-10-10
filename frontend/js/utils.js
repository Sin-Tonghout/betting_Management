(function () {
  // Translate a key, replacing {name} placeholders.
  function t(key, params) {
    let text = key;
    try {
      if (window.I18n && typeof window.I18n.t === 'function') {
        text = window.I18n.t(key) || key;
      }
    } catch (_) { /* fall back to the key */ }
    if (params) {
      Object.keys(params).forEach((name) => {
        text = text.split(`{${name}}`).join(params[name]);
      });
    }
    return text;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getLang() {
    try { return localStorage.getItem('lang') || 'en'; } catch (_) { return 'en'; }
  }

  const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const signedFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'exceptZero',
  });

  // Accepts "YYYY-MM-DD" and formats it in the current language.
  function formatDate(ymd) {
    const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
    const locale = getLang() === 'kh' ? 'km-KH' : 'en-US';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' })
      .format(new Date(y, m - 1, d));
  }

  window.Utils = {
    t,
    escapeHtml,
    getLang,
    money: (n) => moneyFmt.format(n),
    signedMoney: (n) => signedFmt.format(n),
    formatDate,
  };
})();