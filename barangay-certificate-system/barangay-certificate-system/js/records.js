/* ==========================================================================
   records.js — certificate request records.
   All reads and writes of records happen in the functions below, so a backend
   API can replace them later without changing the pages.
   ========================================================================== */

const RECORDS_KEY = 'bcms.records.v1';

/** Current state of the Records Management page. */
const recordsView = { type: 'indigency', search: '', date: '', sort: 'desc' };

/* ---------- Labels and identifiers ---------- */

function typeLabel(type) {
  return type === 'indigency' ? 'Certificate of Indigency' : 'Certificate of Residency';
}

function typeFileName(type) {
  return type === 'indigency' ? 'Certificate_of_Indigency' : 'Certificate_of_Residency';
}

/** Reference number printed on the certificate, e.g. BCMS-IND-4F2A9C. */
function referenceNo(rec) {
  return `BCMS-${rec.type === 'indigency' ? 'IND' : 'RES'}-${rec.id.slice(-6).toUpperCase()}`;
}

/* ---------- Storage ---------- */

/** Returns all records. On first run, sample records are saved so the dashboard is not empty. */
function loadRecords() {
  const stored = loadJSON(RECORDS_KEY, null);
  if (stored === null) {
    const samples = buildSampleRecords();
    saveJSON(RECORDS_KEY, samples);
    return samples;
  }
  return Array.isArray(stored) ? stored : [];
}

function saveRecords(list) {
  return saveJSON(RECORDS_KEY, list);
}

/** Adds a new certificate request. Returns true only if it was saved. */
function addRecord(record) {
  const list = loadRecords();
  list.push(record);
  return saveRecords(list);
}

/** Marks a record as printed or downloaded (used for the "generated" dashboard count). */
function markIssued(id) {
  const list = loadRecords();
  const rec = list.find(r => r.id === id);
  if (!rec) return false;
  rec.issued = true;
  return saveRecords(list);
}

function deleteRecord(id) {
  return saveRecords(loadRecords().filter(r => r.id !== id));
}

function clearAllRecords() {
  return saveRecords([]);
}

function addSampleRecords() {
  return saveRecords([...loadRecords(), ...buildSampleRecords()]);
}

/** Example requests for the demonstration. Each one is marked "Sample". */
function buildSampleRecords() {
  const DAY = 24 * 60 * 60 * 1000;
  const rows = [
    { type: 'indigency', fullName: 'Juan Dela Cruz', gender: 'Male', civilStatus: 'Married', purpose: 'Medical assistance', daysAgo: 0.2, issued: true },
    { type: 'residency', fullName: 'Maria Clara Reyes', gender: 'Female', civilStatus: 'Single', age: 34, nationality: 'Filipino', residencyStatus: 'Live', address: 'Purok 2, Sample Street', purpose: 'Bank account opening', requestedBy: 'Bearer', relationship: '', daysAgo: 1.1, issued: true },
    { type: 'indigency', fullName: 'Ramon Bautista', gender: 'Male', civilStatus: 'Widowed', purpose: 'Scholarship application', daysAgo: 2.5 },
    { type: 'residency', fullName: 'Liza Fernandez', gender: 'Female', civilStatus: 'Separated', age: 41, nationality: 'Filipino', residencyStatus: 'Force to Leave', address: 'Purok 4, Sample Street', purpose: 'Legal requirements', requestedBy: 'Carlo Fernandez', relationship: 'Son', daysAgo: 3.7, issued: true },
    { type: 'indigency', fullName: 'Angelica Ramos', gender: 'Female', civilStatus: 'Single', purpose: 'Burial assistance', daysAgo: 5, issued: true },
    { type: 'residency', fullName: 'Carlo Villanueva', gender: 'Male', civilStatus: 'Married', age: 29, nationality: 'Filipino', residencyStatus: 'Leave', address: 'Purok 1, Sample Street', purpose: 'Employment requirements', requestedBy: 'Bearer', relationship: '', daysAgo: 6.4 }
  ];

  return rows.map(({ daysAgo, ...r }) => ({
    id: uid('rec'),
    age: null,
    nationality: '',
    residencyStatus: '',
    address: '',
    requestedBy: '',
    relationship: '',
    ...r,
    issued: r.issued === true,
    sample: true,
    dateGenerated: new Date(Date.now() - daysAgo * DAY).toISOString()
  }));
}

/* ---------- Records Management page ---------- */

function renderRecords() {
  const all = loadRecords();
  const type = recordsView.type;
  const ofType = all.filter(r => r.type === type);

  $$('.tab').forEach(tab => {
    const on = tab.dataset.type === type;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  $$('[data-count]').forEach(el => {
    el.textContent = `(${all.filter(r => r.type === el.dataset.count).length})`;
  });

  const search = recordsView.search.trim().toLowerCase();
  const rows = ofType
    .filter(r => !search || r.fullName.toLowerCase().includes(search))
    .filter(r => !recordsView.date || localDateKey(r.dateGenerated) === recordsView.date)
    .sort((a, b) => recordsView.sort === 'asc'
      ? a.dateGenerated.localeCompare(b.dateGenerated)
      : b.dateGenerated.localeCompare(a.dateGenerated));

  $('#recordsBody').innerHTML = rows.map(recordRowHtml).join('');

  const empty = $('#recordsEmpty');
  if (!ofType.length) {
    empty.textContent = `No ${typeLabel(type)} records yet. Generate one from the ${typeLabel(type)} page.`;
    empty.hidden = false;
  } else if (!rows.length) {
    empty.textContent = 'No records match the current search or date filter.';
    empty.hidden = false;
  } else {
    empty.hidden = true;
  }
}

function recordRowHtml(r) {
  const sample = r.sample ? '<span class="tag">Sample</span>' : '';
  return `<tr>
    <td><strong>${escapeHtml(r.fullName)}</strong>${sample}</td>
    <td>${escapeHtml(r.gender)}</td>
    <td>${escapeHtml(r.purpose)}</td>
    <td>${formatDate(r.dateGenerated)}</td>
    <td>
      <div class="actions">
        <button class="btn btn-ghost btn-small" type="button" data-rec-action="details" data-id="${r.id}">Details</button>
        <button class="btn btn-ghost btn-small" type="button" data-rec-action="preview" data-id="${r.id}">Preview</button>
        <button class="btn btn-ghost btn-small" type="button" data-rec-action="print" data-id="${r.id}">Print</button>
        <button class="btn btn-ghost btn-small" type="button" data-rec-action="pdf" data-id="${r.id}">PDF</button>
        <button class="btn btn-danger btn-small" type="button" data-rec-action="delete" data-id="${r.id}">Delete</button>
      </div>
    </td>
  </tr>`;
}

function showRecordDetails(rec) {
  const rows = [
    ['Certificate', typeLabel(rec.type)],
    ['Reference no.', referenceNo(rec)],
    ['Full name', rec.fullName],
    ['Gender', rec.gender],
    ['Civil status', rec.civilStatus]
  ];
  if (rec.type === 'residency') {
    rows.push(
      ['Age', rec.age],
      ['Nationality', rec.nationality],
      ['Residency status', rec.residencyStatus],
      ['Complete address', rec.address],
      ['Requested by', rec.requestedBy],
      ['Relationship', rec.relationship || '—']
    );
  }
  rows.push(
    ['Purpose', rec.purpose],
    ['Date generated', formatDate(rec.dateGenerated)],
    ['Printed or downloaded', rec.issued ? 'Yes' : 'Not yet']
  );

  openModal({
    title: 'Record details',
    bodyHtml: `<dl class="details">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>`,
    buttons: [
      { label: 'Close', className: 'btn-ghost' },
      { label: 'Preview', className: 'btn-primary', onClick: () => openPreview(rec, null, 'records') }
    ]
  });
}

function wireRecords() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    recordsView.type = tab.dataset.type;
    renderRecords();
  }));

  $('#recSearch').addEventListener('input', e => { recordsView.search = e.target.value; renderRecords(); });
  $('#recDate').addEventListener('change', e => { recordsView.date = e.target.value; renderRecords(); });
  $('#recSort').addEventListener('change', e => { recordsView.sort = e.target.value; renderRecords(); });

  $('#clearFilters').addEventListener('click', () => {
    Object.assign(recordsView, { search: '', date: '', sort: 'desc' });
    $('#recSearch').value = '';
    $('#recDate').value = '';
    $('#recSort').value = 'desc';
    renderRecords();
  });

  $('#exportBtn').addEventListener('click', () => exportRecordsToExcel(recordsView.type));

  $('#recordsBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-rec-action]');
    if (!btn) return;
    const rec = loadRecords().find(r => r.id === btn.dataset.id);
    if (!rec) {
      toast('This record no longer exists.', 'warning');
      renderRecords();
      return;
    }

    switch (btn.dataset.recAction) {
      case 'details': showRecordDetails(rec); break;
      case 'preview': openPreview(rec, null, 'records'); break;
      case 'print': openPreview(rec, 'print', 'records'); break;
      case 'pdf': openPreview(rec, 'pdf', 'records'); break;
      case 'delete':
        confirmAction(`Delete the request for ${rec.fullName}? This cannot be undone.`, 'Delete', () => {
          if (deleteRecord(rec.id)) toast('Record deleted.', 'success');
          else toast('The record could not be deleted. Try again.', 'error');
          renderRecords();
        });
        break;
    }
  });
}
