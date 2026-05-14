// Hour range 
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

const CATEGORY_COLORS = {
    'Personal': '#d6bf6c',
    'Studies':  '#5e99f0',
    'Work':     '#f68383',
    'Social':   '#a729d0',
    'Health':   '#f2a061',
    'Finance':  '#5bbb81',
};

let events     = [];
let editingIdx = null;

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

function toDateStr(d) {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Week headers
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

function goToWeekContaining(date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d     = new Date(date); d.setHours(0, 0, 0, 0);
    const targetSunday  = new Date(d);    targetSunday.setDate(d.getDate() - d.getDay());
    const currentSunday = new Date(today); currentSunday.setDate(today.getDate() - today.getDay());
    weekOffset = Math.round((targetSunday - currentSunday) / (7 * 24 * 60 * 60 * 1000));
    renderWeekHeaders();
    buildColumns();
}

// Overlap layout
function computeLayout(dayEvents) {
    if (dayEvents.length === 0) return [];

    const sorted = [...dayEvents]
        .map((ev, i) => ({ ev, i }))
        .sort((a, b) => timeToFrac(a.ev.start) - timeToFrac(b.ev.start));

    const slotEnds = [];
    const assigned = sorted.map(({ ev, i }) => {
        const start = timeToFrac(ev.start);
        const end   = timeToFrac(ev.end);
        let slot = slotEnds.findIndex(endFrac => endFrac <= start);
        if (slot === -1) slot = slotEnds.push(0) - 1;
        slotEnds[slot] = end;
        return { ev, i, slot };
    });

    return assigned.map(item => {
        const start = timeToFrac(item.ev.start);
        const end   = timeToFrac(item.ev.end);
        const concurrent = assigned.filter(
            other => timeToFrac(other.ev.start) < end &&
                     timeToFrac(other.ev.end)   > start
        );
        const totalCols = Math.max(...concurrent.map(c => c.slot)) + 1;
        return { ...item, totalCols };
    });
}

// Day columns
function buildColumns() {
    const weekStart = getWeekStart();
    const today     = new Date(); today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const col     = document.getElementById(`col-${i}`);
        const day     = new Date(weekStart); day.setDate(day.getDate() + i);
        const isToday = day.getTime() === today.getTime();

        col.innerHTML = '';

        const dateStr  = toDateStr(day);
        const dayEvents = events.filter(e => e.date === dateStr);
        computeLayout(dayEvents).forEach(({ ev, slot, totalCols }) => {
            const top    = fracToY(timeToFrac(ev.start));
            const height = fracToY(timeToFrac(ev.end)) - top;
            const el     = document.createElement('div');
            el.className             = 'cal-event';
            el.style.top             = `${top}px`;
            el.style.height          = `${Math.max(height-3, 20)}px`;
            el.style.backgroundColor = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['Personal'];
            el.innerHTML             = `<div class="ev-title">${ev.title}</div><div class="ev-time">${formatTime(ev.start)} – ${formatTime(ev.end)}</div>`;

            const pct      = 100 / totalCols;
            el.style.left  = `calc(${slot * pct}% + 1.5px)`;
            el.style.right = 'auto';
            el.style.width = `calc(${pct}% - 2.5px)`;

            const capturedIdx = events.indexOf(ev);
            el.addEventListener('click', (e) => { e.stopPropagation(); openEventDetail(capturedIdx); });
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

    const evDay = document.getElementById('evDay');
    if (evDay) {
        evDay.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const d   = new Date(weekStart); d.setDate(d.getDate() + i);
            const opt = document.createElement('option');
            opt.value       = toDateStr(d);
            opt.textContent = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
            evDay.appendChild(opt);
        }
    }

    if (typeof window.onAfterBuildColumns === 'function') window.onAfterBuildColumns();
}

// New Event Pop-up
const popupOverlay = document.getElementById('popupOverlay');

function closepopup() {
    if (popupOverlay) popupOverlay.style.display = 'none';
    editingIdx = null;
    const pt = document.getElementById('popup-title');
    if (pt) pt.textContent = 'New Event';
}
function handleOverlayClick(e) { if (e.target === popupOverlay) closepopup(); }

if (document.getElementById('addEventBtn')) {
    document.getElementById('addEventBtn').addEventListener('click', () => {
        popupOverlay.style.display    = 'flex';
        popupOverlay.style.background = 'var(--overlay-bg)';

        const weekStart = getWeekStart();
        const target    = (typeof calSelected !== 'undefined' && calSelected)
                            ? new Date(calSelected)
                            : new Date();
        target.setHours(0, 0, 0, 0);
        let defaultDate = null;
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart); d.setDate(d.getDate() + i);
            if (sameDay(d, target)) { defaultDate = toDateStr(d); break; }
        }
        if (defaultDate) document.getElementById('evDay').value = defaultDate;

        document.getElementById('evTitle').focus();
    });
}
if (document.getElementById('cancelBtn'))   document.getElementById('cancelBtn').addEventListener('click', closepopup);
if (document.getElementById('btn-popup-close')) document.getElementById('btn-popup-close').addEventListener('click', closepopup);

if (document.getElementById('saveBtn')) {
    document.getElementById('saveBtn').addEventListener('click', async () => {
        const title    = document.getElementById('evTitle').value.trim();
        const date     = document.getElementById('evDay').value;
        const start    = document.getElementById('evStart').value;
        const end      = document.getElementById('evEnd').value;
        const category = document.getElementById('evCategory').value;
        const note     = document.getElementById('evNote').value.trim();

        if (!title || !date || !start || !end || start >= end) {
            alert('Please fill in all fields and ensure start time is before end time.');
            return;
        }

        if (editingIdx !== null) {
            const old = events[editingIdx];
            events.splice(editingIdx, 1, { title, date, start, end, category, note, dbId: old.dbId });
            if (old.dbId) {
                try {
                    await fetch(`/availability/${old.dbId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            date,
                            start_time: start,
                            end_time: end,
                            title,
                            category,
                            notes: note,
                        }),
                    });
                } catch (err) {
                    console.error('Failed to update event:', err);
                }
            }
        } else {
            events.push({ title, date, start, end, category, note });
            if (typeof window.onEventSave === 'function') window.onEventSave({ title, date, start, end, category, note });
        }
        closepopup();
        buildColumns();
        document.getElementById('evTitle').value = '';
        document.getElementById('evNote').value  = '';
    });
}

document.getElementById('todayBtn').addEventListener('click', () => {
    weekOffset = 0;
    renderWeekHeaders();
    buildColumns();
    if (typeof jumpToDate === 'function') jumpToDate(new Date());
});

// Event detail popup
const evDetailOverlay = document.getElementById('evDetailOverlay');

function closeEventDetail() {
    if (evDetailOverlay) evDetailOverlay.style.display = 'none';
}

function handleDetailOverlayClick(e) {
    if (e.target === evDetailOverlay) closeEventDetail();
}

function openEventDetail(idx) {
    const ev = events[idx];
    if (!ev) return;

    document.getElementById('det-color-bar').style.background = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['Personal'];
    document.getElementById('det-title').textContent    = ev.title;
    document.getElementById('det-category').textContent = ev.category;

    const d = new Date(ev.date + 'T00:00:00');
    document.getElementById('det-date').textContent = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('det-time').textContent = `${formatTime(ev.start)} – ${formatTime(ev.end)}`;

    const noteRow = document.getElementById('det-note-row');
    document.getElementById('det-note').textContent = ev.note || '';
    noteRow.style.display = ev.note ? '' : 'none';

    document.getElementById('det-edit-btn').onclick   = () => editEvent(idx);
    document.getElementById('det-delete-btn').onclick = () => deleteEvent(idx);

    evDetailOverlay.style.display    = 'flex';
    evDetailOverlay.style.background = 'var(--overlay-bg)';
}

function editEvent(idx) {
    const ev = events[idx];
    if (!ev) return;
    closeEventDetail();
    editingIdx = idx;

    document.getElementById('evTitle').value    = ev.title;
    document.getElementById('evDay').value      = ev.date;
    document.getElementById('evStart').value    = ev.start;
    document.getElementById('evEnd').value      = ev.end;
    document.getElementById('evCategory').value = ev.category;
    document.getElementById('evNote').value     = ev.note || '';

    const pt = document.getElementById('popup-title');
    if (pt) pt.textContent = 'Edit Event';

    popupOverlay.style.display    = 'flex';
    popupOverlay.style.background = 'var(--overlay-bg)';
}

async function deleteEvent(idx) {
    const ev = events[idx];
    if (!ev) return;
    if (!confirm('Are you sure you want to delete this event?')) return;
    if (ev.dbId) {
        try {
            await fetch(`/availability/${ev.dbId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete event:', err);
            return;
        }
    }
    events.splice(idx, 1);
    closeEventDetail();
    buildColumns();
}

if (document.getElementById('btn-detail-close')) {
    document.getElementById('btn-detail-close').addEventListener('click', closeEventDetail);
}

// Init
renderWeekHeaders();
buildColumns();
document.getElementById('time-body').scrollTop = (7 - START_HOUR) * HOUR_HEIGHT;