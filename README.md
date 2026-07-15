# AF Family Engagement Dashboard

**Team Systems & Data · Achievement First**

A Google Apps Script web app that reads live data from a structured Google Sheet and renders an S&D-branded dashboard covering all 3 regions (CT, NY, RI) and 39 schools.

## Architecture

- **Backend:** Google Apps Script (server-side JS)
- **Frontend:** Vanilla HTML/CSS/JS served by Apps Script
- **Data layer:** Structured Google Sheet (9 tabs)
- **Auth:** Google Workspace (AF domain)

**Data flow:** Google Sheet → `DataService.gs` (server-side read + enrichment) → JSON payload injected into the HTML template → client-side `DATA` global → tab renderers.

## Project Structure

```
src/
├── Code.gs              # Entry point: doGet(), include(), getRefreshedData()
├── DataService.gs       # Reads all Sheet tabs, enriches schools, caches payload
├── YearReset.gs         # Annual archive-and-reset utilities (run manually)
├── appsscript.json      # Apps Script manifest
├── index.html           # Main HTML shell + nav
├── styles.html          # S&D-branded CSS (brand palette via CSS custom properties)
├── app.js.html          # App state + 5 tab renderers (overview/survey/events/compliance/detail)
├── components.js.html   # Reusable UI builders (KPI cards, tables, bars, badges)
└── data.js.html         # Client-side data parsing, color/status logic, formatters
```

## Setup

1. Install [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
2. Login: `clasp login`
3. Clone this repo
4. Update `.clasp.json` with your Script ID
5. Push: `clasp push`

## Commands

```bash
clasp push            # Push local changes to Apps Script
clasp pull            # Pull remote changes from Apps Script
clasp open            # Open the Apps Script editor in browser
clasp open --webapp   # Open the deployed web app
```

There is no build step, linter, or test framework — the app runs entirely in the Apps Script runtime.

## Conventions

- **No npm/bundler** — all vanilla JS. Frontend files use the `.js.html` extension (Apps Script convention for includable partials, injected via `<?!= include() ?>`).
- **All UI is string-templated HTML** — component functions return HTML strings, assembled in render functions, then set via `innerHTML`.
- **Goals and typology are data-driven** — thresholds (survey validity ≥75%, ADA goal ≥93%, etc.) and event type colors/benchmarks come from the `config` tab, not hardcoded.
- **`enrichSchools()` is the core data join** — merges attendance, demographics, compliance, surveys, and events onto each school by `acronym`.
- **Enrollment events** are count-based (families reached) rather than percentage-based.
- **Server files are `.gs` only** — never keep a `.js` copy of a `.gs` file; clasp pushes both as server scripts and they collide on the same script name, breaking `clasp push`.
- **Empty states render neutral** — un-entered values show a grey "not yet entered" state (`isBlank()` / `NEUTRAL_COLOR` in `data.js.html`) instead of a red fail, so a freshly reset dashboard reads as unstarted. Events Logged is the one exception (stays red at zero by design).

## Starting a new school year

`YearReset.gs` archives the prior year and clears the live Sheet for a fresh start:

1. From the Apps Script editor, run `archiveCurrentYear()` — makes a dated read-only copy of the data Sheet and logs its URL/ID.
2. (Optional) Clone the deployment onto the archived Sheet's ID for a permanent prior-year reference link.
3. Set `CONFIRM_RESET = true` in `YearReset.gs`, then run `resetForNewYear()` — re-archives, then clears the year-data tabs (`attendance`, `demographics`, `surveys`, `events`, `compliance`, `narratives`) while preserving `schools`, `config`, and `type_crosswalk`.
4. `clasp push` any code changes and cut a new deployment version.

## Data Source

Google Sheet: `1X-qPFEZ8Lo1zpl39tr3GGi-xuASkazWDqx8ZDFtIGWo`

Tabs: `schools`, `attendance`, `demographics`, `surveys`, `events`, `compliance`, `config`, `narratives`, `type_crosswalk`
