events = [];
buildColumns();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch('/availability');
        const data = await res.json();
        events = data.map(s => ({
            title: availTitle(s.start_time, s.end_time),
            day:   parseInt(s.day),
            start: s.start_time,
            end:   s.end_time,
            color: 'bg-blue-500',
            dbId:  s.id
        }));
        buildColumns();
    } catch (e) {
        console.error('Failed to load availability:', e);
    }
});

window.onEventSave = async function ({ day, start, end }) {
    try {
        await fetch('/availability', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ day: String(day), start_time: start, end_time: end })
        });
    } catch (e) {
        console.error('Failed to save availability:', e);
    }
};

function availTitle(start, end) {
    return `${fmt12(start)} – ${fmt12(end)}`;
}

function fmt12(t) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12    = h % 12 || 12;
    return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}
