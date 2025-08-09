
const calendarEl = document.getElementById('calendar');
const form = document.getElementById('form');
const nameInput = document.getElementById('name');
const selectedDateLabel = document.getElementById('selected-date-label');
const submitBtn = document.getElementById('submit-btn');
const monthTitle = document.getElementById('month-title');

let currentMonth = 7;  // August
let currentYear = 2025;
const signUps = {};
let selectedDate = "";

function renderCalendar(month, year) {
  calendarEl.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  monthTitle.textContent = `${monthNames[month]} ${year}`;

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    calendarEl.appendChild(empty);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const key = `${year}-${month + 1}-${i}`;
    const day = document.createElement('div');
    day.className = 'day';
    day.dataset.date = key;

    const nameDiv = document.createElement('div');
    nameDiv.className = 'signup-name';
    nameDiv.id = `name-${key}`;
    nameDiv.textContent = signUps[key] || '';

    day.innerHTML = `<div>${i}</div>`;
    day.appendChild(nameDiv);

    day.onclick = () => showForm(i, month, year);
    calendarEl.appendChild(day);
  }
}

function showForm(day, month, year) {
  const key = `${year}-${month + 1}-${day}`;
  selectedDate = key;
  selectedDateLabel.textContent = `Sign up for ${key}`;
  form.style.display = 'block';
  nameInput.value = signUps[key] || '';
  nameInput.dataset.date = key;
  nameInput.focus();
}

function submitForm() {
  const name = nameInput.value.trim();
  const key = nameInput.dataset.date;
  if (name) {
    signUps[key] = name;
  } else {
    delete signUps[key];
  }
  renderCalendar(currentMonth, currentYear);
  form.style.display = 'none';
  nameInput.value = '';
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
}

function goHome() {
  window.location.href = "index.html";
}

renderCalendar(currentMonth, currentYear);
