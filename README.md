# Missionary Meals (Static Web App)

A tiny, mobile-first signup calendar for three missionary companionships, backed by **SheetDB**.

## Files
```
/
  index.html
  elders-drphillips.html
  elders-metrowest.html
  sisters-windermere.html
  style.css
  drphillips.js
  metrowest.js
  sisters.js
```

## Configure
- SheetDB URL is hardcoded in each JS file:
  ```js
  const SHEETDB = 'https://sheetdb.io/api/v1/wr8bptn1wll6e';
  ```
- Group name is hardcoded per file (e.g., `const GROUP = 'Elders Dr Phillips'`).

## Data Model (Google Sheet)
Headers **must** be exactly:
```
date | group | name
```
- `date`: `YYYY-MM-DD`
- `group`: one of `Elders Dr Phillips`, `Elders Metrowest`, `Sisters Windermere`
- `name`: string (empty string = cleared)

## Behavior
- Tap a date → type your name → Submit.
- To **remove** a signup: select the date, clear the input (leave blank), Submit.
- Months: use Previous / Next to navigate.
- Data is read via `GET /search?group=<group>` and filtered client-side by `YYYY-MM` and `name !== ""`.
- Create/Update/Clear use **POST** or **PATCH** (field-path) endpoints.

## Hosting
- Drop these files in a GitHub Pages repo (root), or any static host.
- If caching causes stale JS, hard-refresh: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Win).

## Notes
- Defensive handling if the sheet ever contains Excel date serials (from old data). New entries always post `YYYY-MM-DD`.
- No framework, minimal JS/CSS; designed primarily for iOS Safari and Android Chrome.
