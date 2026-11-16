# Barangay Certificate Management System

A browser-based prototype for generating **Certificates of Indigency** and **Certificates of Residency**. Built with HTML5, CSS3 and vanilla JavaScript. No frameworks and no backend server.

> **Demonstration prototype.** All sample data, barangay details, certificates and records are fictional. Every generated document is marked as a sample. Replace the sample barangay details in Settings before any real use.

---

## Running the project

### Option 1: Local web server (recommended)

Open a terminal in the project folder and run one of these:

```bash
# Python 3
python -m http.server 8000

# Node.js (if installed)
npx serve .
```

Then open **http://localhost:8000** in Chrome, Edge, Firefox or Safari.

### Option 2: Double-click `index.html`

This works in most browsers. Some browsers limit localStorage for local files, so Option 1 is more reliable.

### Internet connection

The app loads three things from public CDNs when the page opens. An internet connection is needed for them:

- Google Fonts (Public Sans and Source Serif 4). The app still works without them, using fallback fonts.
- **html2pdf.js** for PDF downloads.
- **SheetJS (xlsx)** for Excel exports.

Printing works offline.

---

## Features

| Area | What it does |
|---|---|
| Dashboard | Summary cards (requests, generated, indigency, residency) and a recent transactions table. Updates when a certificate is generated. |
| Certificate of Indigency | Form with full name, gender, civil status and purpose. Validates input, generates the certificate, previews it and saves the record. |
| Certificate of Residency | Form with full name, age, gender, civil status, nationality, residency status (Live / Leave / Force to Leave), address and purpose. Also takes "Certificate issued upon request of" (defaults to "Bearer") and an optional relationship. |
| Certificate preview | Shows the A4 sheet as it will print. Buttons: Print, Download PDF, Back. Scales down on phones without distorting the page. |
| Records management | Separate lists for each certificate type. Search by name, filter by date, sort by date. Actions: details, preview, print, PDF, delete. |
| Excel export | One `.xlsx` file per certificate type with all saved records. Columns: No., Full Name, Gender, Purpose, Date Generated. |
| Settings | Barangay name, municipality, province and address. Logo, seal and signature images (PNG or JPG). Signatories with ordering. Authorized issuer. |

---

## Project structure

```
barangay-certificate-system/
├── index.html          Page layout, sidebar, all sections, script loading
├── css/
│   └── style.css       Dashboard UI, forms, records, settings, A4 certificate layout, print rules
├── js/
│   ├── utils.js        Shared helpers: escaping, dates, storage wrappers, toasts, dialogs, image checks
│   ├── settings.js     Barangay settings, image uploads, signatories, validation
│   ├── records.js      Certificate records: storage, sample data, Records Management page
│   ├── certificates.js A4 certificate HTML, preview, print, PDF download
│   ├── export.js       Excel export (SheetJS)
│   └── app.js          Routing, dashboard, forms, startup
└── assets/
    └── signatures/     Empty placeholder folder. Logo, seal and signature images are uploaded
                        in Settings and stored in the browser, not read from this folder.
```

---

## How the certificate is built

Each certificate is generated from three inputs:

1. **The record**: the values entered in the form.
2. **The settings**: barangay name, address, logo, seal, signatories and issuer.
3. **The current date**: set by JavaScript when the certificate is generated. It is not typed in.

`buildCertificateHTML()` in `js/certificates.js` creates one A4 sheet (210 × 297 mm). The same HTML is used for the preview, printing and the PDF. The PDF is created from a separate unscaled copy, so its size is always exact.

Pronouns change with gender:

| Gender | Subject | Possessive | Honorific |
|---|---|---|---|
| Male | He | his | Mr. |
| Female | She | her | Ms. |
| Other | They | their | (none) |

---

## Assumptions to review with barangay officials

The following are my interpretations. Please confirm them against your official forms.

1. **Certificate wording.** The sentences in `js/certificates.js` are drafts. Indigency wording says the resident belongs to the indigent sector "as verified by the records of this office." Adjust wording to match your barangay's templates.
2. **Residency status meanings.**
   - *Live*: the person currently lives in the barangay.
   - *Leave*: the person has left the barangay.
   - *Force to Leave*: the person was forced to leave, for example because of a disaster or eviction.
   Confirm these meanings and the wording used for each.
3. **Required statement.** The residency certificate includes the required sentence: "Upon his/her verbal request in connection with his/her desire for any legal requirements purposes." The pronoun changes with gender. For "Other" it reads "their." The original wording, including "legal requirements purposes," is kept as specified.
4. **Dashboard counts.** *Total certificates generated* counts records that were printed or downloaded as PDF. *Total certificate requests* counts every record saved.
5. **Civil status for residency.** The residency form uses the same four options as the indigency form (Single, Married, Widowed, Separated).

---

## Data storage and its limits

All data is saved in the browser's **localStorage** on the computer where the app is used:

| Key | Contents |
|---|---|
| `bcms.records.v1` | Certificate request records |
| `bcms.settings.v1` | Barangay details, images, signatories, issuer |

**Important limits:**

- localStorage is **not a shared database**. If several staff use different computers or browsers, each one has separate records, settings and images. Nothing syncs.
- Clearing browser data deletes everything.
- Browsers allow about 5 MB per site. Uploaded images are limited to 1 MB each for this reason. If saving fails, the app shows an error instead of reporting success.
- Records are stored in the same browser profile. Use a private/incognito window and everything is lost when it closes.

---

## Preparing for a real backend

The code is organized so that storage can be replaced without redesigning the pages:

- **Records** are read and written only through `loadRecords()`, `addRecord()`, `markIssued()`, `deleteRecord()` and `clearAllRecords()` in `js/records.js`.
- **Settings** are read and written only through `getSettings()` and `saveSettings()` in `js/settings.js`.

To connect a server later, replace the bodies of these functions with calls to an API (for example `fetch('/api/records')`), and make them asynchronous. The rest of the app stays the same, except that the calls will need `await`. Images can be uploaded to the server and stored as URLs in place of data URLs.

---

## Printing tips

The print layout is built for A4 with no margins added by the app.

- In the print dialog, choose **A4** as the paper size.
- Set **Margins** to **None** or **Default**. The sheet already has its own internal margins.
- Turn off **Headers and footers**. Browsers add the date, URL and page number when this is on.
- Turn on **Background graphics** if the watermark or the sample label should print.
- Check that the print preview shows one page.

---

## Testing checklist

Before a client demonstration, check these:

- [ ] Dashboard counts and recent transactions show the sample data.
- [ ] Submitting an empty indigency form shows messages on each field and does not generate anything.
- [ ] Age accepts only whole numbers from 1 to 150.
- [ ] Generating an indigency certificate opens the preview and shows a success message. The dashboard count goes up.
- [ ] Generating a residency certificate shows the correct status sentence for Live, Leave and Force to Leave.
- [ ] Leaving "Certificate issued upon request of" as Bearer shows "Bearer" on the certificate.
- [ ] Entering another person's name and relationship shows them on the certificate.
- [ ] Gender changes the pronouns in the body text and the required statement.
- [ ] Settings: change the barangay name and address, save, and check the preview.
- [ ] Upload a signature and a seal (PNG or JPG). They appear on the preview in the correct place.
- [ ] Remove a signature. The layout stays aligned, and the signature line is still shown.
- [ ] Add, reorder and remove signatories. The order on the certificate matches.
- [ ] Records: search by name, filter by date, sort both ways, view details, delete with confirmation.
- [ ] Excel export: download both files, open them, check the columns and that all records are included.
- [ ] Export with no records shows a warning and downloads nothing.
- [ ] Print: only the certificate prints, on one A4 page, with no buttons or sidebar.
- [ ] Download PDF: the file opens and matches the preview.
- [ ] Refresh the browser. Records and settings are still there.
- [ ] On a phone: the menu opens and closes, the preview fits the screen, and tables scroll sideways.

---

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.

---

## License and use

This is sample code for a client demonstration. Replace the sample wording, barangay details and signatories with your official information before any real use. Certificates should be reviewed by the barangay before they are issued.
