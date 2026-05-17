events = [];
buildColumns();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch('/availability');
        const data = await res.json();
        events = data.map(s => ({
            title:             s.title || availTitle(s.start_time, s.end_time),
            date:              s.date,
            start:             s.start_time,
            end:               s.end_time,
            category:          s.category || 'Personal',
            note:              s.notes || '',
            dbId:              s.id,
            isRecurring:       s.is_recurring || false,
            recurrence:        s.recurrence || 'none',
            recurrenceGroupId: s.recurrence_group_id || null,
        }));
        buildColumns();
    } catch (e) {
        console.error('Failed to load availability:', e);
    }
});

async function reloadEvents() {
    try {
        const res  = await fetch('/availability');
        const data = await res.json();
        events = data.map(s => ({
            title:             s.title || availTitle(s.start_time, s.end_time),
            date:              s.date,
            start:             s.start_time,
            end:               s.end_time,
            category:          s.category || 'Personal',
            note:              s.notes || '',
            dbId:              s.id,
            isRecurring:       s.is_recurring || false,
            recurrence:        s.recurrence || 'none',
            recurrenceGroupId: s.recurrence_group_id || null,
        }));
        buildColumns();
    } catch (e) {
        console.error('Failed to reload availability:', e);
    }
}

window.onEventSave = async function ({ title, date, start, end, category, note, recurrence }) {
    try {
        const res = await fetch('/availability', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                date,
                start_time: start,
                end_time:   end,
                title,
                category,
                notes:      note,
                recurrence: recurrence || 'none',
            }),
        });
        const data = await res.json();
        if (recurrence && recurrence !== 'none') {
            await reloadEvents();
        } else {
            const ev = events[events.length - 1];
            if (ev && data.id) ev.dbId = data.id;
        }
    } catch (e) {
        console.error('Failed to save availability:', e);
    }
};

window.onDeleteRecurringFrom = async function (groupId, fromDate) {
    try {
        await fetch(`/availability/recurring/${groupId}/from/${fromDate}`, { method: 'DELETE' });
        await reloadEvents();
    } catch (e) {
        console.error('Failed to delete recurring events:', e);
    }
};

window.onUpdateRecurringFrom = async function (groupId, fromDate, updateData) {
    try {
        await fetch(`/availability/recurring/${groupId}/from/${fromDate}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(updateData),
        });
        await reloadEvents();
    } catch (e) {
        console.error('Failed to update recurring events:', e);
    }
};

function availTitle(start, end) {
    if (start === 'allday') return 'All day';
    return `${fmt12(start)} – ${fmt12(end)}`;
}

function fmt12(t) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12    = h % 12 || 12;
    return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}