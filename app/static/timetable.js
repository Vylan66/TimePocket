// Hour range 
// HOUR_HEIGHT is read from --hour-h so CSS is the single source of truth.
// --num-hours is written to CSS so calc() in the stylesheet stays in sync.
const START_HOUR  = 4;
const END_HOUR    = 23;
const NUM_HOURS   = END_HOUR - START_HOUR + 1;
const _timeBody  = document.getElementById('time-body');
const HOUR_HEIGHT = parseFloat(
    getComputedStyle(_timeBody).getPropertyValue('--hour-h')
);
_timeBody.style.setProperty('--num-hours', NUM_HOURS);

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let weekOffset  = 0;

// Example events (to remove)
let events = [
    { title: '9am — Lecture',       day: 0, start: '09:00', end: '10:00', color: 'bg-blue-400'   },
    { title: '1pm — Lunch',         day: 0, start: '13:00', end: '14:00', color: 'bg-green-400'  },
    { title: '10am — Tutorial',     day: 2, start: '10:00', end: '11:30', color: 'bg-blue-400'   },
    { title: '3pm — Gym',           day: 2, start: '15:00', end: '16:00', color: 'bg-orange-400' },
    { title: 'Busy',                day: 4, start: '09:00', end: '09:30', color: 'bg-red-300'    },
    { title: '2pm — Study session', day: 4, start: '14:00', end: '17:00', color: 'bg-blue-300'   },
    { title: '11am — Brunch',       day: 5, start: '11:00', end: '13:00', color: 'bg-orange-300' },
];

// Helpers 
function getWeekStart() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
}

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
            a.getMonth()    === b.getMonth()    &&
            a.getDate()     === b.getDate();
}

function timeToFrac(t) {
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
}

function fracToY(frac) { return (frac - START_HOUR) * HOUR_HEIGHT; }

function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12    = h % 12 || 12;
    return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2,'0')}${suffix}`;
}

// Week headers — updates existing static DOM elements 
function renderWeekHeaders() {
    const weekStart = getWeekStart();
    const today     = new Date();
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

    const fmt = d => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    document.getElementById('weekLabel').textContent = `${fmt(weekStart)} – ${fmt(weekEnd)}`;

    for (let i = 0; i < 7; i++) {
        const d    = new Date(weekStart); d.setDate(d.getDate() + i);
        const isTod = sameDay(d, today);
        document.getElementById(`hdr-name-${i}`).textContent = DAY_NAMES[i];
        const dateEl = document.getElementById(`hdr-date-${i}`);
        dateEl.textContent      = d.getDate();
        dateEl.style.background = isTod ? 'var(--blue)' : '';
        dateEl.style.color      = isTod ? '#fff' : 'var(--dark)';
    }
}

function changeWeek(dir) {
    weekOffset += dir;
    renderWeekHeaders();
    buildColumns();
}

// Day columns — only injects events + now-line; layout is CSS 
function buildColumns() {
    const weekStart = getWeekStart();
    const today     = new Date(); today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const col     = document.getElementById(`col-${i}`);
        const day     = new Date(weekStart); day.setDate(day.getDate() + i);
        const isToday = day.getTime() === today.getTime();

        col.innerHTML = '';

        events.filter(e => e.day === i).forEach(ev => {
            const top    = fracToY(timeToFrac(ev.start));
            const height = fracToY(timeToFrac(ev.end)) - top;
            const el     = document.createElement('div');
            el.className    = `cal-event ${ev.color}`;
            el.style.top    = `${top}px`;
            el.style.height = `${Math.max(height - 4, 20)}px`;
            el.innerHTML    = `<div class="ev-title">${ev.title}</div><div class="ev-time">${formatTime(ev.start)} – ${formatTime(ev.end)}</div>`;
            col.appendChild(el);
        });

        if (isToday) {
            const now  = new Date();
            const frac = now.getHours() + now.getMinutes() / 60;
            if (frac >= START_HOUR && frac <= END_HOUR) {
                const line = document.createElement('div');
                line.className = 'now-line';
                line.style.top = `${fracToY(frac)}px`;
                col.appendChild(line);
            }
        }
    }

    // Populate popup day select
    const evDay = document.getElementById('evDay');
    evDay.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const d   = new Date(weekStart); d.setDate(d.getDate() + i);
        const opt = document.createElement('option');
        opt.value       = i;
        opt.textContent = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
        evDay.appendChild(opt);
    }
}

// New Event Pop-up 
const popupOverlay = document.getElementById('popupOverlay');

document.getElementById('addEventBtn').addEventListener('click', () => {
    popupOverlay.style.display    = 'flex';
    popupOverlay.style.background = 'var(--overlay-bg)';
    document.getElementById('evTitle').focus();
});

function closepopup() { popupOverlay.style.display = 'none'; }
function handleOverlayClick(e) { if (e.target === popupOverlay) closepopup(); }

document.getElementById('cancelBtn').addEventListener('click', closepopup);
document.getElementById('btn-popup-close').addEventListener('click', closepopup);

document.getElementById('saveBtn').addEventListener('click', () => {
    const title = document.getElementById('evTitle').value.trim();
    const day   = parseInt(document.getElementById('evDay').value);
    const start = document.getElementById('evStart').value;
    const end   = document.getElementById('evEnd').value;
    const color = document.getElementById('evColor').value;

    if (!title || !start || !end || start >= end) {
        alert('Please fill in all fields and ensure start time is before end time.');
        return;
    }

    events.push({ title, day, start, end, color });
    closepopup();
    buildColumns();
    document.getElementById('evTitle').value = '';
});

document.getElementById('todayBtn').addEventListener('click', () => {
    weekOffset = 0;
    renderWeekHeaders();
    buildColumns();
});

// Init 
renderWeekHeaders();
buildColumns();
document.getElementById('time-body').scrollTop = (7 - START_HOUR) * HOUR_HEIGHT;