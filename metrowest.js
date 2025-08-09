// Elders Metrowest calendar — Missionary Meals
// Vanilla JS + SheetDB
(function(){'use strict';
  const SHEETDB = 'https://sheetdb.io/api/v1/wr8bptn1wll6e';
  const GROUP   = 'Elders Metrowest';

  // --- State ---
  let current = new Date(); current.setDate(1); // first of month
  let rows = [];          // raw rows returned by GET
  let bookings = {};     // 'YYYY-MM-DD' -> name (filtered current month)
  let selectedISO = null;

  // --- DOM ---
  const elMonth   = document.getElementById('month-title');
  const elCal     = document.getElementById('calendar');
  const elForm    = document.getElementById('form');
  const elName    = document.getElementById('name');
  const elSelLbl  = document.getElementById('selected-date-label');
  const elToast   = document.getElementById('toast');

  // --- Utilities ---
  function ymd(y, m0, d){ const mm = String(m0+1).padStart(2,'0'); const dd = String(d).padStart(2,'0'); return y+'-'+mm+'-'+dd; }
  function showToast(msg){ if(!elToast) return; elToast.textContent = msg; elToast.style.display='block'; setTimeout(()=> elToast.style.display='none', 1800); }
  function monthLabel(d){ const m=['January','February','March','April','May','June','July','August','September','October','November','December']; return m[d.getMonth()]+' '+d.getFullYear(); }
  function startOfGrid(d){ const c = new Date(d.getFullYear(), d.getMonth(), 1); const dow = c.getDay(); c.setDate(c.getDate()-dow); return c; }
  function isToday(y,m0,d){ const t=new Date(); return t.getFullYear()===y && t.getMonth()===m0 && t.getDate()===d; }

  // Fallback if sheet ever contains Excel serials (defensive only)
  function fromExcelSerial(serial){ try{ const epoch = new Date(Date.UTC(1899,11,30)); const ms = Number(serial)*86400000; const d = new Date(epoch.getTime()+ms); if(isNaN(d)) return null; return ymd(d.getFullYear(), d.getMonth(), d.getDate()); }catch(e){return null} }

  // --- Rendering ---
  function renderCalendar(){ 
    if(!elCal||!elMonth) return;
    elMonth.textContent = monthLabel(current);
    elCal.innerHTML='';
    const start = startOfGrid(current);
    for(let i=0;i<42;i++){ 
      const day = new Date(start); day.setDate(start.getDate()+i);
      const iso = ymd(day.getFullYear(), day.getMonth(), day.getDate());
      const cell = document.createElement('button');
      cell.type='button'; cell.className='day'; cell.setAttribute('aria-label', iso);
      if(day.getMonth()!==current.getMonth()) cell.classList.add('muted');
      if(isToday(day.getFullYear(), day.getMonth(), day.getDate())) cell.classList.add('today');

      const num = document.createElement('div'); num.className='num'; num.textContent = day.getDate();
      const who = document.createElement('div'); who.className='signup'; who.textContent = bookings[iso] ? bookings[iso] : '—';

      cell.appendChild(num); cell.appendChild(who);
      cell.addEventListener('click', ()=> onSelectDate(iso));
      elCal.appendChild(cell);
    }
  }

  function onSelectDate(iso){ 
    selectedISO = iso;
    if(elSelLbl) elSelLbl.textContent = 'Selected: '+iso;
    if(elForm) elForm.style.display = 'flex';
    if(elName) { elName.value = bookings[iso] || ''; elName.focus(); }
  }

  // --- Networking ---
  async function loadData(){ 
    try {
      const url = SHEETDB + '/search?group=' + encodeURIComponent(GROUP);
      const res = await fetch(url, { method:'GET' });
      if(!res.ok) throw new Error('Load '+res.status);
      rows = await res.json();
    } catch(err) { console.error('Load error', err); rows=[]; }
    // Build bookings for the current month only
    const ym = ymd(current.getFullYear(), current.getMonth(), 1).slice(0,7); // 'YYYY-MM'
    bookings = {}
    for(const r of rows) {
      if(!r) continue;
      let iso = (r.date || '').trim ? r.date.trim() : r.date;
      if(iso && /^\d+$/.test(String(iso))) iso = fromExcelSerial(iso) || iso; // defensive
      if(typeof iso!=='string') continue;
      if(!iso.startsWith(ym)) continue;
      const nm = (r.name||'').trim();
      if(nm==='') continue; // treat empty names as cleared
      bookings[iso] = nm;
    }
    renderCalendar();
  }

  async function submitForm(){ 
    if(!selectedISO) return alert('Please tap a date first.');
    const name = (elName && elName.value ? elName.value : '').trim();
    const exists = !!rows.find(r => (String(r.date).trim()===selectedISO) && (r.group===GROUP));
    try {
      if(name==='') {
        // clear existing record if present
        if(exists) {
          const url = SHEETDB + '/date/' + encodeURIComponent(selectedISO) + '/group/' + encodeURIComponent(GROUP);
          const res = await fetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data:[{ name:'' }] }) });
          if(!res.ok) throw new Error('Clear '+res.status);
        } else {
          // nothing to clear
        }
      } else if(exists) {
        const url = SHEETDB + '/date/' + encodeURIComponent(selectedISO) + '/group/' + encodeURIComponent(GROUP);
        const res = await fetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data:[{ name:name }] }) });
        if(!res.ok) throw new Error('Update '+res.status);
      } else {
        const res = await fetch(SHEETDB, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data:[{ date:selectedISO, group:GROUP, name:name }] }) });
        if(!res.ok) throw new Error('Create '+res.status);
      }
      showToast('Saved');
      // Reload month to reflect changes
      await loadData();
      if(elForm) elForm.style.display='none';
    } catch(err) {
      console.error('Submit error', err);
      alert('Could not save. Please check your connection and try again.');
    }
  }

  // --- Controls ---
  window.changeMonth = function(delta){ current.setMonth(current.getMonth()+delta); loadData(); };
  window.goHome = function(){ window.location = 'index.html'; };
  window.submitForm = submitForm;

  // Init
  (function init(){ renderCalendar(); loadData(); })();
})();
