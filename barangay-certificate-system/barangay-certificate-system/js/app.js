/* ==========================================================================
   app.js — entry point. Handles page routing (URL hash), the dashboard, the
   two certificate forms, and global events. Loaded last.
   Script order: utils → settings → records → certificates → export → app.
   ========================================================================== */

const PAGE_IDS = ['dashboard', 'indigency', 'residency', 'records', 'settings', 'preview'];

/** Functions that refresh a page each time it is shown. Forms need no refresh. */
const pageRenderers = {
  dashboard: renderDashboard,
  records: renderRecords,
  settings: openSettingsPage,
  preview: renderPreview
};

/* ---------- Routing ---------- */

function showPage(name) {
  if (!PAGE_IDS.includes(name)) name = 'dashboard';

  // The preview needs a record. Without one (for example after a page reload), go to the dashboard.
  if (name === 'preview' && !currentPreview) {
    location.hash = '#dashboard';
    return;
  }

  $$('.page').forEach(section => { section.hidden = section.id !== `page-${name}`; });
  $$('.nav a').forEach(a => {
    const active = a.dataset.page === name;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  setSidebar(false);
  if (pageRenderers[name]) pageRenderers[name]();
  window.scrollTo(0, 0);
}

/** Opens or closes the navigation drawer on small screens. */
function setSidebar(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#scrim').hidden = !open;
  $('#menuToggle').setAttribute('aria-expanded', String(open));
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const all = loadRecords();
  $('#statRequests').textContent = all.length;
  $('#statGenerated').textContent = all.filter(r => r.issued).length;
  $('#statIndigency').textContent = all.filter(r => r.type === 'indigency').length;
  $('#statResidency').textContent = all.filter(r => r.type === 'residency').length;

  const recent = [...all]
    .sort((a, b) => b.dateGenerated.localeCompare(a.dateGenerated))
    .slice(0, 8);

  $('#recentBody').innerHTML = recent.length
    ? recent.map(r => `<tr>
        <td><strong>${escapeHtml(r.fullName)}</strong>${r.sample ? ' <span class="tag">Sample</span>' : ''}</td>
        <td>${typeLabel(r.type)}</td>
        <td>${escapeHtml(r.purpose)}</td>
        <td>${formatDate(r.dateGenerated)}</td>
        <td><button class="btn btn-ghost btn-small" type="button" data-dash-preview="${r.id}">Preview</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="empty-cell">No requests yet. Generate a certificate to see it here.</td></tr>';
}

function wireDashboard() {
  $('#recentBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-dash-preview]');
    if (!btn) return;
    const rec = loadRecords().find(r => r.id === btn.dataset.dashPreview);
    if (rec) openPreview(rec, null, 'dashboard');
  });
}

/* ---------- Validation rules ---------- */

function requiredRule(label) {
  return v => (v ? null : `Enter the ${label}.`);
}

function choiceRule(label) {
  return v => (v ? null : `Select the ${label}.`);
}

function nameRule(v) {
  if (!v) return 'Enter the full name.';
  if (v.length < 2) return 'Enter at least 2 characters.';
  if (!/^[\p{L}\s.'-]+$/u.test(v)) return 'Use letters, spaces, periods, apostrophes or hyphens only.';
  return null;
}

function ageRule(v) {
  if (!v) return 'Enter the age.';
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 150 ? null : 'Enter a whole number from 1 to 150.';
}

const INDIGENCY_RULES = {
  fullName: nameRule,
  gender: choiceRule('gender'),
  civilStatus: choiceRule('civil status'),
  purpose: requiredRule('purpose')
};

const RESIDENCY_RULES = {
  fullName: nameRule,
  age: ageRule,
  gender: choiceRule('gender'),
  civilStatus: choiceRule('civil status'),
  nationality: requiredRule('nationality'),
  residencyStatus: choiceRule('residency status'),
  address: requiredRule('complete address'),
  purpose: requiredRule('purpose')
};

/** Checks each rule, shows messages next to the fields, and focuses the first problem. */
function validateFields(form, rules) {
  let first = null;
  Object.entries(rules).forEach(([name, rule]) => {
    const el = form.elements[name];
    const msg = rule(el.value.trim());
    setFieldError(el, msg);
    if (msg && !first) first = el;
  });
  if (first) first.focus();
  return !first;
}

function readFields(form) {
  const data = {};
  Array.from(form.elements).forEach(el => { if (el.name) data[el.name] = el.value.trim(); });
  return data;
}

function clearFormErrors(form) {
  $$('.error', form).forEach(e => { e.textContent = ''; });
  $$('[aria-invalid]', form).forEach(el => el.setAttribute('aria-invalid', 'false'));
}

/* ---------- Certificate generation ---------- */

let isSubmitting = false; // blocks a second submit while one is in progress

/**
 * Validates, saves and previews one certificate. The success message is shown
 * only when the record was actually saved.
 */
function handleGenerate(type, form, rules, button) {
  if (isSubmitting) return;
  if (!validateFields(form, rules)) {
    toast('Please complete the highlighted fields.', 'error');
    return;
  }

  isSubmitting = true;
  button.disabled = true;
  try {
    const v = readFields(form);
    const isResidency = type === 'residency';
    const record = {
      id: uid('rec'),
      type,
      fullName: v.fullName,
      gender: v.gender,
      civilStatus: v.civilStatus,
      purpose: v.purpose,
      age: isResidency ? Number(v.age) : null,
      nationality: isResidency ? v.nationality : '',
      residencyStatus: isResidency ? v.residencyStatus : '',
      address: isResidency ? v.address : '',
      requestedBy: isResidency ? (v.requestedBy || 'Bearer') : '',
      relationship: isResidency ? v.relationship : '',
      dateGenerated: new Date().toISOString(),
      issued: false,
      sample: false
    };

    const saved = addRecord(record);
    if (saved) toast('Certificate generated and saved to records.', 'success');
    else toast('Certificate generated, but it could not be saved to records. Browser storage may be full.', 'warning');

    form.reset();
    openPreview(record, null, type);
  } finally {
    isSubmitting = false;
    button.disabled = false;
  }
}

function wireForms() {
  const indigencyForm = $('#indigencyForm');
  const residencyForm = $('#residencyForm');

  indigencyForm.addEventListener('submit', e => {
    e.preventDefault();
    handleGenerate('indigency', indigencyForm, INDIGENCY_RULES, $('#indigencySubmit'));
  });
  residencyForm.addEventListener('submit', e => {
    e.preventDefault();
    handleGenerate('residency', residencyForm, RESIDENCY_RULES, $('#residencySubmit'));
  });

  [indigencyForm, residencyForm].forEach(form => {
    // Clear a field's error as soon as the user corrects it
    const clearIfInvalid = e => {
      if (e.target.getAttribute('aria-invalid') === 'true') setFieldError(e.target, '');
    };
    form.addEventListener('input', clearIfInvalid);
    form.addEventListener('change', clearIfInvalid);
    form.addEventListener('reset', () => setTimeout(() => clearFormErrors(form), 0));
  });
}

/* ---------- Startup ---------- */

document.addEventListener('DOMContentLoaded', () => {
  $('#menuToggle').addEventListener('click', () => {
    setSidebar(!$('#sidebar').classList.contains('open'));
  });
  $('#scrim').addEventListener('click', () => setSidebar(false));

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#modal').hidden) closeModal();
    else setSidebar(false);
  });

  wireForms();
  wireDashboard();
  wirePreview();
  wireRecords();
  wireSettingsPage();

  applyBrandToSidebar(getSettings());

  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
  showPage(location.hash.slice(1));
});
