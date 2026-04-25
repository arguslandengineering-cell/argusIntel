// ============================================================
// ARGUSINTEL — APPS SCRIPT BRIDGE
// appscript-bridge.gs
//
// Paste this into: Google Sheets → Extensions → Apps Script
// Deploy as Web App: Execute as Me, Anyone can access
// Copy the Web App URL → paste into firebase-config.js
//
// This bridge reads your Google Sheet and sends data to
// the ArgusIntel app via HTTP POST.
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
// Set these to match your sheet structure
const SHEET_NAME = 'Workload';     // Name of the tab in your sheet
const START_ROW  = 2;              // First data row (skip header)
const COLUMNS = {
  desc:     1,  // Column A — Task description
  person:   2,  // Column B — Assigned to
  status:   3,  // Column C — Status
  priority: 4,  // Column D — Priority
  deadline: 5,  // Column E — Deadline
  notes:    6,  // Column F — Notes
};
// ────────────────────────────────────────────────────────────

/**
 * doGet — called when someone opens the Web App URL in a browser.
 * Returns a status page so you can verify the script is deployed.
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ArgusIntel Bridge Active', timestamp: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost — called by the ArgusIntel app when a file import is triggered.
 * Expects: { action: 'read_sheet' }
 * Returns: JSON array of task objects
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (payload.action === 'read_sheet') {
      const items = readSheetData();
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, items }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * readSheetData — reads the configured sheet and returns structured items.
 */
function readSheetData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" not found. Check SHEET_NAME in script config.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) return [];

  const data = sheet.getRange(START_ROW, 1, lastRow - START_ROW + 1, 10).getValues();

  return data
    .filter(row => row[COLUMNS.desc - 1]) // skip empty rows
    .map(row => ({
      desc:     String(row[COLUMNS.desc - 1]     || '').trim(),
      person:   String(row[COLUMNS.person - 1]   || '').trim(),
      status:   String(row[COLUMNS.status - 1]   || 'Pending').trim(),
      priority: String(row[COLUMNS.priority - 1] || 'Medium').trim(),
      deadline: formatDate(row[COLUMNS.deadline - 1]),
      notes:    String(row[COLUMNS.notes - 1]    || '').trim(),
      source:   'sheets_import',
      importedAt: new Date().toISOString(),
    }));
}

/**
 * formatDate — converts various date formats to YYYY-MM-DD string.
 */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return String(val).trim();
}

// ============================================================
// HOW TO DEPLOY:
// 1. Paste this file into Apps Script editor
// 2. Edit SHEET_NAME and COLUMNS to match your sheet
// 3. Click Deploy → New deployment
// 4. Type: Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Click Deploy → copy the Web App URL
// 8. Paste URL into firebase-config.js as APPSCRIPT_URL
// ============================================================
