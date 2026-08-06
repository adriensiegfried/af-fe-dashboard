# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AF Family Engagement Dashboard — a Google Apps Script web app for Achievement First's Team Systems & Data team. It reads live data from a structured Google Sheet and renders an S&D-branded dashboard covering 3 regions (CT, NY, RI) and 41 schools.

## Deployment Commands

```bash
# Push local changes to Apps Script
clasp push

# Pull remote changes from Apps Script
clasp pull

# Open the Apps Script editor in browser
clasp open

# Open the deployed web app
clasp open --webapp
```

There is no build step, linter, or test framework. The app runs entirely in Google Apps Script's runtime.

## Architecture

**Data flow:** Google Sheet → `DataService.gs` (server-side read + enrichment) → JSON payload injected into HTML template → client-side `DATA` global → tab renderers.

**Server-side (`.gs` files):**
- `Code.gs` — Entry point. `doGet()` serves the HTML, `include()` injects partials, `getRefreshedData()` is client-callable for refresh.
- `DataService.gs` — `loadAllData()` reads all Sheet tabs, enriches school objects with attendance/demographics/compliance/survey/event aggregates, and caches results (10min TTL via `CacheService`, 100KB limit).
- `YearReset.gs` — Annual archive-and-reset utilities, run manually from the Apps Script editor. `archiveCurrentYear()` snapshots the data Sheet to a dated read-only copy; `resetForNewYear()` archives then clears the year-data tabs (guarded by the `CONFIRM_RESET` flag), preserving `schools`/`config`/`type_crosswalk`.

**Client-side (`.js.html` files served as `<script>` blocks via `<?!= include() ?>`):**
- `data.js.html` — Parses the injected JSON into the `DATA` global. Contains color/status logic (survey validity thresholds, ADA, chronic absence, FLC status), formatting helpers (`fmtPct`, `fmtDate`, `fmtNum`), and data access helpers (filter by region/level, compute averages).
- `components.js.html` — Reusable UI builders: KPI cards, progress bars, badges, survey bar rows, compliance rows, school table rows, event cards, region summary cards. All return HTML strings.
- `app.js.html` — Application state (`currentTab`, `filterRegion`, `filterLevel`, `selectedSchoolId`) and five tab renderers: `renderOverview()`, `renderSurvey()`, `renderEvents()`, `renderCompliance()`, `renderDetail()`.

**Markup & styles:**
- `index.html` — HTML shell with nav buttons, tab containers, and partial includes.
- `styles.html` — All CSS. Uses CSS custom properties for the S&D brand palette (navy, gold, AF blue, semantic green/amber/red).

## Key Conventions

- **No npm/bundler** — all code is vanilla JS. Frontend files use `.js.html` extension (Apps Script convention for includable HTML partials).
- **All UI is string-templated HTML** — component functions return HTML strings, assembled in render functions, then set via `innerHTML`.
- **Goals and typology config are data-driven** — thresholds (survey validity ≥75%, ADA goal ≥93%, etc.) and event type colors/benchmarks come from the Sheet's `config` tab, not hardcoded.
- **The `type_crosswalk` tab** maps legacy event type names to canonical names.
- **Enrollment events** are treated differently from other event types: count-based display (families reached) instead of percentage-based.
- **School enrichment** in `enrichSchools()` is the core data join — it merges attendance, demographics, compliance, surveys, and events onto each school object by `acronym`.
- **Server files must be `.gs`, not `.js`** — clasp pushes both as server scripts, so a `Foo.gs` and a `Foo.js` collide on the same script name and break `clasp push`. Keep the `.gs` version only. (Client partials keep the `.js.html` extension.)
- **Empty / fresh-year states render neutral, not red** — un-entered values show a neutral grey "not yet entered" state (`isBlank()` plus `NEUTRAL_COLOR`/`NEUTRAL_DOT`, all in `data.js.html`) rather than a red fail, so a freshly reset dashboard reads as unstarted while schools' data builds out. Events Logged is the one intentional exception — it stays a red ✗ at zero, per the stakeholder's rule that ✗ should flag schools with nothing logged.

## Data Source

Google Sheet ID: `1X-qPFEZ8Lo1zpl39tr3GGi-xuASkazWDqx8ZDFtIGWo`

Tabs: `schools`, `attendance`, `demographics`, `surveys`, `events`, `compliance`, `config`, `narratives`, `type_crosswalk`
