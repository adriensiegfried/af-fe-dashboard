/**
 * AF Family Engagement Dashboard — YearReset.gs
 * Archive-and-reset utilities for starting a fresh school year while
 * preserving the prior year's data as a frozen, referenceable snapshot.
 *
 * Track A of the SY26-27 launch (see FE Dashboard PRD, Phase 4).
 *
 * USAGE (run from the Apps Script editor, not the web app):
 *   1. archiveCurrentYear()  → makes a dated read-only copy of the data Sheet,
 *                              logs the new file's URL/ID. Do this FIRST.
 *   2. resetForNewYear()     → archives (if not already) then clears the
 *                              time-series tabs on the LIVE Sheet so the
 *                              dashboard starts empty and builds out.
 *
 * SAFETY: resetForNewYear() is destructive on the live Sheet. It always
 * archives first and refuses to run unless CONFIRM_RESET is true.
 *
 * Team Systems & Data · Achievement First
 */

// Flip to true only when you actually intend to wipe the live data tabs.
const CONFIRM_RESET = false;

// Tabs that carry a single year's data — cleared on reset (header row kept).
const YEAR_DATA_TABS = ['attendance', 'demographics', 'surveys', 'events', 'compliance', 'narratives'];

// Tabs that define structure/config and are ALWAYS preserved across years.
// (schools MUST stay populated — the dashboard divides by school counts and
//  will render NaN/blank everywhere if the schools tab is empty.)
const PRESERVED_TABS = ['schools', 'config', 'type_crosswalk'];

/**
 * Makes a full, frozen copy of the data Sheet as this-year's archive.
 * Returns the new file's URL. Non-destructive.
 *
 * @param {string=} label  Optional year label, e.g. "SY25-26". Defaults below.
 */
function archiveCurrentYear(label) {
  const yearLabel = label || 'SY25-26';
  const name = 'FE Engagement Data — ' + yearLabel + ' (ARCHIVE — read only)';

  const file = DriveApp.getFileById(SHEET_ID);
  const copy = file.makeCopy(name);
  const url = copy.getUrl();

  Logger.log('Archive created: %s', name);
  Logger.log('Archive URL: %s', url);
  Logger.log('Archive file ID: %s', copy.getId());
  Logger.log('--> Point a cloned Apps Script deployment at this ID for a permanent "%s" dashboard link.', yearLabel);
  return url;
}

/**
 * Archives the current year, then clears the year-data tabs on the LIVE Sheet
 * (header row preserved) so the dashboard starts fresh. Preserves schools,
 * config, and type_crosswalk. Clears the dashboard cache at the end.
 *
 * Guarded by CONFIRM_RESET.
 *
 * @param {string=} label  Year label passed through to archiveCurrentYear().
 */
function resetForNewYear(label) {
  if (!CONFIRM_RESET) {
    throw new Error('CONFIRM_RESET is false. Set it to true to run the destructive reset.');
  }

  // 1. Always snapshot before clearing.
  const archiveUrl = archiveCurrentYear(label);
  Logger.log('Proceeding with reset. Archive is at: %s', archiveUrl);

  // 2. Clear each year-data tab below the header row.
  const ss = SpreadsheetApp.openById(SHEET_ID);
  YEAR_DATA_TABS.forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      Logger.log('SKIP (tab not found): %s', tabName);
      return;
    }
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 1 && lastCol > 0) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      Logger.log('Cleared %s rows in tab: %s', lastRow - 1, tabName);
    } else {
      Logger.log('Already empty: %s', tabName);
    }
  });

  // 3. Confirm preserved tabs still have data (sanity check, no mutation).
  PRESERVED_TABS.forEach(function (tabName) {
    const sheet = ss.getSheetByName(tabName);
    const rows = sheet ? sheet.getLastRow() - 1 : 0;
    Logger.log('Preserved %s: %s data rows remain.', tabName, Math.max(0, rows));
  });

  // 4. Bust the dashboard cache so the empty state serves immediately.
  try {
    CacheService.getScriptCache().remove('dashboardData');
    Logger.log('Dashboard cache cleared.');
  } catch (e) {
    Logger.log('Cache clear skipped: %s', e);
  }

  Logger.log('Reset complete. Live dashboard now starts empty; %s is preserved at %s',
    (label || 'SY25-26'), archiveUrl);
}
