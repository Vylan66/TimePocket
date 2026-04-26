// JavaScript file for mini calendar view on Personal calendar page
const CAL_DAYS   = ['S','M','T','W','T','F','S'];
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let calCurrent    = new Date();
let calSelected   = null;
let calPickerOpen = false;

const pickMonth = document.getElementById('pickMonth');
CAL_MONTHS.forEach((m, i) => {
const opt = document.createElement('option');
opt.value = i; opt.textContent = m;
pickMonth.appendChild(opt);
});

const pickYear = document.getElementById('pickYear');
const thisYear = new Date().getFullYear();
for (let y = thisYear - 50; y <= thisYear + 50; y++) {
const opt = document.createElement('option');
opt.value = y; opt.textContent = y;
pickYear.appendChild(opt);
}

function openCalPicker() {
calPickerOpen = true;
document.getElementById('calPicker').classList.add('open');
document.getElementById('calTitle').classList.add('open');
pickMonth.value = calCurrent.getMonth();
pickYear.value  = calCurrent.getFullYear();
}

function closeCalPicker() {
calPickerOpen = false;
document.getElementById('calPicker').classList.remove('open');
document.getElementById('calTitle').classList.remove('open');
}

document.getElementById('calTitle').addEventListener('click', () => {
calPickerOpen ? closeCalPicker() : openCalPicker();
});

document.getElementById('pickerGo').addEventListener('click', () => {
calCurrent.setFullYear(parseInt(pickYear.value));
calCurrent.setMonth(parseInt(pickMonth.value));
closeCalPicker();
renderCal();
});

document.addEventListener('click', e => {
if (calPickerOpen &&
    !document.getElementById('calPicker').contains(e.target) &&
    !document.getElementById('calTitle').contains(e.target)) {
    closeCalPicker();
}
});

function renderCal() {
const year  = calCurrent.getFullYear();
const month = calCurrent.getMonth();
const today = new Date();

document.getElementById('calTitleText').textContent = `${CAL_MONTHS[month]} ${year}`;

const grid = document.getElementById('calGrid');
grid.innerHTML = '';

CAL_DAYS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-label';
    el.textContent = d;
    grid.appendChild(el);
});

const firstDay    = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const prevDays    = new Date(year, month, 0).getDate();

for (let i = firstDay - 1; i >= 0; i--) addCalDay(grid, prevDays - i, true);

for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSel   = calSelected && d === calSelected.getDate() && month === calSelected.getMonth() && year === calSelected.getFullYear();
    addCalDay(grid, d, false, isToday, isSel, () => {
        calSelected = new Date(year, month, d);
        renderCal();
    });
}

const total     = firstDay + daysInMonth;
const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
for (let d = 1; d <= remaining; d++) addCalDay(grid, d, true);
}

function addCalDay(grid, num, otherMonth, isToday, isSel, onClick) {
const el = document.createElement('div');
el.className = 'cal-day';
if (otherMonth) el.classList.add('other-month');
if (isToday)    el.classList.add('today');
if (isSel)      el.classList.add('selected');
el.textContent = num;
if (onClick) el.addEventListener('click', onClick);
grid.appendChild(el);
}

document.getElementById('prevBtn').addEventListener('click', () => {
calCurrent.setMonth(calCurrent.getMonth() - 1); renderCal();
});
document.getElementById('nextBtn').addEventListener('click', () => {
calCurrent.setMonth(calCurrent.getMonth() + 1); renderCal();
});

renderCal();