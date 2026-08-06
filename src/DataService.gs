/**
 * AF Family Engagement Dashboard — DataService.gs
 * Reads all tabs from the structured Google Sheet and builds a JSON payload.
 * 
 * Team Systems & Data · Achievement First
 */

/**
 * Loads all data from the structured Sheet and returns a single object.
 * This is the main data function called by Code.gs.
 */
function loadAllData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const cache = CacheService.getScriptCache();
  
  // Check cache first (60-second TTL; see cache.put below)
  const cached = cache.get('dashboardData');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Cache corrupted, rebuild
    }
  }
  
  const data = {
    schools: readTab(ss, 'schools'),
    attendance: readTab(ss, 'attendance'),
    demographics: readTab(ss, 'demographics'),
    surveys: readTab(ss, 'surveys'),
    events: readTab(ss, 'events'),
    compliance: readTab(ss, 'compliance'),
    config: readConfig(ss),
    narratives: readTab(ss, 'narratives'),
    typeCrosswalk: readTypeCrosswalk(ss),
    meta: {
      lastRefreshed: new Date().toISOString(),
      schoolCount: 0,
      eventCount: 0,
    }
  };
  
  // Enrich: merge attendance + demographics + compliance into schools
  data.schools = enrichSchools(data);
  data.meta.schoolCount = data.schools.length;
  data.meta.eventCount = data.events.length;
  
  // Cache for 60 seconds. Short enough that a plain reload picks up a Sheet
  // edit almost immediately during data-entry season, long enough to absorb
  // bursts of page loads. The Refresh Data button bypasses this entirely.
  try {
    const json = JSON.stringify(data);
    if (json.length < 100000) { // Cache limit is 100KB per key
      cache.put('dashboardData', json, 60);
    }
  } catch (e) {
    // Data too large for cache, skip
  }
  
  return data;
}

/**
 * Reads a Sheet tab and returns an array of objects (header row = keys).
 */
function readTab(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Skip empty rows
    if (!row[0] && !row[1]) continue;
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = row[j] !== undefined ? row[j] : '';
      }
    }
    rows.push(obj);
  }
  
  return rows;
}

/**
 * Reads the config tab and returns a key-value map.
 */
function readConfig(ss) {
  const rows = readTab(ss, 'config');
  const config = {
    goals: {},
    typology: {},
  };
  
  for (const row of rows) {
    const key = String(row.key || '').trim();
    if (!key) continue;
    
    if (key.startsWith('typology:')) {
      // Parse typology config: "typology:Academic Access:color" → typology["Academic Access"].color
      const parts = key.split(':');
      if (parts.length >= 3) {
        const typeName = parts[1];
        const prop = parts[2];
        if (!config.typology[typeName]) {
          config.typology[typeName] = {};
        }
        config.typology[typeName][prop] = row.value;
      }
    } else {
      config.goals[key] = row.value;
    }
  }
  
  return config;
}

/**
 * Reads the type_crosswalk tab and returns a legacy→canonical map.
 */
function readTypeCrosswalk(ss) {
  const rows = readTab(ss, 'type_crosswalk');
  const map = {};
  for (const row of rows) {
    if (row.legacy_name && row.canonical_name) {
      map[String(row.legacy_name).trim()] = String(row.canonical_name).trim();
    }
  }
  return map;
}

/**
 * Enriches school objects with attendance, demographics, compliance,
 * and computed aggregates (survey latest, event count, etc.).
 */
function enrichSchools(data) {
  // Index auxiliary data by acronym
  const attMap = indexBy(data.attendance, 'acronym');
  const demoMap = indexBy(data.demographics, 'acronym');
  const compMap = indexBy(data.compliance, 'acronym');
  
  // Group surveys and events by school
  const surveysBySchool = groupBy(data.surveys, 'acronym');
  const eventsBySchool = groupBy(data.events, 'acronym');
  
  return data.schools.map(school => {
    const acr = school.acronym;
    const att = attMap[acr] || {};
    const demo = demoMap[acr] || {};
    const comp = compMap[acr] || {};
    const surveys = surveysBySchool[acr] || [];
    const events = eventsBySchool[acr] || [];
    
    // Find latest survey cycle
    const cycleOrder = { 'September': 1, 'December': 2, 'April': 3 };
    const sortedSurveys = surveys.sort((a, b) => 
      (cycleOrder[a.cycle] || 0) - (cycleOrder[b.cycle] || 0)
    );
    const latestSurvey = sortedSurveys[sortedSurveys.length - 1] || {};
    const prevSurvey = sortedSurveys.length > 1 ? sortedSurveys[sortedSurveys.length - 2] : null;
    
    // Compute survey trend
    let surveyTrend = null;
    if (prevSurvey && latestSurvey.participation_pct && prevSurvey.participation_pct) {
      surveyTrend = Math.round((latestSurvey.participation_pct - prevSurvey.participation_pct) * 100) / 100;
    }
    
    // Count events by type (exclude Enrollment from avg pct calc)
    const eventsByType = {};
    let pctSum = 0;
    let pctCount = 0;
    for (const ev of events) {
      const type = ev.event_type || 'Unknown';
      if (!eventsByType[type]) eventsByType[type] = { count: 0, totalPct: 0, totalAttended: 0 };
      eventsByType[type].count++;
      eventsByType[type].totalAttended += (ev.families_attended || 0);
      if (type !== 'Enrollment' && ev.pct_attended) {
        eventsByType[type].totalPct += ev.pct_attended;
        pctSum += ev.pct_attended;
        pctCount++;
      }
    }
    
    // Determine flag
    let flag = '';
    for (const s of surveys) {
      if (s.flag === 'bright_spot') flag = 'bright_spot';
      if (s.flag === 'concern') flag = 'concern';
    }
    
    return {
      ...school,
      // Attendance
      ada_pct: att.ada_pct || '',
      chronic_absent_pct: att.chronic_absent_pct || '',
      attendance_as_of: att.as_of_date || '',
      // Demographics
      shelter: demo.shelter || 0,
      doubled_up: demo.doubled_up || 0,
      hotel_motel: demo.hotel_motel || 0,
      unsheltered: demo.unsheltered || 0,
      unaccompanied_youth: demo.unaccompanied_youth || 0,
      // Compliance
      ...comp,
      // Survey aggregates
      surveys: sortedSurveys,
      latestSurvey: latestSurvey,
      prevSurvey: prevSurvey,
      surveyTrend: surveyTrend,
      // Event aggregates
      events: events,
      eventCount: events.length,
      eventsByType: eventsByType,
      avgEventPct: pctCount > 0 ? Math.round(pctSum / pctCount * 1000) / 10 : null,
      // Flag
      flag: flag,
      flagNote: latestSurvey.flag_note || '',
    };
  });
}

// ── Utility functions ─────────────────────────────────────────────────────────

function indexBy(arr, key) {
  const map = {};
  for (const item of arr) {
    if (item[key]) map[item[key]] = item;
  }
  return map;
}

function groupBy(arr, key) {
  const map = {};
  for (const item of arr) {
    const k = item[key];
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}
