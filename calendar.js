
// Unified Calendar for Missionary Meals (SheetDB-backed)
(function() {
  const SHEETDB_URL = "https://sheetdb.io/api/v1/wr8bptn1wll6e";
  const group = (document.body && document.body.dataset && document.body.dataset.group) || "";
  if (!group) {
    console.error("Missing data-group on <body>.");
  }

  // DOM elements
  const calendarEl = document.getElementById("calendar");
  const monthTitleEl = document.getElementById("month-title");
  const formEl = document.getElementById("form");
  const selectedDateLabel = document.getElementById("selected-date-label");
  const nameInput = document.getElementById("name");

  if (!calendarEl || !monthTitleEl || !formEl || !selectedDateLabel || !nameInput) {
    console.error("Missing one or more required DOM elements.");
  }

  // State
  let current = new Date();
  current.setDate(1);
  let selectedISO = null;
  // Map of dateISO -> name
  let bookings = {};

  // Helpers
  const pad = n => (n < 10 ? "0" + n : "" + n);
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function fromExcelSerial(serial) {
    try {
      const epoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
      const ms = serial * 86400000;
      const d = new Date(epoch.getTime() + ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch (e) {
      return null;
    }
  }

  function setMonthTitle(d) {
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthTitleEl.textContent = monthNames[d.getMonth()] + " " + d.getFullYear();
  }

  function startOfCalendar(d) {
    const copy = new Date(d.getFullYear(), d.getMonth(), 1);
    const day = copy.getDay(); // 0=Sun
    copy.setDate(copy.getDate() - day);
    return copy;
  }

  function renderCalendar() {
    setMonthTitle(current);
    calendarEl.innerHTML = "";
    const start = startOfCalendar(current);
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toISO(day);
      const cell = document.createElement("button");
      cell.className = "day";
      cell.type = "button";

      if (day.getMonth() !== current.getMonth()) {
        cell.classList.add("muted");
      }

      const label = document.createElement("div");
      label.className = "day-num";
      label.textContent = day.getDate();

      const signup = document.createElement("div");
      signup.className = "signup-name";
      signup.textContent = bookings[iso] ? bookings[iso] : "—";

      cell.appendChild(label);
      cell.appendChild(signup);
      cell.addEventListener("click", () => selectDate(iso, bookings[iso] || ""));
      calendarEl.appendChild(cell);
    }
  }

  function selectDate(iso, currentName) {
    selectedISO = iso;
    selectedDateLabel.textContent = "Selected date: " + iso;
    formEl.style.display = "block";
    nameInput.value = currentName || "";
    nameInput.focus();
  }

  async function fetchGroupBookings() {
    try {
      const url = `${SHEETDB_URL}/search?group=${encodeURIComponent(group)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      const map = {};
      for (const row of data) {
        let iso = null;
        const raw = row.date;
        if (raw !== undefined && raw !== null) {
          const s = String(raw).trim();
          if (/^\d+$/.test(s)) {
            iso = fromExcelSerial(parseInt(s, 10));
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            iso = s;
          } else {
            const d = new Date(s);
            if (!isNaN(d.getTime())) iso = toISO(d);
          }
        }
        if (iso) {
          if (!map[iso]) map[iso] = row.name || "";
        }
      }
      bookings = map;
    } catch (e) {
      console.error("Failed to load bookings", e);
    }
  }

  async function submitForm() {
    if (!selectedISO) {
      alert("Please click a date first.");
      return;
    }
    const name = (nameInput.value || "").trim();
    if (!name) { alert("Please enter your name."); return; }
    if (bookings[selectedISO] && bookings[selectedISO] !== name) {
      const ok = confirm(`This date already has “${bookings[selectedISO]}”. Replace it? This will add a new row.`);
      if (!ok) return;
    }

    try {
      const payload = { data: [ { date: selectedISO, group: group, name: name } ] };
      const res = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      // reflect in UI
      bookings[selectedISO] = name;
      renderCalendar();
      formEl.style.display = "none";
      alert("Saved!");
    } catch (e) {
      console.error("Save error", e);
      alert("There was a problem saving. Please try again.");
    }
  }

  window.changeMonth = function(delta) {
    current.setMonth(current.getMonth() + delta);
    renderCalendar();
  };
  window.goHome = function() { window.location.href = "index.html"; };
  window.submitForm = submitForm;

  (async function init() {
    setMonthTitle(current);
    await fetchGroupBookings();
    renderCalendar();
  })();
})();
