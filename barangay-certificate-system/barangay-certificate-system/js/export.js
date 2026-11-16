/* ==========================================================================
   export.js — Excel export with SheetJS (xlsx).
   Each certificate type gets its own workbook. Every saved record of that
   type is included, not only the rows currently shown on screen. Because the
   data is read from storage at the moment of export, the file always includes
   the latest generated certificates.
   ========================================================================== */

function exportRecordsToExcel(type) {
  if (typeof XLSX === 'undefined') {
    toast('The Excel library could not be loaded. Check your internet connection and try again.', 'error');
    return;
  }

  // Oldest first, numbered from 1
  const records = loadRecords()
    .filter(r => r.type === type)
    .sort((a, b) => a.dateGenerated.localeCompare(b.dateGenerated));

  if (!records.length) {
    toast(`There are no ${typeLabel(type)} records to export yet.`, 'warning');
    return;
  }

  const header = ['No.', 'Full Name', 'Gender', 'Purpose', 'Date Generated'];
  const rows = records.map((r, i) => [i + 1, r.fullName, r.gender, r.purpose, formatDate(r.dateGenerated)]);
  const aoa = [header, ...rows];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths are set from the longest value in each column
  sheet['!cols'] = header.map((h, c) => {
    const longest = Math.max(h.length, ...aoa.slice(1).map(row => String(row[c] ?? '').length));
    return { wch: Math.min(Math.max(longest + 2, 6), 60) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, typeLabel(type)); // sheet names are at most 31 characters

  const filename = `${typeFileName(type)}_Records.xlsx`;
  try {
    XLSX.writeFile(workbook, filename);
    toast(`Exported ${records.length} ${records.length === 1 ? 'record' : 'records'} to ${filename}.`, 'success');
  } catch (err) {
    console.error(err);
    toast('The Excel file could not be created. Try again.', 'error');
  }
}
