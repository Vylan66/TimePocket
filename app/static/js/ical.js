const icalConnectForm    = document.getElementById('ical-connect-form');
const icalConnectedState = document.getElementById('ical-connected-state');
const icalUrlInput       = document.getElementById('ical-url-input');
const icalConnectBtn     = document.getElementById('ical-connect-btn');
const icalConnectError   = document.getElementById('ical-connect-error');
const icalSyncBtn        = document.getElementById('ical-sync-btn');
const icalDisconnectBtn  = document.getElementById('ical-disconnect-btn');
const icalLastSynced     = document.getElementById('ical-last-synced');
const icalSyncError      = document.getElementById('ical-sync-error');

function fmtLastSynced(iso) {
    if (!iso) return 'Last synced: never';
    const d = new Date(iso);
    const diffMin = Math.round((Date.now() - d) / 60000);
    if (diffMin <= 1)  return 'Last synced: just now';
    if (diffMin < 60) return `Last synced: ${diffMin} minutes ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr <= 1)  return `Last synced: ${diffHr} hour ago`;
    if (diffHr < 24)  return `Last synced: ${diffHr} hour(s) ago`;
    return `Last synced: ${d.toLocaleDateString()}`;
}

function showConnected(feed) {
    icalConnectForm.classList.add('hidden');
    icalConnectedState.classList.remove('hidden');
    icalConnectedState.classList.add('flex');
    icalLastSynced.textContent = fmtLastSynced(feed.last_synced);
}

function showDisconnected() {
    icalConnectedState.classList.add('hidden');
    icalConnectedState.classList.remove('flex');
    icalConnectForm.classList.remove('hidden');
    icalUrlInput.value = '';
}

function setConnectError(msg) {
    icalConnectError.textContent = msg;
    icalConnectError.classList.toggle('hidden', !msg);
}

function setSyncError(msg) {
    icalSyncError.textContent = msg;
    icalSyncError.classList.toggle('hidden', !msg);
}

async function autoSyncIfStale(feed) {
    if (!feed) return;
    const staleMs = 60 * 60 * 1000; // 1 hour
    const lastMs  = feed.last_synced ? new Date(feed.last_synced).getTime() : 0;
    if (Date.now() - lastMs < staleMs) return;

    try {
        const res  = await fetch('/api/ical/sync', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            icalLastSynced.textContent = fmtLastSynced(data.last_synced);
            await reloadEvents();
        }
    } catch (_) { /* silent background sync failure */ }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch('/api/ical');
        const data = await res.json();
        if (data.feed) {
            showConnected(data.feed);
            autoSyncIfStale(data.feed);
        } else {
            showDisconnected();
        }
    } catch (_) {
        showDisconnected();
    }
});

icalConnectBtn.addEventListener('click', async () => {
    const url = icalUrlInput.value.trim();
    if (!url.toLowerCase().endsWith('.ics')) { setConnectError('Please enter a valid iCal URL.'); return; }
    setConnectError('');
    icalConnectBtn.disabled = true;
    icalConnectBtn.textContent = 'Connecting…';

    try {
        const res  = await fetch('/api/ical', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
            const err = data.error || '';
            let msg = 'Failed to connect. Please check the URL and try again.';
            if (err.includes('404') || err.toLowerCase().includes('not found'))
                msg = 'Calendar not found. Make sure it is set to public.';
            else if (err.includes('403') || err.toLowerCase().includes('forbidden'))
                msg = 'Access denied. Make sure your calendar is set to public.';
            else if (err.toLowerCase().includes('invalid') || err.toLowerCase().includes('parse'))
                msg = 'Invalid iCal data. Please check the URL is a valid .ics feed.';
            setConnectError(msg);
            return;
        }
        showConnected(data.feed);
        await reloadEvents();
    } catch (_) {
        setConnectError('Network error. Please try again.');
    } finally {
        icalConnectBtn.disabled = false;
        icalConnectBtn.textContent = 'Connect';
    }
});

icalSyncBtn.addEventListener('click', async () => {
    setSyncError('');
    icalSyncBtn.disabled = true;
    icalSyncBtn.textContent = 'Syncing…';

    try {
        const res  = await fetch('/api/ical/sync', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            const err = data.error || '';
            let msg = 'Sync failed. Please try again.';
            if (err.includes('404') || err.toLowerCase().includes('not found'))
                msg = 'Calendar not found. Make sure it is set to public.';
            else if (err.includes('403') || err.toLowerCase().includes('forbidden'))
                msg = 'Access denied. Make sure your calendar is set to public.';
            setSyncError(msg);
            return;
        }
        icalLastSynced.textContent = fmtLastSynced(data.last_synced);
        await reloadEvents();
    } catch (_) {
        setSyncError('Network error. Please try again.');
    } finally {
        icalSyncBtn.disabled = false;
        icalSyncBtn.textContent = 'Refresh';
    }
});

icalDisconnectBtn.addEventListener('click', async () => {
    if (!confirm('Disconnect your calendar? All imported events will be removed.')) return;

    try {
        const res = await fetch('/api/ical', { method: 'DELETE' });
        if (!res.ok) return;
        showDisconnected();
        await reloadEvents();
    } catch (_) { /* ignore */ }
});
