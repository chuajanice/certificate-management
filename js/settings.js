/* ==========================================================================
   settings.js — barangay details, official images and signatories.
   Saved in localStorage. Only the functions in this file read or write these
   settings, so a backend can later replace getSettings() and saveSettings().
   ========================================================================== */

const SETTINGS_KEY = 'bcms.settings.v1';

/** Sample values for the demonstration. They are clearly fictional. */
const DEFAULT_SETTINGS = {
  barangayName: 'Demo',
  municipality: 'Sample Municipality',
  province: 'Sample Province',
  address: 'Purok 1, Sample Street, Sample Municipality, Sample Province',
  logo: null,   // data URL of the uploaded logo, or null
  seal: null,   // data URL of the uploaded official seal, or null
  signatories: [
    { id: 'sig_secretary', name: 'PEDRO REYES', position: 'Barangay Secretary', signature: null },
    { id: 'sig_treasurer', name: 'ROSA MENDOZA', position: 'Barangay Treasurer', signature: null }
  ],
  issuer: { name: 'MARIA SANTOS', position: 'Barangay Captain', signature: null }
};

/** Placeholder shown in the sidebar until a logo is uploaded. */
const PLACEHOLDER_LOGO = `
  <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#eef3fa" stroke="#1f4e9a" stroke-width="1.5" stroke-dasharray="3 2"/>
    <text x="24" y="28" text-anchor="middle" font-family="Public Sans, sans-serif" font-size="8" fill="#1f4e9a">Logo</text>
  </svg>`;

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Returns saved settings merged over the defaults. */
function getSettings() {
  return { ...cloneData(DEFAULT_SETTINGS), ...loadJSON(SETTINGS_KEY, {}) };
}

/** Saves settings. Returns true only when the browser confirmed the write. */
function saveSettings(settings) {
  return saveJSON(SETTINGS_KEY, settings);
}

/** Updates the sidebar logo and barangay name to match the saved settings. */
function applyBrandToSidebar(s) {
  $('#sidebarLogo').innerHTML = s.logo ? `<img src="${s.logo}" alt="Barangay logo" />` : PLACEHOLDER_LOGO;
  $('#sidebarBarangay').textContent = `Barangay ${s.barangayName}`;
}

/* ---------- Settings page state ----------
   Edits stay in settingsDraft until "Save settings" is pressed. */

let settingsDraft = null;

function openSettingsPage() {
  if (!settingsDraft) settingsDraft = getSettings();
  renderSettingsPage();
}

/** Builds a text input or textarea that is linked to a path in the draft. */
function textField({ id, label, path, sigId, sigField, value = '', multiline = false, maxlength = 120, span = false }) {
  const bind = sigId
    ? `data-sig-id="${sigId}" data-sig-field="${sigField}"`
    : `data-path="${path}"`;
  const control = multiline
    ? `<textarea id="${id}" rows="2" maxlength="${maxlength}" ${bind}>${escapeHtml(value)}</textarea>`
    : `<input id="${id}" type="text" maxlength="${maxlength}" value="${escapeHtml(value)}" ${bind} />`;
  return `<div class="field${span ? ' span-2' : ''}">
    <label for="${id}">${label}</label>${control}<span class="error" aria-live="polite"></span>
  </div>`;
}

/**
 * Upload control for one image. key is "logo", "seal", "issuer" or "sig:<id>".
 * Shows a preview, a Replace/Upload button and a Remove button when an image exists.
 */
function imageUploader(key, label, src) {
  const inputId = `set-img-${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<div class="uploader">
    <div class="uploader-preview">
      ${src ? `<img src="${src}" alt="${escapeHtml(label)} preview" />` : '<span>No image uploaded</span>'}
    </div>
    <div class="uploader-body">
      <span class="uploader-label">${escapeHtml(label)}</span>
      <div class="uploader-actions">
        <label class="btn btn-secondary btn-small" for="${inputId}">${src ? 'Replace image' : 'Upload image'}</label>
        <input id="${inputId}" type="file" accept="image/png,image/jpeg" data-upload="${key}" hidden />
        ${src ? `<button class="btn btn-ghost btn-small" type="button" data-action="remove-image" data-key="${key}">Remove</button>` : ''}
      </div>
      <span class="error" data-error-for="${key}" aria-live="polite"></span>
    </div>
  </div>`;
}

function renderSignatoryRow(p, index, total) {
  return `<div class="sig-row">
    <div class="sig-row-head">
      <strong>Signatory ${index + 1}</strong>
      <div class="row-actions">
        <button class="btn btn-ghost btn-small" type="button" data-action="move-signatory" data-id="${p.id}" data-dir="-1" ${index === 0 ? 'disabled' : ''}>Move up</button>
        <button class="btn btn-ghost btn-small" type="button" data-action="move-signatory" data-id="${p.id}" data-dir="1" ${index === total - 1 ? 'disabled' : ''}>Move down</button>
        <button class="btn btn-danger btn-small" type="button" data-action="remove-signatory" data-id="${p.id}">Remove</button>
      </div>
    </div>
    <div class="form-grid">
      ${textField({ id: `set-sig-name-${p.id}`, label: 'Full name', sigId: p.id, sigField: 'name', value: p.name })}
      ${textField({ id: `set-sig-pos-${p.id}`, label: 'Official position', sigId: p.id, sigField: 'position', value: p.position })}
    </div>
    ${imageUploader(`sig:${p.id}`, 'Signature image', p.signature)}
  </div>`;
}

function renderSettingsPage() {
  const s = settingsDraft;
  const sigRows = s.signatories.length
    ? s.signatories.map((p, i) => renderSignatoryRow(p, i, s.signatories.length)).join('')
    : '<p class="empty">No signatories yet. Add one so names appear on certificates.</p>';

  $('#settingsRoot').innerHTML = `
    <div class="settings-grid">
      <section class="card">
        <h2>Barangay information</h2>
        <p class="field-hint">Printed in the header of every certificate.</p>
        <div class="form-grid mt">
          ${textField({ id: 'set-barangay', label: 'Barangay name', path: 'barangayName', value: s.barangayName, maxlength: 80 })}
          ${textField({ id: 'set-municipality', label: 'Municipality', path: 'municipality', value: s.municipality, maxlength: 80 })}
          ${textField({ id: 'set-province', label: 'Province', path: 'province', value: s.province, maxlength: 80 })}
          ${textField({ id: 'set-address', label: 'Complete barangay address', path: 'address', value: s.address, multiline: true, maxlength: 200, span: true })}
        </div>
      </section>

      <section class="card">
        <h2>Logo and seal</h2>
        <p class="field-hint">PNG or JPG, up to 1 MB each. Images keep their proportions inside the certificate frame.</p>
        ${imageUploader('logo', 'Barangay logo', s.logo)}
        ${imageUploader('seal', 'Official barangay seal', s.seal)}
      </section>
    </div>

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Signatories</h2>
          <p class="field-hint">Shown on the right side of each certificate, in this order.</p>
        </div>
        <button class="btn btn-secondary" type="button" data-action="add-signatory">Add signatory</button>
      </div>
      ${sigRows}
    </section>

    <section class="card">
      <h2>Authorized issuer</h2>
      <p class="field-hint">The person authorized to issue or approve certificates. Shown below the signatories.</p>
      <div class="form-grid mt">
        ${textField({ id: 'set-issuer-name', label: 'Full name', path: 'issuer.name', value: s.issuer.name })}
        ${textField({ id: 'set-issuer-position', label: 'Official position', path: 'issuer.position', value: s.issuer.position })}
      </div>
      ${imageUploader('issuer', 'Signature image', s.issuer.signature)}
    </section>

    <section class="card">
      <h2>Demonstration data</h2>
      <p class="field-hint">Reset fills the form with sample barangay details. Load sample records adds example requests. Clear all records deletes every request saved in this browser.</p>
      <div class="form-actions left">
        <button class="btn btn-ghost" type="button" data-action="reset-settings">Reset to sample settings</button>
        <button class="btn btn-ghost" type="button" data-action="load-samples">Load sample records</button>
        <button class="btn btn-danger" type="button" data-action="clear-records">Clear all records</button>
      </div>
    </section>`;
}

/** Wires the settings page. Called once at startup. */
function wireSettingsPage() {
  const root = $('#settingsRoot');

  // Text edits update the draft only. The page is not redrawn, so typing keeps focus.
  root.addEventListener('input', e => {
    const el = e.target;
    if (!(el.dataset.path || el.dataset.sigId)) return;
    applyDraftValue(el);
    setFieldError(el, '');
  });

  root.addEventListener('change', e => {
    if (e.target.matches('input[type="file"][data-upload]')) handleImageUpload(e.target);
  });

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) handleSettingsAction(btn);
  });

  $('#settingsSave').addEventListener('click', saveSettingsDraft);
  $('#settingsDiscard').addEventListener('click', () => {
    settingsDraft = getSettings();
    renderSettingsPage();
    toast('Unsaved changes discarded.', 'info');
  });
}

/** Copies a text input's value into the draft, using its data-path or signatory binding. */
function applyDraftValue(el) {
  if (el.dataset.sigId) {
    const p = settingsDraft.signatories.find(x => x.id === el.dataset.sigId);
    if (p) p[el.dataset.sigField] = el.value;
    return;
  }
  const parts = el.dataset.path.split('.');
  let target = settingsDraft;
  parts.slice(0, -1).forEach(k => { target = target[k]; });
  target[parts[parts.length - 1]] = el.value;
}

/** Stores an image (or null to remove it) in the draft under the given key. */
function assignImage(key, value) {
  if (key === 'logo' || key === 'seal') settingsDraft[key] = value;
  else if (key === 'issuer') settingsDraft.issuer.signature = value;
  else if (key.startsWith('sig:')) {
    const p = settingsDraft.signatories.find(x => x.id === key.slice(4));
    if (p) p.signature = value;
  }
}

async function handleImageUpload(input) {
  const key = input.dataset.upload;
  try {
    const dataUrl = await readImageFile(input.files[0]);
    assignImage(key, dataUrl);
    renderSettingsPage();
    toast('Image added. Save settings to apply it to certificates.', 'info');
  } catch (err) {
    const msgEl = $(`[data-error-for="${CSS.escape(key)}"]`);
    if (msgEl) msgEl.textContent = err.message;
    input.value = ''; // allow choosing the same file again after fixing it
  }
}

function handleSettingsAction(btn) {
  const { action, id, dir, key } = btn.dataset;

  switch (action) {
    case 'add-signatory':
      settingsDraft.signatories.push({ id: uid('sig'), name: '', position: '', signature: null });
      renderSettingsPage();
      break;

    case 'move-signatory':
      moveSignatory(id, Number(dir));
      break;

    case 'remove-signatory':
      confirmAction('Remove this signatory from the form? The change applies after you save settings.', 'Remove', () => {
        settingsDraft.signatories = settingsDraft.signatories.filter(p => p.id !== id);
        renderSettingsPage();
      });
      break;

    case 'remove-image':
      assignImage(key, null);
      renderSettingsPage();
      break;

    case 'reset-settings':
      confirmAction('Replace the form values with sample barangay details? Save settings to apply them.', 'Reset', () => {
        settingsDraft = cloneData(DEFAULT_SETTINGS);
        renderSettingsPage();
        toast('Sample values restored in the form. Save settings to apply them.', 'info');
      });
      break;

    case 'load-samples':
      confirmAction('Add sample certificate requests to the records? Existing records are kept.', 'Add samples', () => {
        if (addSampleRecords()) toast('Sample records added.', 'success');
        else toast('Sample records could not be saved. Browser storage may be full.', 'error');
      });
      break;

    case 'clear-records':
      confirmAction('Delete every certificate request saved in this browser? This cannot be undone.', 'Delete all', () => {
        if (clearAllRecords()) toast('All records were deleted.', 'success');
        else toast('Records could not be deleted. Try again.', 'error');
      });
      break;
  }
}

function moveSignatory(id, dir) {
  const list = settingsDraft.signatories;
  const i = list.findIndex(p => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  renderSettingsPage();
}

/** Checks required settings. Returns a list of { el, msg } problems. */
function validateSettings(s) {
  const errors = [];
  const need = (path, label, value) => {
    if (!value.trim()) errors.push({ el: $(`[data-path="${path}"]`), msg: `Enter the ${label}.` });
  };
  need('barangayName', 'barangay name', s.barangayName);
  need('municipality', 'municipality', s.municipality);
  need('province', 'province', s.province);
  need('address', 'complete address', s.address);
  need('issuer.name', 'issuer name', s.issuer.name);
  need('issuer.position', 'issuer position', s.issuer.position);

  s.signatories.forEach(p => {
    if (!p.name.trim()) errors.push({ el: $(`[data-sig-id="${p.id}"][data-sig-field="name"]`), msg: 'Enter the signatory name.' });
    if (!p.position.trim()) errors.push({ el: $(`[data-sig-id="${p.id}"][data-sig-field="position"]`), msg: 'Enter the official position.' });
  });
  return errors;
}

function saveSettingsDraft() {
  $$('#settingsRoot .error').forEach(e => { e.textContent = ''; });

  const errors = validateSettings(settingsDraft);
  if (errors.length) {
    errors.forEach(({ el, msg }) => setFieldError(el, msg));
    if (errors[0].el) errors[0].el.focus();
    toast('Please complete the highlighted fields.', 'error');
    return;
  }

  // Store the name without a leading "Barangay", so the certificate does not print it twice.
  settingsDraft.barangayName = settingsDraft.barangayName.trim().replace(/^barangay\s+/i, '');

  if (!saveSettings(settingsDraft)) {
    toast('Settings could not be saved. Browser storage may be full. Try smaller images.', 'error');
    return;
  }
  applyBrandToSidebar(settingsDraft);
  toast('Settings saved. New certificates will use these details.', 'success');
  renderSettingsPage();
}
