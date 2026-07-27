// ============================================================
// J.A.R.V.I.S. Collecting tab — Google Sheets backend.
//
// Deploy this bound to a Google Sheet (Extensions > Apps Script).
// See README.md in the repo root for full setup steps.
//
// Data model: one "Items" sheet (header row + one row per item),
// plus a "Meta" sheet holding a single updatedAt timestamp so the
// frontend can tell whether the sheet or the browser's local copy
// is newer.
// ============================================================

const ITEMS_SHEET = "Items";
const META_SHEET = "Meta";
const HEADERS = ["id", "name", "category", "quantity", "unitValue", "notes"];

function doGet(e) {
  try {
    if (!checkKey(e.parameter && e.parameter.key)) {
      return jsonResponse({ error: "unauthorized" });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateItemsSheet(ss);
    return jsonResponse({ items: readItems(sheet), updatedAt: readUpdatedAt(ss) });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!checkKey(body.key)) {
      return jsonResponse({ error: "unauthorized" });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateItemsSheet(ss);
    writeItems(sheet, body.items || []);
    const updatedAt = body.updatedAt || Date.now();
    writeUpdatedAt(ss, updatedAt);
    return jsonResponse({ ok: true, updatedAt });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function checkKey(key) {
  const expected = PropertiesService.getScriptProperties().getProperty("ACCESS_KEY");
  return Boolean(expected) && key === expected;
}

function getOrCreateItemsSheet(ss) {
  let sheet = ss.getSheetByName(ITEMS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ITEMS_SHEET);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function getOrCreateMetaSheet(ss) {
  let sheet = ss.getSheetByName(META_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(META_SHEET);
    sheet.getRange("A1").setValue("updatedAt");
    sheet.getRange("B1").setValue(0);
  }
  return sheet;
}

function readItems(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter((row) => row[0] !== "")
    .map((row) => ({
      id: String(row[0]),
      name: row[1],
      category: row[2],
      quantity: row[3] === "" ? null : Number(row[3]),
      unitValue: row[4] === "" ? null : Number(row[4]),
      notes: row[5]
    }));
}

function writeItems(sheet, items) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }
  if (!items.length) return;
  const rows = items.map((i) => [i.id, i.name, i.category, i.quantity ?? "", i.unitValue ?? "", i.notes ?? ""]);
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
}

function readUpdatedAt(ss) {
  return Number(getOrCreateMetaSheet(ss).getRange("B1").getValue()) || 0;
}

function writeUpdatedAt(ss, value) {
  getOrCreateMetaSheet(ss).getRange("B1").setValue(value);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
