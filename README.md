# AF Family Engagement Dashboard

**Team Systems & Data · Achievement First**

A Google Apps Script web app that reads live data from a structured Google Sheet and renders an S&D-branded dashboard covering all 3 regions (CT, NY, RI) and 39 schools.

## Architecture

- **Backend:** Google Apps Script (server-side JS)
- **Frontend:** Vanilla HTML/CSS/JS served by Apps Script
- **Data layer:** Structured Google Sheet (8 tabs)
- **Auth:** Google Workspace (AF domain)

## Project Structure

```
src/
├── Code.gs              # Entry point: doGet(), routing
├── DataService.gs       # Reads all Sheet tabs, builds JSON payload
├── appsscript.json      # Apps Script manifest
├── index.html           # Main HTML shell + nav
├── styles.html          # S&D-branded CSS
├── app.js.html          # Client-side app logic (tab switching, filtering)
├── components.js.html   # Reusable UI components (KPI cards, tables, bars)
└── data.js.html         # Client-side data helpers + color logic
```

## Setup

1. Install [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
2. Login: `clasp login`
3. Clone this repo
4. Update `.clasp.json` with your Script ID
5. Push: `clasp push`

## Data Source

Google Sheet: `1X-qPFEZ8Lo1zpl39tr3GGi-xuASkazWDqx8ZDFtIGWo`

Tabs: schools, attendance, demographics, surveys, events, compliance, config, narratives, type_crosswalk
