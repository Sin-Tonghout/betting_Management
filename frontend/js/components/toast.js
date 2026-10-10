// Small toast helper: Toast.show('Saved', 'success' | 'danger' | 'info')
(function () {
  const ICONS = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };

  function container() {
    let el = document.getElementById('toast-region');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-region';
      el.className = 'toast-region';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast-lite toast-lite--${type}`;

    const icon = document.createElement('i');
    icon.className = `bi ${ICONS[type] || ICONS.info}`;
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = message;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-lite__close';
    close.setAttribute('aria-label', window.Utils ? window.Utils.t('bet.toast.close') : 'Close');
    close.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

    const dismiss = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 200);
    };
    close.addEventListener('click', dismiss);

    toast.append(icon, text, close);
    container().appendChild(toast);
    if (duration) setTimeout(dismiss, duration);
  }

  window.Toast = { show };
})();
