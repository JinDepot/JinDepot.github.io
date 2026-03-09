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

// ── Handle POST requests ────────────────────────────────────────────────────
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

    // ── Route by action ──────────────────────────────────────────────────
    var action = data.action || 'record';

    if (action === 'record') {
      // Row: date | draw1 | draw2 | ... | draw30 | average
      var row = [data.date].concat(data.draws).concat([data.average]);
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'flush') {
      // Delete all rows where column A matches data.date (bottom-up to preserve indices)
      var lastRow = sheet.getLastRow();
      var deleted = 0;
      if (lastRow > 0) {
        var dates = sheet.getRange(1, 1, lastRow, 1).getValues();
        for (var r = lastRow; r >= 1; r--) {
          var cellVal = dates[r - 1][0];
          // Normalize: if Sheets auto-converted to Date, format as YYYY-MM-DD
          var cellStr;
          if (cellVal instanceof Date) {
            var y = cellVal.getFullYear();
            var m = ('0' + (cellVal.getMonth() + 1)).slice(-2);
            var d = ('0' + cellVal.getDate()).slice(-2);
            cellStr = y + '-' + m + '-' + d;
          } else {
            cellStr = String(cellVal);
          }
          if (cellStr === String(data.date)) {
            sheet.deleteRow(r);
            deleted++;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, deleted: deleted }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
