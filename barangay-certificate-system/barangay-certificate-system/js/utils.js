/* ==========================================================================
   utils.js — shared helpers used by every other script.
   ========================================================================== */

/* ---------- DOM shortcuts ---------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ---------- Safety and formatting ---------- */

/** Escapes user-entered text so it can be placed inside HTML without injecting markup. */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

/** Formal date, e.g. "November 16, 2026". Uses today when no ISO string is given. */
function formatDate(iso) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Local calendar day as YYYY-MM-DD, used by the records date filter. */
function localDateKey(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Short unique id for records and signatories. */
function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Filename-safe text, e.g. "Juan Dela Cruz" becomes "Juan_Dela_Cruz". */
function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Record';
}

/* ---------- localStorage wrappers ----------
   These never throw. They return false when the browser refuses a write
   (for example, when storage is full), so callers can report the real outcome. */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.error(`Could not read "${key}" from localStorage.`, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Could not write "${key}" to localStorage.`, err);
    return false;
  }
}

/* ---------- Notifications ---------- */

/** Shows a toast. Use "success" only after an operation has actually completed. */
function toast(message, type = 'info', duration = 3800) {
  const wrap = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ---------- Modal dialog ---------- */

/**
 * Opens the shared dialog.
 * buttons: [{ label, className, onClick, close }]. The dialog closes after a button
 * is clicked unless close is set to false.
 */
function openModal({ title, bodyHtml = '', buttons = [] }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  const foot = $('#modalFoot');
  foot.innerHTML = '';

  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${b.className || 'btn-ghost'}`;
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      if (b.onClick) b.onClick();
      if (b.close !== false) closeModal();
    });
    foot.appendChild(btn);
  });

  $('#modal').hidden = false;
  (buttons.length ? foot.querySelector('button') : $('#modalClose')).focus();
}

function closeModal() {
  $('#modal').hidden = true;
}

/** Asks the user to confirm a destructive action before running it. */
function confirmAction(message, confirmLabel, onConfirm) {
  openModal({
    title: 'Please confirm',
    bodyHtml: `<p>${escapeHtml(message)}</p>`,
    buttons: [
      { label: 'Cancel', className: 'btn-ghost' },
      { label: confirmLabel, className: 'btn-danger', onClick: onConfirm }
    ]
  });
}

/* ---------- Form field errors ---------- */

/** Shows (or clears, when msg is empty) the error message belonging to an input. */
function setFieldError(el, msg) {
  if (!el) return;
  const field = el.closest('.field');
  const err = field && field.querySelector('.error');
  if (err) err.textContent = msg || '';
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

/* ---------- Image uploads ---------- */

const IMAGE_TYPES = ['image/png', 'image/jpeg'];
const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB keeps images well inside the browser's ~5 MB localStorage limit

/**
 * Validates an uploaded PNG or JPG and returns it as a data URL.
 * Rejects with a readable message when the file is not acceptable.
 */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file was selected.'));
    if (!IMAGE_TYPES.includes(file.type)) return reject(new Error('Choose a PNG or JPG image.'));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('This image is larger than 1 MB. Resize it and try again.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}
