
// Unified Calendar for Missionary Meals (SheetDB-backed)
(function() {
  const SHEETDB_URL = "https://sheetdb.io/api/v1/wr8bptn1wll6e";
  const group = document.body.dataset.group; // e.g., "Elders Metrowest"
  if (!group) {
    console.error("Missing data-group on <body>.");
  }

  // DOM elements
  const calendarEl = document.getElementById("calendar");
  const monthTitleEl = document.getElementById("month-title");
  const formEl = document.getElementById("form");
  const selectedDateLabel = document.getElementById("selected-date-label");
  const nameInput = document.getElementById("name");

  // State
  let current = new Date();
  current.setDate(1);
  let selectedISO = null;
  // Map of dateISO -> name
  let bookings = {};

  // Helpers
  function pad(n){ return n < 10 ? "0"+n : ""+n; }
  function toISO(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function fromExcelSerial(serial) {
    // Excel's epoch: 1899-12-30 (handles the 1900 leap-year bug implicitly)
    try {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = serial * 86400000; // days to ms
      const d = new Date(epoch.getTime() + ms);
      // Return as YYYY-MM-DD in local time
      return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
    } catch(e) { return null; }
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
    for (let i=0; i<42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toISO(day);
      const div = document.createElement("div");
      div.className = "day";
      if (day.getMonth() !== current.getMonth()) {
        div.style.opacity = "0.4";
      }
      const label = document.createElement("div");
      label.textContent = day.getDate();
      const signup = document.createElement("div");
      signup.className = "signup-name";
      if (bookings[iso]) {
        signup.textContent = bookings[iso];
      } else {
        signup.textContent = "—";
      }
      div.appendChild(label);
      div.appendChild(signup);
      div.onclick = () => selectDate(iso, bookings[iso] || "");
      calendarEl.appendChild(div);
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
      const url = SHEETDB_URL + "/search?group=" + encodeURIComponent(group);
      const res = await fetch(url);
      const data = await res.json();
      const map = {};
      for (const row of data) {
        let iso = null;
        if (row.date) {
          if (/^\d+$/.test(String(row.date))) {
            iso = fromExcelSerial(parseInt(row.date, 10));
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) {
            iso = row.date;
          } else {
            // Try Date parse
            const d = new Date(row.date);
            if (!isNaN(d.getTime())) iso = toISO(d);
          }
        }
        if (iso) {
          // Only set if not set yet (first-in wins; avoids flicker if duplicates)
          if (!map[iso]) map[iso] = row.name || "";
        }
      }
      bookings = map;
    } catch (e) {
      console.error("Failed to load bookings", e);
    }
  }

  async function submitForm() {
    if (!selectedISO) return;
    const name = (nameInput.value || "").trim();
    if (!name) { alert("Please enter your name."); return; }
    // Prevent double booking client-side
    if (bookings[selectedISO] && bookings[selectedISO] !== name) {
      const ok = confirm("This date already has a signup (“"+bookings[selectedISO]+"”). Do you want to replace it? This may create a duplicate row in the sheet.");
      if (!ok) return;
    }

    try {
      const payload = {
        data: [ { date: selectedISO, group: group, name: name } ]
      };
      const res = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Network response was not ok");
      // Reflect immediately in UI
      bookings[selectedISO] = name;
      renderCalendar();
      formEl.style.display = "none";
      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("There was a problem saving. Please try again.");
    }
  }

  // Expose controls globally (used by buttons in HTML)
  window.changeMonth = function(delta) {
    current.setMonth(current.getMonth() + delta);
    renderCalendar();
  };
  window.goHome = function() {
    window.location.href = "index.html";
  };
  window.submitForm = submitForm;

  // Init
  (async function init() {
    setMonthTitle(current);
    await fetchGroupBookings();
    renderCalendar();
  })();
})();
