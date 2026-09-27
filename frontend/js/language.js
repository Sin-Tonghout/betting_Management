(function () {
  const STORAGE_KEY = 'lang'; // 'en' | 'kh'
  const DEFAULT_LANG = 'en';

  function getLanguage() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  function t(key) {
    const lang = getLanguage();
    const dict = (window.translations && window.translations[lang]) || {};
    const fallback = (window.translations && window.translations.en) || {};
    return dict[key] || fallback[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = getLanguage() === 'kh' ? 'km' : 'en';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });

    document.querySelectorAll('[data-lang]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-lang') === getLanguage());
    });
  }

  function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
    });
  });

  window.I18n = { t, setLanguage, getLanguage, applyTranslations };
})();