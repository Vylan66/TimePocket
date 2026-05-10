// Group calendar state
let selectedGroupId   = null;
let selectedGroupRole = null;
let cachedGroups      = [];
let currentHeatmapData = null;
let pendingMembers    = []; // [{id, username}] for create group popup

// Re-fetch heatmap for the newly displayed week whenever columns rebuild
window.onAfterBuildColumns = function () {
    if (selectedGroupId) fetchHeatmap(selectedGroupId);
};

async function fetchHeatmap(groupId) {
    const weekStart = getWeekStart();
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const start = toDateStr(weekStart);
    const end   = toDateStr(weekEnd);
    try {
        const res  = await fetch(`/groups/${groupId}/heatmap?start=${start}&end=${end}`);
        const data = await res.json();
        currentHeatmapData = data;
        renderHeatmap(data);
    } catch { /* ignore */ }
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadGroups();

    // Groups panel
    document.getElementById('group-search').addEventListener('input', e => {
        renderGroupsList(cachedGroups, e.target.value);
    });
    document.getElementById('btn-add-group').addEventListener('click', openCreateGroupPopup);

    // Members panel
    document.getElementById('btn-back').addEventListener('click', backToGroups);
    document.getElementById('btn-group-settings').addEventListener('click', openSettingsPopup);

    // Create group popup
    document.getElementById('btn-create-cancel').addEventListener('click', closeCreateGroupPopup);
    document.getElementById('btn-create-close').addEventListener('click',  closeCreateGroupPopup);
    document.getElementById('btn-create-save').addEventListener('click',   createGroup);
    document.getElementById('new-member-search').addEventListener('focus', () => searchUsersForCreate(''));
    document.getElementById('new-member-search').addEventListener('input',
        debounce(e => searchUsersForCreate(e.target.value), 280));

    // Settings popup
    document.getElementById('btn-settings-cancel').addEventListener('click', closeSettingsPopup);
    document.getElementById('btn-settings-close').addEventListener('click',  closeSettingsPopup);
    document.getElementById('btn-settings-save').addEventListener('click',   saveGroupSettings);
    document.getElementById('btn-settings-delete').addEventListener('click', confirmDeleteGroup);
    document.getElementById('settings-member-search').addEventListener('focus', () => searchUsersForSettings(''));
    document.getElementById('settings-member-search').addEventListener('input',
        debounce(e => searchUsersForSettings(e.target.value), 280));
});

// ─── Groups list ─────────────────────────────────────────────────────────────

async function loadGroups() {
    try {
        const res  = await fetch('/groups');
        const data = await res.json();
        cachedGroups = data.groups || [];
        renderGroupsList(cachedGroups);
    } catch {
        renderGroupsList([]);
    }
}

function renderGroupsList(groups, filter = '') {
    const list     = document.getElementById('groups-list');
    const filtered = filter
        ? groups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase()))
        : groups;

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-xs text-center mt-4" style="color:var(--text-fine);">${filter ? 'No groups found' : 'No groups yet'}</p>`;
        return;
    }

    list.innerHTML = filtered.map(g => `
        <button onclick="selectGroup(${g.id},'${escHtml(g.name)}','${g.role}')"
            class="flex items-center gap-2 px-3 py-2 rounded-xl text-left w-full text-sm transition-colors"
            style="color:var(--dark); background:${selectedGroupId === g.id ? 'var(--bg-tab-pill)' : 'transparent'};"
            onmouseover="this.style.background='var(--bg-tab-pill)'"
            onmouseout="this.style.background='${selectedGroupId === g.id ? 'var(--bg-tab-pill)' : 'transparent'}'">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style="background:var(--blue);">${escHtml(g.name.charAt(0).toUpperCase())}</div>
            <span class="truncate flex-1">${escHtml(g.name)}</span>
            <span class="text-[10px] shrink-0" style="color:var(--text-fine);">${g.member_count}</span>
        </button>`).join('');
}

// ─── Select / deselect group ─────────────────────────────────────────────────

async function selectGroup(id, name, role) {
    selectedGroupId   = id;
    selectedGroupRole = role;

    document.getElementById('group-name-label').textContent = name;
    document.getElementById('groups-panel').style.display  = 'none';
    document.getElementById('members-panel').style.display = 'flex';

    renderGroupsList(cachedGroups); // update highlight

    try {
        const res  = await fetch(`/groups/${id}`);
        const data = await res.json();
        renderMembersList(data.members);
    } catch {
        document.getElementById('members-list').innerHTML =
            `<p class="text-xs text-center mt-4" style="color:var(--text-fine);">Failed to load members</p>`;
    }

    await fetchHeatmap(id);
}

function backToGroups() {
    selectedGroupId    = null;
    selectedGroupRole  = null;
    currentHeatmapData = null;
    clearHeatmap();
    document.getElementById('members-panel').style.display = 'none';
    document.getElementById('groups-panel').style.display  = 'flex';
    renderGroupsList(cachedGroups);
}

// ─── Members list ─────────────────────────────────────────────────────────────

function renderMembersList(members) {
    const list = document.getElementById('members-list');
    if (!members || members.length === 0) {
        list.innerHTML = `<p class="text-xs text-center mt-4" style="color:var(--text-fine);">No members</p>`;
        return;
    }
    list.innerHTML = members.map(m => `
        <div class="flex items-center gap-2 px-3 py-2 rounded-xl"
            style="background: transparent;">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style="background: ${m.role === 'owner' ? '#7c3aed' : 'var(--blue)'};">
                ${escHtml(m.username.charAt(0).toUpperCase())}
            </div>
            <span class="flex-1 text-sm truncate" style="color:var(--dark);">${escHtml(m.username)}</span>
            ${m.role === 'owner' ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background:rgba(124,58,237,0.1);color:#7c3aed;">owner</span>` : ''}
        </div>`).join('');
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function renderHeatmap({ heatmap, total }) {
    clearHeatmap();
    if (!total || !heatmap) return;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const col     = document.getElementById(`col-${dayIdx}`);
        const dayData = heatmap[String(dayIdx)];
        if (!col || !dayData) continue;

        for (const [hourStr, count] of Object.entries(dayData)) {
            const hour = parseInt(hourStr);
            if (hour < START_HOUR || hour >= END_HOUR) continue;

            const ratio = count / total;
            const cell  = document.createElement('div');
            cell.className    = 'heatmap-cell';
            cell.style.cssText = `position:absolute;top:${(hour - START_HOUR) * HOUR_HEIGHT}px;height:${HOUR_HEIGHT}px;left:0;right:0;background:rgba(34,197,94,${(ratio * 0.5).toFixed(3)});pointer-events:none;z-index:0;`;
            col.appendChild(cell);
        }
    }
}

function clearHeatmap() {
    document.querySelectorAll('.heatmap-cell').forEach(el => el.remove());
}

// ─── Create Group popup ───────────────────────────────────────────────────────

function openCreateGroupPopup() {
    pendingMembers = [];
    document.getElementById('new-group-name').value    = '';
    document.getElementById('new-member-search').value = '';
    document.getElementById('new-member-results').innerHTML = '';
    renderPendingMembers();
    showOverlay('createGroupOverlay');
    document.getElementById('new-group-name').focus();
}

function closeCreateGroupPopup() { hideOverlay('createGroupOverlay'); }

function handleCreateGroupOverlayClick(e) {
    if (e.target.id === 'createGroupOverlay') closeCreateGroupPopup();
}

async function searchUsersForCreate(q) {
    const results = document.getElementById('new-member-results');
    const users = await fetchFriends(q);
    const alreadyPending = new Set(pendingMembers.map(m => m.id));
    const filtered = users.filter(u => !alreadyPending.has(u.id));
    results.innerHTML = filtered.map(u => `
        <button onclick="addPendingMember(${u.id},'${escHtml(u.username)}')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full text-left transition-colors"
            style="color:var(--dark);"
            onmouseover="this.style.background='var(--bg-tab-pill)'"
            onmouseout="this.style.background='transparent'">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style="background:var(--blue);">${escHtml(u.username.charAt(0).toUpperCase())}</div>
            ${escHtml(u.username)}
        </button>`).join('') || (q.length >= 2 ? `<p class="text-xs px-3 py-1" style="color:var(--text-fine);">No friends found</p>` : '');
}

function addPendingMember(id, username) {
    if (!pendingMembers.find(m => m.id === id)) {
        pendingMembers.push({ id, username });
        renderPendingMembers();
    }
    document.getElementById('new-member-search').value = '';
    document.getElementById('new-member-results').innerHTML = '';
}

function removePendingMember(id) {
    pendingMembers = pendingMembers.filter(m => m.id !== id);
    renderPendingMembers();
}

function renderPendingMembers() {
    document.getElementById('new-member-pending').innerHTML = pendingMembers.map(m => `
        <span class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style="background:var(--bg-tab-pill);color:var(--dark);">
            ${escHtml(m.username)}
            <button onclick="removePendingMember(${m.id})" class="ml-0.5 leading-none" style="color:var(--text-fine);">&times;</button>
        </span>`).join('');
}

async function createGroup() {
    const name = document.getElementById('new-group-name').value.trim();
    if (!name) { document.getElementById('new-group-name').focus(); return; }

    const res = await fetch('/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, member_ids: pendingMembers.map(m => m.id) })
    });

    if (res.ok) {
        closeCreateGroupPopup();
        await loadGroups();
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to create group');
    }
}

// ─── Group Settings popup ─────────────────────────────────────────────────────

async function openSettingsPopup() {
    if (!selectedGroupId) return;

    document.getElementById('settings-member-search').value   = '';
    document.getElementById('settings-member-results').innerHTML = '';

    try {
        const res  = await fetch(`/groups/${selectedGroupId}`);
        const data = await res.json();

        document.getElementById('settings-group-name').value = data.name;

        const isOwner = selectedGroupRole === 'owner';
        document.getElementById('settings-group-name').disabled       = !isOwner;
        document.getElementById('settings-add-member-section').style.display = isOwner ? '' : 'none';
        document.getElementById('btn-settings-delete').style.display  = isOwner ? '' : 'none';
        document.getElementById('btn-settings-save').style.display    = isOwner ? '' : 'none';

        renderSettingsMembersList(data.members, isOwner);
    } catch {
        return;
    }

    showOverlay('settingsOverlay');
}

function closeSettingsPopup() { hideOverlay('settingsOverlay'); }

function handleSettingsOverlayClick(e) {
    if (e.target.id === 'settingsOverlay') closeSettingsPopup();
}

function renderSettingsMembersList(members, isOwner) {
    document.getElementById('settings-members-list').innerHTML = members.map(m => `
        <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style="background:${m.role === 'owner' ? '#7c3aed' : 'var(--blue)'};">
                ${escHtml(m.username.charAt(0).toUpperCase())}
            </div>
            <span class="flex-1 text-sm truncate" style="color:var(--dark);">${escHtml(m.username)}</span>
            ${m.role === 'owner'
                ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background:rgba(124,58,237,0.1);color:#7c3aed;">owner</span>`
                : isOwner
                    ? `<button onclick="removeMember(${m.id})" class="text-[10px] px-1.5 py-0.5 rounded-full border transition-colors"
                        style="border-color:#ef4444;color:#ef4444;"
                        onmouseover="this.style.background='rgba(239,68,68,0.08)'"
                        onmouseout="this.style.background='transparent'">Remove</button>`
                    : ''
            }
        </div>`).join('');
}

async function searchUsersForSettings(q) {
    const results = document.getElementById('settings-member-results');
    const users = await fetchFriends(q);
    results.innerHTML = users.map(u => `
        <button onclick="addMemberToGroup(${u.id},'${escHtml(u.username)}')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full text-left transition-colors"
            style="color:var(--dark);"
            onmouseover="this.style.background='var(--bg-tab-pill)'"
            onmouseout="this.style.background='transparent'">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style="background:var(--blue);">${escHtml(u.username.charAt(0).toUpperCase())}</div>
            ${escHtml(u.username)}
        </button>`).join('') || (q.length >= 2 ? `<p class="text-xs px-3 py-1" style="color:var(--text-fine);">No friends found</p>` : '');
}

async function addMemberToGroup(userId, username) {
    const res = await fetch(`/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    if (res.ok) {
        document.getElementById('settings-member-search').value      = '';
        document.getElementById('settings-member-results').innerHTML = '';
        const data = await (await fetch(`/groups/${selectedGroupId}`)).json();
        renderSettingsMembersList(data.members, true);
        renderMembersList(data.members);
        await fetchHeatmap(selectedGroupId);
        const g = cachedGroups.find(x => x.id === selectedGroupId);
        if (g) g.member_count = data.members.length;
        renderGroupsList(cachedGroups);
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to add member');
    }
}

async function removeMember(userId) {
    if (!confirm('Remove this member?')) return;
    const res = await fetch(`/groups/${selectedGroupId}/members/${userId}`, { method: 'DELETE' });
    if (res.ok) {
        const data = await (await fetch(`/groups/${selectedGroupId}`)).json();
        renderSettingsMembersList(data.members, true);
        renderMembersList(data.members);
        await fetchHeatmap(selectedGroupId);
        const g = cachedGroups.find(x => x.id === selectedGroupId);
        if (g) g.member_count = data.members.length;
        renderGroupsList(cachedGroups);
    }
}

async function saveGroupSettings() {
    const name = document.getElementById('settings-group-name').value.trim();
    if (!name) return;

    const res = await fetch(`/groups/${selectedGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    if (res.ok) {
        const data = await res.json();
        document.getElementById('group-name-label').textContent = data.name;
        const g = cachedGroups.find(x => x.id === selectedGroupId);
        if (g) g.name = data.name;
        closeSettingsPopup();
    } else {
        alert('Failed to save settings');
    }
}

async function confirmDeleteGroup() {
    if (!confirm(`Delete this group? This cannot be undone.`)) return;
    const res = await fetch(`/groups/${selectedGroupId}`, { method: 'DELETE' });
    if (res.ok) {
        closeSettingsPopup();
        backToGroups();
        await loadGroups();
    } else {
        alert('Failed to delete group');
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function fetchFriends(q) {
    try {
        const url = q ? `/api/friends/search?q=${encodeURIComponent(q)}` : '/api/friends/search';
        const res  = await fetch(url);
        const data = await res.json();
        return data.users || [];
    } catch { return []; }
}

function showOverlay(id) {
    const el = document.getElementById(id);
    el.style.display = 'flex';
}

function hideOverlay(id) {
    document.getElementById(id).style.display = 'none';
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}
