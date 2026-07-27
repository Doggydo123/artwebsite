// ============================================================
// CLAUDIS — Google Sheets backend for the Collecting tab, the Brewing
// tab, and the Claude's Games tab.
//
// Deploy this bound to a Google Sheet (Extensions > Apps Script).
// See README.md in the repo root for full setup steps.
//
// Every request carries a `resource` of "collecting", "brewing", or
// "game" (defaults to "collecting" for backwards compatibility with the
// original deployment) so one script + one sheet can serve all tabs,
// each in their own tabs within the spreadsheet.
// ============================================================

const ACCESS_KEY_PROPERTY = "ACCESS_KEY";

// ---- Collecting ----
const ITEMS_SHEET = "Items";
const ITEMS_META_SHEET = "Meta";
const ITEMS_HEADERS = ["id", "name", "category", "quantity", "unitValue", "notes"];

// ---- Claude's Games ----
const GAME_ENTRIES_SHEET = "GameEntries";
const GAME_META_SHEET = "GameMeta";
const GAME_RULES_SHEET = "GameRules";
const GAME_ENTRY_HEADERS = ["id", "category", "date", "exercise", "sets", "reps", "weight", "value", "notes"];
const DEFAULT_RULES = {
  stepsPerPoint: 1000,
  sleepTargetHours: 8,
  pointsPerGoodSleep: 10,
  pointsPerPage: 1,
  spendingDailyBudget: 30,
  pointsPerDollarUnderBudget: 1,
  pointsPerGymSession: 15
};

// ---- Brewing ----
const BREW_SHEET = "Brews";
const BREW_READINGS_SHEET = "BrewReadings";
const BREW_META_SHEET = "BrewMeta";
const BREW_HEADERS = [
  "id", "name", "subtitle", "type", "volumeL", "og", "fgLow", "fgHigh", "abvLow", "abvHigh",
  "yeast", "extras", "fermentTempC", "fermWeeksLow", "fermWeeksHigh", "readyWeeksLow", "readyWeeksHigh",
  "pitchedAt", "status", "notes"
];
const BREW_READING_HEADERS = ["id", "brewId", "date", "gravity", "notes"];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (!checkKey(params.key)) return jsonResponse({ error: "unauthorized" });
    const resource = params.resource || "collecting";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (resource === "game") {
      const sheet = getOrCreateSheet(ss, GAME_ENTRIES_SHEET, GAME_ENTRY_HEADERS);
      return jsonResponse({
        entries: readGameEntries(sheet),
        rules: readRules(ss),
        updatedAt: readMetaValue(ss, GAME_META_SHEET)
      });
    }

    if (resource === "brewing") {
      const brewSheet = getOrCreateSheet(ss, BREW_SHEET, BREW_HEADERS);
      const readingsSheet = getOrCreateSheet(ss, BREW_READINGS_SHEET, BREW_READING_HEADERS);
      return jsonResponse({
        brand: readBrand(ss),
        brews: readBrews(brewSheet, readingsSheet),
        updatedAt: readMetaValue(ss, BREW_META_SHEET)
      });
    }

    const sheet = getOrCreateSheet(ss, ITEMS_SHEET, ITEMS_HEADERS);
    return jsonResponse({ items: readItems(sheet), updatedAt: readMetaValue(ss, ITEMS_META_SHEET) });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!checkKey(body.key)) return jsonResponse({ error: "unauthorized" });
    const resource = body.resource || "collecting";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const updatedAt = body.updatedAt || Date.now();

    if (resource === "game") {
      const sheet = getOrCreateSheet(ss, GAME_ENTRIES_SHEET, GAME_ENTRY_HEADERS);
      writeGameEntries(sheet, body.entries || []);
      if (body.rules) writeRules(ss, body.rules);
      writeMetaValue(ss, GAME_META_SHEET, updatedAt);
      return jsonResponse({ ok: true, updatedAt });
    }

    if (resource === "brewing") {
      const brewSheet = getOrCreateSheet(ss, BREW_SHEET, BREW_HEADERS);
      const readingsSheet = getOrCreateSheet(ss, BREW_READINGS_SHEET, BREW_READING_HEADERS);
      writeBrews(brewSheet, readingsSheet, body.brews || []);
      if (body.brand) writeBrand(ss, body.brand);
      writeMetaValue(ss, BREW_META_SHEET, updatedAt);
      return jsonResponse({ ok: true, updatedAt });
    }

    const sheet = getOrCreateSheet(ss, ITEMS_SHEET, ITEMS_HEADERS);
    writeItems(sheet, body.items || []);
    writeMetaValue(ss, ITEMS_META_SHEET, updatedAt);
    return jsonResponse({ ok: true, updatedAt });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function checkKey(key) {
  const expected = PropertiesService.getScriptProperties().getProperty(ACCESS_KEY_PROPERTY);
  return Boolean(expected) && key === expected;
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// ---- Collecting: Items ----

function readItems(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, ITEMS_HEADERS.length).getValues();
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
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, ITEMS_HEADERS.length).clearContent();
  if (!items.length) return;
  const rows = items.map((i) => [i.id, i.name, i.category, i.quantity ?? "", i.unitValue ?? "", i.notes ?? ""]);
  sheet.getRange(2, 1, rows.length, ITEMS_HEADERS.length).setValues(rows);
}

// ---- Claude's Games: entries ----

function readGameEntries(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, GAME_ENTRY_HEADERS.length).getValues();
  return values
    .filter((row) => row[0] !== "")
    .map((row) => ({
      id: String(row[0]),
      category: row[1],
      date: row[2],
      exercise: row[3],
      sets: row[4] === "" ? null : Number(row[4]),
      reps: row[5] === "" ? null : Number(row[5]),
      weight: row[6] === "" ? null : Number(row[6]),
      value: row[7] === "" ? null : Number(row[7]),
      notes: row[8]
    }));
}

function writeGameEntries(sheet, entries) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, GAME_ENTRY_HEADERS.length).clearContent();
  if (!entries.length) return;
  const rows = entries.map((e) => [
    e.id, e.category, e.date, e.exercise ?? "", e.sets ?? "", e.reps ?? "", e.weight ?? "", e.value ?? "", e.notes ?? ""
  ]);
  // Force the "date" column to plain text — otherwise Sheets auto-converts
  // "2026-07-27" into a real Date cell, and reading it back shifts by the
  // spreadsheet's timezone (e.g. becomes "2026-07-26T12:00:00.000Z").
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat("@");
  sheet.getRange(2, 1, rows.length, GAME_ENTRY_HEADERS.length).setValues(rows);
}

// ---- Claude's Games: scoring rules (key/value rows, editable in-sheet too) ----

function readRules(ss) {
  const sheet = ss.getSheetByName(GAME_RULES_SHEET);
  if (!sheet) return DEFAULT_RULES;
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return DEFAULT_RULES;
  const values = sheet.getRange(1, 1, lastRow, 2).getValues();
  const rules = {};
  values.forEach((row) => {
    if (row[0]) rules[row[0]] = Number(row[1]);
  });
  return Object.keys(rules).length ? rules : DEFAULT_RULES;
}

function writeRules(ss, rules) {
  let sheet = ss.getSheetByName(GAME_RULES_SHEET);
  if (!sheet) sheet = ss.insertSheet(GAME_RULES_SHEET);
  const merged = Object.assign({}, DEFAULT_RULES, rules);
  const keys = Object.keys(merged);
  sheet.getRange(1, 1, keys.length, 2).setValues(keys.map((k) => [k, merged[k]]));
}

// ---- Brewing: brews + readings ----

function readBrews(brewSheet, readingsSheet) {
  const lastRow = brewSheet.getLastRow();
  if (lastRow < 2) return [];
  const values = brewSheet.getRange(2, 1, lastRow - 1, BREW_HEADERS.length).getValues();
  const readingsByBrew = readBrewReadings(readingsSheet);
  return values
    .filter((row) => row[0] !== "")
    .map((row) => ({
      id: String(row[0]),
      name: row[1],
      subtitle: row[2],
      type: row[3],
      volumeL: row[4] === "" ? null : Number(row[4]),
      og: Number(row[5]),
      fgLow: Number(row[6]),
      fgHigh: Number(row[7]),
      abvLow: Number(row[8]),
      abvHigh: Number(row[9]),
      yeast: row[10],
      extras: row[11],
      fermentTempC: row[12] === "" ? null : Number(row[12]),
      fermWeeksLow: Number(row[13]),
      fermWeeksHigh: Number(row[14]),
      readyWeeksLow: Number(row[15]),
      readyWeeksHigh: Number(row[16]),
      pitchedAt: row[17],
      status: row[18],
      notes: row[19],
      readings: readingsByBrew[String(row[0])] || []
    }));
}

function readBrewReadings(sheet) {
  const lastRow = sheet.getLastRow();
  const byBrew = {};
  if (lastRow < 2) return byBrew;
  const values = sheet.getRange(2, 1, lastRow - 1, BREW_READING_HEADERS.length).getValues();
  values.forEach((row) => {
    if (row[0] === "") return;
    const brewId = String(row[1]);
    (byBrew[brewId] = byBrew[brewId] || []).push({
      id: String(row[0]),
      brewId,
      date: row[2],
      gravity: Number(row[3]),
      notes: row[4]
    });
  });
  return byBrew;
}

function writeBrews(brewSheet, readingsSheet, brews) {
  const lastBrewRow = brewSheet.getLastRow();
  if (lastBrewRow > 1) brewSheet.getRange(2, 1, lastBrewRow - 1, BREW_HEADERS.length).clearContent();
  if (brews.length) {
    const rows = brews.map((b) => [
      b.id, b.name, b.subtitle ?? "", b.type, b.volumeL ?? "", b.og, b.fgLow, b.fgHigh, b.abvLow, b.abvHigh,
      b.yeast ?? "", b.extras ?? "", b.fermentTempC ?? "", b.fermWeeksLow, b.fermWeeksHigh,
      b.readyWeeksLow, b.readyWeeksHigh, b.pitchedAt, b.status, b.notes ?? ""
    ]);
    // Keep "pitchedAt" as plain text — otherwise Sheets auto-converts it to
    // a Date cell and reading it back shifts by the spreadsheet's timezone.
    brewSheet.getRange(2, 18, rows.length, 1).setNumberFormat("@");
    brewSheet.getRange(2, 1, rows.length, BREW_HEADERS.length).setValues(rows);
  }

  const lastReadingRow = readingsSheet.getLastRow();
  if (lastReadingRow > 1) readingsSheet.getRange(2, 1, lastReadingRow - 1, BREW_READING_HEADERS.length).clearContent();
  const readingRows = [];
  brews.forEach((b) => {
    (b.readings || []).forEach((r) => {
      readingRows.push([r.id, b.id, r.date, r.gravity, r.notes ?? ""]);
    });
  });
  if (readingRows.length) {
    // Same fix for the reading log's "date" column.
    readingsSheet.getRange(2, 3, readingRows.length, 1).setNumberFormat("@");
    readingsSheet.getRange(2, 1, readingRows.length, BREW_READING_HEADERS.length).setValues(readingRows);
  }
}

function readBrand(ss) {
  const sheet = ss.getSheetByName(BREW_META_SHEET);
  if (!sheet) return "BYB";
  const value = sheet.getRange("B2").getValue();
  return value || "BYB";
}

function writeBrand(ss, brand) {
  let sheet = ss.getSheetByName(BREW_META_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(BREW_META_SHEET);
    sheet.getRange("A1").setValue("updatedAt");
  }
  sheet.getRange("A2").setValue("brand");
  sheet.getRange("B2").setValue(brand);
}

// ---- Shared: meta timestamp per resource ----

function readMetaValue(ss, metaSheetName) {
  const sheet = ss.getSheetByName(metaSheetName);
  if (!sheet) return 0;
  return Number(sheet.getRange("B1").getValue()) || 0;
}

function writeMetaValue(ss, metaSheetName, value) {
  let sheet = ss.getSheetByName(metaSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(metaSheetName);
    sheet.getRange("A1").setValue("updatedAt");
  }
  sheet.getRange("B1").setValue(value);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
