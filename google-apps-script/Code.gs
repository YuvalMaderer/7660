/**
 * Google Apps Script - Deploy as Web App to sync רשימת עוגן to this Sheet.
 *
 * Setup:
 * 1. Create a new Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this code, replace SHEET_NAME if needed
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL to your .env as GOOGLE_SHEETS_WEB_APP_URL
 */

const SHEET_NAME = 'רשימת עוגן';

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === 'delete' && params.rowIndex) {
    var rowIndex = parseInt(params.rowIndex, 10);
    if (rowIndex >= 2) {
      deleteRow(rowIndex);
      return resp({ ok: true });
    }
  }
  if (params.action === 'sync' && params.data) {
    try {
      const bytes = Utilities.base64DecodeWebSafe(params.data);
      const decoded = Utilities.newBlob(bytes).getDataAsString();
      const body = JSON.parse(decoded);
      if (Array.isArray(body.rows)) {
        syncRows(body.rows);
        return resp({ ok: true, updated: body.rows.length });
      }
    } catch (err) {
      return resp({ error: String(err.message) });
    }
  }
  try {
    const rows = getRows();
    return resp({ ok: true, rows: rows });
  } catch (err) {
    return resp({ error: String(err.message) });
  }
}

function getRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data[0].map(String);
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach(function(h, j) { row[h] = String(data[i][j] || ''); });
    rows.push(row);
  }
  return rows;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'sync' && Array.isArray(body.rows)) {
      syncRows(body.rows);
      return resp({ ok: true, updated: body.rows.length });
    }
    if (body.action === 'delete' && typeof body.rowIndex === 'number') {
      deleteRow(body.rowIndex);
      return resp({ ok: true });
    }
    return resp({ error: 'Invalid request' });
  } catch (err) {
    return resp({ error: String(err.message) });
  }
}

function syncRows(rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Clear and write headers + data
  sheet.clear();
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const data = [headers].concat(rows.map(function(r) { return headers.map(function(h) { return r[h] || ''; }); }));
  sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');
}

function deleteRow(rowIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (rowIndex < 2 || rowIndex > lastRow) return;
  sheet.deleteRow(rowIndex);
}

