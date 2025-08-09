
// Missionary Meals Calendar (hardened) — SheetDB backed
// Renders calendar immediately, then loads signups. Friendly error handling.
(function () {
  "use strict";

  const SHEETDB_URL = "https://sheetdb.io/api/v1/wr8bptn1wll6e";

  // Utilities
  const qs  = (sel) => document.querySelector(sel);
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function fromExcelSerial(serial) {
    // Excel epoch 1899-12-30 (handles 1900 bug)
    try {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = Number(serial) * 86400000;
      const d = new Date(epoch.getTime() + ms);
      if (isNaN(d.getTime())) return null;
      return toISO(d);
    } catch { return null; }
  }

  function startOfCalendar(d) {
    const c = new Date(d.getFullYear(), d.getMonth(), 1);
    const dow = c.getDay(); // 0=Sun
    c.setDate(c.getDate() - dow);
    return c;
  }

  function monthLabel(d) {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function safeGroup() {
    try {
      return (document.body && document.body.dataset && document.body.dataset.group) ? document.body.dataset.group : "";
    } catch { return ""; }
  }

  // State
  let current = new Date(); current.setDate(1);
  let bookings = {}; // iso -> name
  let selectedISO = null;
  const group = safeGroup();

  // DOM
  const monthTitleEl = qs("#month-title");
  const calendarEl   = qs("#calendar");
  const formEl       = qs("#form");
  const nameInput    = qs("#name");
  const selectedLbl  = qs("#selected-date-label");

  function assertDom() {
    const missing = [];
    if (!monthTitleEl) missing.push("#month-title");
    if (!calendarEl)   missing.push("#calendar");
    if (!formEl)       missing.push("#form");
    if (!nameInput)    missing.push("#name");
    if (!selectedLbl)  missing.push("#selected-date-label");
    if (missing.length) {
      console.error("Calendar init error — missing DOM elements:", missing.join(", "));
      return false;
    }
    return true;
  }

  function renderCalendarGrid() {
    if (!assertDom()) return;
    monthTitleEl.textContent = monthLabel(current);
    calendarEl.innerHTML = "";

    const start = startOfCalendar(current);
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toISO(day);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day";
      if (day.getMonth() !== current.getMonth()) cell.classList.add("muted");

      const num = document.createElement("div");
      num.className = "day-num";
      num.textContent = day.getDate();

      const who = document.createElement("div");
      who.className = "signup-name";
      who.textContent = bookings[iso] ? bookings[iso] : "—";

      cell.appendChild(num);
      cell.appendChild(who);
      cell.addEventListener("click", () => onSelectDate(iso));
      calendarEl.appendChild(cell);
    }
  }

  function refreshNamesOnly() {
    // Update only the text in cells (after bookings load) without rebuilding grid
    if (!calendarEl) return;
    const cells = calendarEl.querySelectorAll(".day");
    cells.forEach((cell) => {
      const numEl = cell.querySelector(".day-num");
      if (!numEl) return;
      const day = Number(numEl.textContent);
      const date = new Date(current.getFullYear(), current.getMonth(), day);
      // If cell is from previous/next month, it still has a valid ISO based on label+muted
      // So instead, recompute using first child date + month offset from muted
      let iso;
      if (cell.classList.contains("muted")) {
        // Determine whether this muted cell is from previous or next month
        // If the first row and day number > 7, it's previous month, otherwise next month
        const firstRowIndex = Array.from(cells).indexOf(cell) < 7;
        const prev = firstRowIndex;
        const m = new Date(current);
        m.setMonth(current.getMonth() + (prev ? -1 : 1));
        iso = toISO(new Date(m.getFullYear(), m.getMonth(), day));
      } else {
        iso = toISO(new Date(current.getFullYear(), current.getMonth(), day));
      }
      const who = cell.querySelector(".signup-name");
      if (who) who.textContent = bookings[iso] ? bookings[iso] : "—";
    });
  }

  function onSelectDate(iso) {
    selectedISO = iso;
    if (selectedLbl) selectedLbl.textContent = "Selected date: " + iso;
    if (formEl) formEl.style.display = "flex";
    if (nameInput) { nameInput.value = bookings[iso] || ""; nameInput.focus(); }
  }

  async function loadBookings() {
    if (!group) {
      console.warn("No group found on body[data-group]. Calendar will still render.");
      return;
    }
    const url = `${SHEETDB_URL}/search?group=${encodeURIComponent(group)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`Fetch ${res.status}`);
      const rows = await res.json();
      const map = {};
      for (const row of rows) {
        let iso = null;
        if (row && row.date !== undefined && row.date !== null) {
          const s = String(row.date).trim();
          if (/^\d+$/.test(s)) iso = fromExcelSerial(s);
          else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = s;
          else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) iso = toISO(d);
          }
        }
        if (iso && !map[iso]) map[iso] = row.name || "";
      }
      bookings = map;
      refreshNamesOnly();
    } catch (err) {
      console.error("Failed to load bookings from SheetDB:", err);
    }
  }

  async function saveBooking() {
    if (!selectedISO) return alert("Please click a date first.");
    if (!nameInput) return;
    const name = (nameInput.value || "").trim();
    if (!name) return alert("Please enter your name.");

    if (bookings[selectedISO] && bookings[selectedISO] !== name) {
      const ok = confirm(`This date already has “${bookings[selectedISO]}”. Replace it? This will create a new row.`);
      if (!ok) return;
    }

    const payload = { data: [ { date: selectedISO, group: group, name: name } ] };
    try {
      const res = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Save ${res.status}`);
      bookings[selectedISO] = name;
      refreshNamesOnly();
      if (formEl) formEl.style.display = "none";
      alert("Saved!");
    } catch (err) {
      console.error("Failed to save to SheetDB:", err);
      alert("There was a problem saving. Please try again.");
    }
  }

  // Expose controls
  window.changeMonth = function(delta) {
    current.setMonth(current.getMonth() + delta);
    renderCalendarGrid();
    refreshNamesOnly();
  };
  window.goHome = function() { window.location.href = "index.html"; };
  window.submitForm = function() { saveBooking(); };

  // Initialize once DOM is ready; render first, then fetch.
  function init() {
    try {
      if (!assertDom()) return;
      if (formEl) formEl.style.display = "none";
      renderCalendarGrid();
      loadBookings(); // async; grid already visible
    } catch (e) {
      console.error("Calendar init failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
