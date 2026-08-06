/**
 * AF Family Engagement Dashboard — Code.gs
 * Entry point for the Apps Script web app.
 * 
 * Team Systems & Data · Achievement First
 */

const SHEET_ID = '1X-qPFEZ8Lo1zpl39tr3GGi-xuASkazWDqx8ZDFtIGWo';

/**
 * Serves the dashboard HTML when the web app URL is opened.
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  
  // Load all data and inject as JSON
  template.dashboardData = JSON.stringify(loadAllData());
  
  return template.evaluate()
    .setTitle('AF Family Engagement Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Includes an HTML file's content (for CSS/JS partials).
 * Used in index.html like: <?!= include('styles') ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Client-callable function to refresh data without full page reload.
 * Drops the cached payload first — otherwise loadAllData() would just return
 * the same cached copy and the refresh would be a no-op for up to 10 minutes.
 */
function getRefreshedData() {
  CacheService.getScriptCache().remove('dashboardData');
  return JSON.stringify(loadAllData());
}
