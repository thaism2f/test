
# Missionary Meals – Fixed Build

What changed:
- Unified `calendar.js` used by all three pages.
- Each page sets `data-group` on `<body>` so the calendar knows which group it is.
- Fixed Sisters page title/heading (previously copied from Metrowest).
- Fixed Metrowest/Sisters to actually load a calendar (they previously referenced missing JS).
- Added persistent saving/loading to your SheetDB endpoint.
- Handles your existing rows where `date` is an Excel serial (e.g., `45879`) and converts to proper dates.

How it works:
- On load, the page calls `GET {SHEETDB}/search?group=<Group>` to fetch signups.
- Clicking a date opens a simple form. Submitting POSTs a new row:
  ```json
  { "data": [ { "date": "YYYY-MM-DD", "group": "<Group>", "name": "<Your Name>" } ] }
  ```
- Client-side prevents double booking (one signup per date) unless the user confirms replacing.
  (Note: This creates a new row, it doesn't delete/overwrite old ones. If you want true upserts,
  we can switch to a different SheetDB pattern—just say the word.)

Files:
- `index.html` – unchanged
- `elders-drphillips.html` – updated
- `elders-metrowest.html` – updated
- `sisters-windermere.html` – updated
- `calendar.js` – new unified calendar logic
- `style.css` – unchanged

Deploy by uploading these files to your hosting (GitHub Pages, etc.).
