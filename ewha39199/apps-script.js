// ── Config ──────────────────────────────────────────────────────────────────
var SECRET = '8aa9e3b8642204f98a98d86f390858f5f6b91f99';

var SHEETS = {
  1: '1tk7D72_tpNU7Q2fbOWFkKrUoUTtONhGVTJZyYsUWRXU',
  2: '1abnQx1R1-tK8ZHrlGmrVAXGp0UwL-xUXHfyGZzUoB3Q',
  3: '1bOCiZrRhY-aqYTFYWUwrC0DDwUP6fUsYoQrdOKf-ZwI'
};

// ── Health check ────────────────────────────────────────────────────────────
function doGet(e) {
  return ContentService.createTextOutput('Course Raffle: Apps Script running.');
}

// ── Record draw results ─────────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Auth check
    if (data.token !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var section = data.section;
    var sheetId = SHEETS[section];
    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'invalid section' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];

    // Row: date | draw1 | draw2 | ... | draw30 | average
    var row = [data.date].concat(data.draws).concat([data.average]);
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
