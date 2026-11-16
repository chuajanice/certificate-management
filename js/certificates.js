/* ==========================================================================
   certificates.js — builds the A4 certificate documents, the preview page,
   printing and PDF download.

   Wording note: the sentences below are drafted for demonstration. Barangay
   officials should review and adjust them to match their official forms.
   ========================================================================== */

let currentPreview = null;        // record shown on the preview page
let previewReturn = 'dashboard';  // page the preview's "Back" button returns to
let pendingPreviewAction = null;  // 'print' or 'pdf', run once the preview is drawn

const PX_PER_MM = 96 / 25.4;      // CSS pixels per millimetre (A4 is 794 x 1123 px)

const BACK_LABELS = {
  dashboard: 'Back to dashboard',
  indigency: 'Back to form',
  residency: 'Back to form',
  records: 'Back to records'
};

/** Pronouns and honorifics from gender. "Other" uses neutral wording. */
function pronounsFor(gender) {
  if (gender === 'Male') return { title: 'Mr.', subject: 'He', possessive: 'his' };
  if (gender === 'Female') return { title: 'Ms.', subject: 'She', possessive: 'her' };
  return { title: '', subject: 'They', possessive: 'their' };
}

/** Residency sentence for each residency status. */
const STATUS_CLAUSES = {
  'Live': (place, addr) =>
    `is a bona fide resident of ${place}, residing at ${addr}`,
  'Leave': (place, addr) =>
    `was a bona fide resident of ${place}, residing at ${addr}, and has since left the barangay`,
  'Force to Leave': (place, addr) =>
    `was a bona fide resident of ${place}, residing at ${addr}, and was forced to leave the barangay`
};

/**
 * Returns the full HTML of one A4 certificate sheet for a record.
 * Every user-entered value passes through escapeHtml().
 */
function buildCertificateHTML(rec, s) {
  const p = pronounsFor(rec.gender);
  const holder = escapeHtml(`${p.title ? p.title + ' ' : ''}${rec.fullName}`.toUpperCase());
  const civil = escapeHtml(rec.civilStatus.toLowerCase());
  const purpose = escapeHtml(rec.purpose);
  const place = escapeHtml(`Barangay ${s.barangayName}, ${s.municipality}, ${s.province}`);

  let title;
  let paragraphs;

  if (rec.type === 'indigency') {
    title = 'CERTIFICATE OF INDIGENCY';
    paragraphs = [
      'TO WHOM IT MAY CONCERN:',
      `This is to certify that <strong>${holder}</strong>, who is ${civil}, is a resident of ${place} and belongs to the indigent sector of this community, as verified by the records of this office.`,
      `${p.subject} has no sufficient source of income to support ${p.possessive} basic needs.`,
      `This certification is issued upon the request of the interested party for the purpose of <strong>${purpose}</strong>.`
    ];
  } else {
    title = 'CERTIFICATE OF RESIDENCY';
    const clause = (STATUS_CLAUSES[rec.residencyStatus] || STATUS_CLAUSES['Live'])(place, escapeHtml(rec.address));
    const requester = escapeHtml(rec.requestedBy || 'Bearer') +
      (rec.relationship ? ` (${escapeHtml(rec.relationship)})` : '');
    paragraphs = [
      `This is to certify that <strong>${holder}</strong>, ${Number(rec.age)} years old, ${civil}, of ${escapeHtml(rec.nationality)} nationality, ${clause}.`,
      `This certification is issued for the purpose of <strong>${purpose}</strong>.`,
      // Required statement, with pronouns adjusted for the selected gender
      `Upon ${p.possessive} verbal request in connection with ${p.possessive} desire for any legal requirements purposes.`,
      `Certificate issued upon request of: <strong>${requester}</strong>`
    ];
  }

  const signatureBlock = (img, name, position) => `
    <div class="sig">
      <div class="sig-area">${img ? `<img src="${img}" alt="" />` : ''}</div>
      <div class="sig-name">${escapeHtml(name)}</div>
      <div class="sig-pos">${escapeHtml(position)}</div>
    </div>`;

  const signers = s.signatories.map(x => signatureBlock(x.signature, x.name, x.position)).join('');
  const issuer = signatureBlock(s.issuer.signature, s.issuer.name, s.issuer.position);

  return `
  <div class="cert-sheet">
    <div class="cert-watermark" aria-hidden="true">SAMPLE</div>

    <header class="cert-head">
      <div class="cert-logo ${s.logo ? 'filled' : ''}">
        ${s.logo ? `<img src="${s.logo}" alt="Barangay logo" />` : '<span class="ph">Barangay logo</span>'}
      </div>
      <div class="cert-address">
        <div>Republic of the Philippines</div>
        <div>Province of ${escapeHtml(s.province)}</div>
        <div>Municipality of ${escapeHtml(s.municipality)}</div>
        <div class="cert-brgy">Barangay ${escapeHtml(s.barangayName)}</div>
        <div class="cert-addr">${escapeHtml(s.address)}</div>
      </div>
      <div class="cert-seal ${s.seal ? 'filled' : ''}">
        ${s.seal ? `<img src="${s.seal}" alt="Official barangay seal" />` : '<span class="ph">Seal placeholder</span>'}
      </div>
    </header>

    <div class="cert-rule"></div>

    <h2 class="cert-title">${title}</h2>

    <div class="cert-body">
      ${paragraphs.map(t => `<p>${t}</p>`).join('')}
    </div>

    <footer class="cert-foot">
      <div class="cert-ref">
        <div>Reference no.: <strong>${referenceNo(rec)}</strong></div>
        <div>Date issued: ${formatDate(rec.dateGenerated)}</div>
      </div>
      <div class="cert-signs">${signers}${issuer}</div>
    </footer>

    <div class="cert-disclaimer">NOT VALID WITHOUT OFFICIAL BARANGAY SEAL</div>
    <p class="cert-sample">SAMPLE DOCUMENT · DEMONSTRATION ONLY · NOT AN OFFICIAL RECORD</p>
  </div>`;
}

/* ---------- Preview page ---------- */

/** Opens the preview page for a record. action can be null, 'print' or 'pdf'. */
function openPreview(rec, action = null, returnPage = 'dashboard') {
  currentPreview = rec;
  pendingPreviewAction = action;
  previewReturn = returnPage;
  if (location.hash !== '#preview') location.hash = 'preview';
  showPage('preview');
}

function renderPreview() {
  if (!currentPreview) return;

  $('#previewFit').innerHTML = buildCertificateHTML(currentPreview, getSettings());
  $('#previewMeta').textContent =
    `${typeLabel(currentPreview.type)} for ${currentPreview.fullName} · ${referenceNo(currentPreview)}`;
  $('#previewBack').textContent = BACK_LABELS[previewReturn] || 'Back';
  fitPreview();

  const action = pendingPreviewAction;
  pendingPreviewAction = null;
  if (action === 'print') setTimeout(printCertificate, 300);
  if (action === 'pdf') setTimeout(downloadPdf, 300);
}

/**
 * Scales the A4 sheet down to fit narrow screens. The sheet is never
 * distorted: scaling is uniform and only shrinks it. Print and PDF ignore this.
 */
function fitPreview() {
  const stage = $('#previewStage');
  const fit = $('#previewFit');
  const sheet = fit.querySelector('.cert-sheet');
  if (!sheet) return;

  const fullW = 210 * PX_PER_MM;
  const fullH = 297 * PX_PER_MM;
  const available = stage.clientWidth - 32; // stage padding on both sides
  const scale = Math.min(1, available / fullW);

  fit.style.width = `${fullW * scale}px`;
  fit.style.height = `${fullH * scale}px`;
  sheet.style.transform = `scale(${scale})`;
}

function printCertificate() {
  if (!currentPreview) {
    toast('Open a certificate before printing.', 'warning');
    return;
  }
  window.print();
  markIssued(currentPreview.id);
  currentPreview.issued = true;
}

/** Creates a PDF from a fresh, unscaled copy of the sheet at exact A4 size. */
async function downloadPdf() {
  if (!currentPreview) {
    toast('Open a certificate before downloading.', 'warning');
    return;
  }
  if (typeof html2pdf === 'undefined') {
    toast('The PDF library could not be loaded. Check your internet connection, or use Print instead.', 'error');
    return;
  }

  const rec = currentPreview;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-10000px;top:0;';
  holder.innerHTML = buildCertificateHTML(rec, getSettings());
  document.body.appendChild(holder);

  const filename = `${typeFileName(rec.type)}_${slugify(rec.fullName)}_${rec.id.slice(-6)}.pdf`;
  toast('Preparing PDF…', 'info', 2000);

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
      })
      .from(holder.querySelector('.cert-sheet'))
      .save();
    markIssued(rec.id);
    rec.issued = true;
    toast(`PDF downloaded: ${filename}`, 'success');
  } catch (err) {
    console.error(err);
    toast('The PDF could not be created. Try again, or use Print instead.', 'error');
  } finally {
    holder.remove();
  }
}

function wirePreview() {
  $('#previewBack').addEventListener('click', () => { location.hash = `#${previewReturn}`; });
  $('#previewPrint').addEventListener('click', printCertificate);
  $('#previewPdf').addEventListener('click', downloadPdf);
  window.addEventListener('resize', () => {
    if (!$('#page-preview').hidden) fitPreview();
  });
}
