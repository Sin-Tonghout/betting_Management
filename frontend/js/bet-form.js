(function () {
  const { t, escapeHtml, money, signedMoney } = window.Utils;

  const $ = (id) => document.getElementById(id);
  const form = $('bet-form');
  const stateBox = $('form-state');

  const FIELDS = ['sportId', 'league', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore',
    'betType', 'selection', 'odds', 'stake', 'betDate', 'categoryId', 'result', 'status', 'notes'];
  const REQUIRED = ['sportId', 'homeTeam', 'awayTeam', 'betType', 'selection', 'odds', 'stake', 'betDate'];

  const match = window.location.pathname.match(/^\/bets\/(\d+)$/);
  const editId = match ? Number(match[1]) : null;

  let meta = { sports: [], leagues: [], usedLeagues: [], categories: [], betTypes: [] };
  let loadedBet = null;

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const todayYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /* ---------- Selects ---------- */

  const sportLabel = (s) => {
    const key = `dash.sport.${s.slug}`;
    const label = t(key);
    return label === key ? s.name : label;
  };

  function fill(select, options, keep) {
    const current = keep === undefined ? select.value : keep;
    select.innerHTML = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    select.value = options.some((o) => String(o.value) === String(current)) ? current : options[0].value;
  }

  function buildSelects() {
    fill($('sportId'), [{ value: '', label: t('bet.form.select') }, ...meta.sports.map((s) => ({ value: String(s.id), label: sportLabel(s) }))]);
    fill($('betType'), [{ value: '', label: t('bet.form.select') }, ...meta.betTypes.map((b) => ({ value: b, label: t(`bet.type.${b}`) }))]);
    fill($('categoryId'), [{ value: '', label: t('bet.form.noCategory') }, ...meta.categories.map((c) => ({ value: String(c.id), label: c.name }))]);
    buildLeagueList();
  }

  function buildLeagueList() {
    const sportId = Number($('sportId').value) || null;
    const names = new Set();
    meta.leagues.forEach((l) => { if (!sportId || l.sportId === sportId) names.add(l.name); });
    meta.usedLeagues.forEach((l) => { if (!sportId || l.sportId === sportId) names.add(l.name); });
    $('league-list').innerHTML = [...names].sort((a, b) => a.localeCompare(b))
      .map((n) => `<option value="${escapeHtml(n)}"></option>`).join('');
  }

  /* ---------- Live calculation ---------- */

  function setCalc(el, text, tone) {
    el.textContent = text;
    el.className = tone ? `is-${tone}` : '';
  }

  function updateCalc() {
    const odds = parseFloat($('odds').value);
    const stake = parseFloat($('stake').value);
    const result = $('result').value;
    const ok = odds > 1 && stake > 0;
    const potential = ok ? round2(stake * odds) : null;

    setCalc($('calc-potential'), potential === null ? '—' : money(potential));

    if (!ok || result === 'pending' || result === 'void') {
      setCalc($('calc-profit'), result === 'void' && ok ? money(0) : '—');
      return;
    }
    const pl = result === 'won' ? round2(potential - stake) : round2(-stake);
    setCalc($('calc-profit'), signedMoney(pl), pl > 0 ? 'positive' : pl < 0 ? 'negative' : '');
  }

  function updateStatusVisibility() {
    $('status-wrap').hidden = $('result').value !== 'pending';
  }

  /* ---------- Validation ---------- */

  function setError(name, code) {
    const input = form.elements[name];
    const box = $(`err-${name}`);
    if (!input || !box) return;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    box.textContent = t(`bet.err.${code}`);
  }

  function clearErrors() {
    FIELDS.forEach((name) => {
      const input = form.elements[name];
      const box = $(`err-${name}`);
      if (input) { input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
      if (box) box.textContent = '';
    });
  }

  function clientValidate() {
    const errors = {};
    REQUIRED.forEach((name) => { if (!String(form.elements[name].value).trim()) errors[name] = 'required'; });
    const odds = parseFloat($('odds').value);
    if (!errors.odds && !(odds > 1)) errors.odds = 'oddsMin';
    const stake = parseFloat($('stake').value);
    if (!errors.stake && !(stake > 0)) errors.stake = 'stakeMin';
    ['homeScore', 'awayScore'].forEach((n) => {
      const v = $(n).value;
      if (v !== '' && !(Number.isInteger(Number(v)) && Number(v) >= 0)) errors[n] = 'invalid';
    });
    return errors;
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach((n) => setError(n, errors[n]));
    const first = FIELDS.find((n) => errors[n]);
    if (first) form.elements[first].focus();
  }

  /* ---------- Fill / read ---------- */

  function fillForm(bet) {
    $('sportId').value = String(bet.sportId);
    buildLeagueList();
    $('league').value = bet.league || '';
    $('homeTeam').value = bet.homeTeam;
    $('awayTeam').value = bet.awayTeam;
    $('homeScore').value = bet.homeScore ?? '';
    $('awayScore').value = bet.awayScore ?? '';
    $('betType').value = bet.betType;
    $('selection').value = bet.selection;
    $('odds').value = bet.odds;
    $('stake').value = bet.stake;
    $('betDate').value = bet.betDate;
    $('categoryId').value = bet.categoryId ? String(bet.categoryId) : '';
    $('result').value = bet.result;
    $('status').value = bet.status === 'live' ? 'live' : 'upcoming';
    $('notes').value = bet.notes || '';
  }

  function payload() {
    const v = (n) => form.elements[n].value;
    return {
      sportId: v('sportId'), league: v('league'), homeTeam: v('homeTeam'), awayTeam: v('awayTeam'),
      homeScore: v('homeScore'), awayScore: v('awayScore'), betType: v('betType'), selection: v('selection'),
      odds: v('odds'), stake: v('stake'), betDate: v('betDate'), categoryId: v('categoryId'),
      result: v('result'), status: v('status'), notes: v('notes'),
    };
  }

  /* ---------- Submit ---------- */

  let saving = false;

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    const errors = clientValidate();
    if (Object.keys(errors).length) { showErrors(errors); return; }
    clearErrors();

    saving = true;
    const btn = $('save-btn');
    btn.disabled = true;
    btn.classList.add('btn-loading');
    $('save-label').textContent = t('bet.form.saving');

    try {
      if (editId) await window.Api.put(`/bets/${editId}`, payload());
      else await window.Api.post('/bets', payload());
      try { sessionStorage.setItem('flash', JSON.stringify({ key: editId ? 'bet.updated' : 'bet.created', type: 'success' })); } catch (_) { /* ignore */ }
      window.location.href = '/bets';
    } catch (err) {
      if (err.status === 401) return;
      if (err.status === 422 && err.body && err.body.errors) showErrors(err.body.errors);
      else window.Toast.show(t('bet.err.save'), 'danger');
      saving = false;
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      $('save-label').textContent = t('bet.form.save');
    }
  }

  /* ---------- Page state ---------- */

  function setTitles() {
    const key = editId ? 'edit' : 'create';
    $('form-title').setAttribute('data-i18n', `bet.form.${key}Title`);
    $('form-subtitle').setAttribute('data-i18n', `bet.form.${key}Sub`);
    $('form-title').textContent = t(`bet.form.${key}Title`);
    $('form-subtitle').textContent = t(`bet.form.${key}Sub`);
    document.title = t(`bet.form.${key}Title`);
  }

  function showFailure(messageKey, retry) {
    form.hidden = true;
    stateBox.innerHTML = `
      <div class="db-state" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <h3>${escapeHtml(t(messageKey))}</h3>
        ${retry
          ? `<button type="button" class="btn btn-outline-secondary" id="form-retry"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> ${escapeHtml(t('dash.error.retry'))}</button>`
          : `<a class="btn btn-outline-secondary" href="/bets">${escapeHtml(t('bet.form.back'))}</a>`}
      </div>`;
    if (retry) $('form-retry').addEventListener('click', init);
  }

  async function init() {
    stateBox.innerHTML = '<div class="bt-skel" aria-hidden="true"></div>'.repeat(3);
    form.hidden = true;
    setTitles();
    try {
      const [{ data }, betRes] = await Promise.all([
        window.Api.get('/bets/meta'),
        editId ? window.Api.get(`/bets/${editId}`) : Promise.resolve(null),
      ]);
      meta = data;
      loadedBet = betRes ? betRes.data : null;
    } catch (err) {
      if (err.status === 401) return;
      if (err.status === 404) return showFailure('bet.err.notFound', false);
      return showFailure('bet.err.load', true);
    }

    stateBox.innerHTML = '';
    buildSelects();
    if (loadedBet) fillForm(loadedBet);
    else $('betDate').value = todayYmd();
    updateStatusVisibility();
    updateCalc();
    form.hidden = false;
    window.Layout.loadUser();
  }

  form.addEventListener('submit', submit);
  ['odds', 'stake', 'result'].forEach((id) => $(id).addEventListener('input', updateCalc));
  $('result').addEventListener('change', () => { updateStatusVisibility(); updateCalc(); });
  $('sportId').addEventListener('change', buildLeagueList);
  // clear a field's error as soon as the user edits it
  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.classList && el.classList.contains('is-invalid')) {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
      const box = $(`err-${el.name}`);
      if (box) box.textContent = '';
    }
  });

  document.addEventListener('i18n:change', () => {
    if (form.hidden) return;
    const keep = { sport: $('sportId').value, type: $('betType').value, cat: $('categoryId').value };
    buildSelects();
    $('sportId').value = keep.sport;
    $('betType').value = keep.type;
    $('categoryId').value = keep.cat;
    setTitles();
    updateCalc();
  });

  init();
})();
