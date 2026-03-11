// ── Config ──────────────────────────────────────────────────────────────────
var SECRET = '8aa9e3b8642204f98a98d86f390858f5f6b91f99';

// ── Sampler (server-side only — never sent to frontend) ──────────────────────
function exponentialSample(mean) {
  var u = Math.random();
  while (u === 0) u = Math.random();
  return -mean * Math.log(u);
}

function draw30() {
  var draws = [];
  for (var i = 0; i < 30; i++) draws.push(exponentialSample(11.1));
  var average = draws.reduce(function(a, b) { return a + b; }, 0) / 30;
  return { draws: draws, average: average };
}

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

    if (action === 'read') {
      var lastRow = sheet.getLastRow();
      var records = [];
      if (lastRow > 0) {
        var rows = sheet.getRange(1, 1, lastRow, 32).getValues();
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r];
          var dateVal = row[0];
          var dateStr;
          if (dateVal instanceof Date) {
            var y = dateVal.getFullYear();
            var mo = ('0' + (dateVal.getMonth() + 1)).slice(-2);
            var dy = ('0' + dateVal.getDate()).slice(-2);
            dateStr = y + '-' + mo + '-' + dy;
          } else {
            dateStr = String(dateVal);
          }
          var draws = [];
          for (var c = 1; c <= 30; c++) draws.push(Number(row[c]));
          records.push({ date: dateStr, draws: draws, average: Number(row[31]) });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, records: records }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'draw') {
      var result = draw30();
      var row = [data.date].concat(result.draws).concat([result.average]);
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, draws: result.draws, average: result.average }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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
