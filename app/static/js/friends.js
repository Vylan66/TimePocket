let friends  = []; // {id, username, avatar, bio, int_1, int_2, int_3, friendship_id}
let requests = []; // {id: friendship_id, user_id, username}
let interests = {}; // each entry in the form 1:"Photography"


document.addEventListener('DOMContentLoaded', () => {
    loadFriends();
    loadRequests();
    loadInterests();

    document.getElementById('friend-search').addEventListener('input',
        debounce(e => searchUsers(e.target.value), 280));

    document.getElementById('friend-profile-close').addEventListener('click', closeProfilePopup);
    document.getElementById('friend-profile-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('friend-profile-overlay')) closeProfilePopup();
    });

    document.getElementById('friend-req-profile-close').addEventListener('click', closeFriendReqPopup);
    document.getElementById('friend-req-profile-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('friend-req-profile-overlay')) closeFriendReqPopup();
    });

    document.addEventListener('click', (e) => {
        const input   = document.getElementById('friend-search');
        const results = document.getElementById('friend-search-results');
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = 'none';
        }
        document.querySelectorAll('.friend-menu').forEach(m => m.classList.add('hidden'));
    });
});

async function loadFriends() {
    try {
        const res  = await fetch('/api/friends');
        const data = await res.json();
        friends = data.friends || [];
    } catch {
        friends = [];
    }
    renderFriends();
}

async function loadRequests() {
    try {
        const res  = await fetch('/api/friends/requests');
        const data = await res.json();
        requests = data.requests || [];
    } catch {
        requests = [];
    }
    renderRequests();
}

async function searchUsers(q) {
    const results = document.getElementById('friend-search-results');
    if (q.length < 2) { results.style.display = 'none'; return; }

    try {
        const res  = await fetch(`/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const users = (data.users || []).filter(
            u => !friends.find(f => f.id === u.id) && !requests.find(r => r.user_id === u.id)
        );

        if (users.length === 0) {
            results.innerHTML = `<div class="px-3 py-2 text-xs" style="color:var(--text-muted);">No users found</div>`;
        } else {
            results.innerHTML = users.map(u => `
                <button onclick="friendReqPopup(${u.id}, '${escHtml(u.username)}')"
                    class="flex items-center gap-2 px-3 py-2 text-xs text-left w-full transition-colors"
                    style="color:var(--primary-text-colour);"
                    onmouseover="this.style.background='var(--bg-hover)'"
                    onmouseout="this.style.background='transparent'">
                    ${loadAvatarImageSmall(u)}
                    ${escHtml(u.username)}
                </button>`).join('');
        }
        results.style.display = 'flex';
        results.style.flexDirection = 'column';
    } catch {
        results.style.display = 'none';
    }
}

async function sendRequest(userId, username) {
    document.getElementById('friend-search-results').style.display = 'none';
    document.getElementById('friend-search').value = '';

    if (friends.find(f => f.id === userId) || requests.find(r => r.user_id === userId)) {
        showToast('Already a friend or request pending', true);
    }

    try {
        const res = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) {
            const data = await res.json();
            await loadRequests();
            showToast(`Friend request sent to ${username}`);
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to send request', true);
        }
    } catch {
        showToast('Failed to send request', true);
    }
}

function renderFriends() {
    const list  = document.getElementById('friends-list');
    const empty = document.getElementById('friends-empty');
    const count = document.getElementById('friend-count');

    count.textContent = `${friends.length} friend${friends.length !== 1 ? 's' : ''}`;
    list.querySelectorAll('.friend-row').forEach(el => el.remove());

    if (friends.length === 0) {
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';
    friends.forEach(f => list.appendChild(buildFriendRow(f)));
}

function buildFriendRow(f) {
    const row = document.createElement('div');
    row.className = 'friend-row flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors';
    row.style.cssText = 'border: 1px solid var(--border-darker);';
    row.onmouseover = () => row.style.background = 'var(--bg-hover)';
    row.onmouseout  = () => row.style.background = 'transparent';
    let avatarImage = loadAvatarImageSmall(f);

    row.innerHTML = `
        <div class="flex items-center gap-3 cursor-pointer friend-info-btn">
            ${avatarImage}
            <span class="text-sm">${escHtml(f.username)}</span>
        </div>
        <div class="relative">
            <button class="btn-icon friend-menu-btn" title="Options">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
            </button>
            <div class="friend-menu hidden absolute right-0 top-full mt-1 rounded-xl shadow-lg z-20 py-1 min-w-[130px]"
                style="background:var(--bg-page-surface); border:1px solid var(--border-darker);">
                <button class="remove-btn flex items-center gap-2 px-3 py-2 text-xs w-full text-left transition-colors"
                    style="color:#ef4444;"
                    onmouseover="this.style.background='var(--bg-hover)'"
                    onmouseout="this.style.background='transparent'">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    Remove friend
                </button>
            </div>
        </div>`;

    row.querySelector('.friend-info-btn').addEventListener('click', () => openProfilePopup(f.id, f.username));

    row.querySelector('.friend-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = row.querySelector('.friend-menu');
        document.querySelectorAll('.friend-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
        menu.classList.toggle('hidden');
    });

    row.querySelector('.remove-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/friends/${f.friendship_id}`, { method: 'DELETE' });
            if (res.ok) {
                friends = friends.filter(x => x.id !== f.id);
                renderFriends();
                showToast('Friend removed');
            } else {
                showToast('Failed to remove friend', true);
            }
        } catch {
            showToast('Failed to remove friend', true);
        }
    });

    return row;
}

function renderRequests() {
    const list = document.getElementById('friend-requests-list');

    if (requests.length === 0) {
        list.innerHTML = `<p class="text-xs" style="color:var(--text-muted);">No pending requests</p>`;
        return;
    }

    list.innerHTML = requests.map(r => `
        <div class="flex items-center justify-between gap-2 py-1" data-rid="${r.id}">
            <div class="flex items-center gap-2 min-w-0 cursor-pointer"
                onclick="friendReqPopup(${r.user_id}, '${escHtml(r.username)}', false)">
                ${loadAvatarImageSmall(r)}
                <span class="text-xs truncate">${escHtml(r.username)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                ${r.direction === 'outgoing'
                    ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--bg-hover);color:var(--text-secondary);">Sent</span>`
                    : `<button onclick="acceptRequest(${r.id}, ${r.user_id}, '${escHtml(r.username)}')" title="Accept"
                        class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style="background:#dcfce7; color:#16a34a;"
                        onmouseover="this.style.background='#bbf7d0'"
                        onmouseout="this.style.background='#dcfce7'">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </button>
                    <button onclick="rejectRequest(${r.id})" title="Reject"
                        class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style="background:#fee2e2; color:#dc2626;"
                        onmouseover="this.style.background='#fecaca'"
                        onmouseout="this.style.background='#fee2e2'">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>`
                }
            </div>
        </div>`).join('');
}

async function acceptRequest(friendshipId, userId, username) {
    try {
        const res = await fetch(`/api/friends/accept/${friendshipId}`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            requests = requests.filter(r => r.id !== friendshipId);
            friends.push(data.friend);
            renderRequests();
            renderFriends();
            showToast(`${username} is now your friend`);
        } else {
            showToast('Failed to accept request', true);
        }
    } catch {
        showToast('Failed to accept request', true);
    }
}

async function rejectRequest(friendshipId) {
    try {
        const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
        if (res.ok) {
            requests = requests.filter(r => r.id !== friendshipId);
            renderRequests();
            showToast('Request rejected');
        } else {
            showToast('Failed to reject request', true);
        }
    } catch {
        showToast('Failed to reject request', true);
    }
}

function _renderInterestTags(intData) {
    const vals = [intData.int_1, intData.int_2, intData.int_3]
        .filter(v => v != null)
        .map(v => interests[v])
        .filter(Boolean);
    return vals.length
        ? vals.map(h => `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style="background:var(--bg-hover);color:var(--primary-text-colour);">${escHtml(h)}</span>`).join('')
        : `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
}

function _renderMutualFriends(list) {
    return list.length
        ? list.map(u => `<div class="flex items-center gap-1.5">
                ${loadAvatarImageSmall(u)}
                <span class="text-xs">${escHtml(u.username)}</span>
            </div>`).join('')
        : `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
}

async function friendReqPopup(userId, username, showButton = true) {
    document.getElementById('frq-username').textContent = username;
    document.getElementById('frq-mutual-friends').innerHTML = `<span class="text-xs" style="color:var(--text-muted);">Loading…</span>`;

    const btn = document.getElementById('send-friend-req-btn');
    btn.style.display = showButton ? '' : 'none';
    btn.onclick = showButton ? () => {
        closeFriendReqPopup();
        document.getElementById('friend-search-results').style.display = 'none';
        document.getElementById('friend-search').value = '';
        sendRequest(userId, username);
    } : null;

    document.getElementById('friend-req-profile-overlay').classList.add('open');

    try {
        const res  = await fetch(`/api/friends/${userId}/profile`);
        const data = await res.json();
        let avatarImage = loadAvatarImageLarge(data);
        document.getElementById('frq-avatar').innerHTML   = avatarImage;
        document.getElementById('frq-bio').textContent      = data.bio || '';
        document.getElementById('frq-hobbies').innerHTML    = _renderInterestTags(data);
        document.getElementById('frq-mutual-friends').innerHTML = _renderMutualFriends(data.mutual_friends || []);
    } catch {
        document.getElementById('frq-mutual-friends').innerHTML = `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
    }
}

function closeFriendReqPopup() {
    document.getElementById('friend-req-profile-overlay').classList.remove('open');
}

async function openProfilePopup(user_id, username) {
    let friend = {};
    for (let f in friends) {
        if (friends[f].id === user_id) {
            friend = friends[f];
            break;
        }
    }
    if (friend === {}) return;

    let avatarImage = loadAvatarImageLarge(friend);
    document.getElementById('fp-avatar').innerHTML    = avatarImage;
    document.getElementById('fp-username').textContent  = username;
    document.getElementById('fp-bio').textContent       = '';
    document.getElementById('fp-hobbies').innerHTML     = '';
    document.getElementById('fp-next-free').textContent = '…';
    document.getElementById('fp-mutual-friends').innerHTML = `<span class="text-xs" style="color:var(--text-muted);">Loading…</span>`;
    document.getElementById('fp-mutual-groups').innerHTML  = `<span class="text-xs" style="color:var(--text-muted);">Loading…</span>`;
    document.getElementById('friend-profile-overlay').classList.add('open');

    try {
        const res  = await fetch(`/api/friends/${user_id}/profile`);
        const data = await res.json();

        document.getElementById('fp-bio').textContent       = data.bio || '';
        document.getElementById('fp-hobbies').innerHTML     = _renderInterestTags(data);
        document.getElementById('fp-next-free').textContent = data.next_free || 'No overlap found';

        document.getElementById('fp-mutual-friends').innerHTML = _renderMutualFriends(data.mutual_friends || []);

        document.getElementById('fp-mutual-groups').innerHTML = (data.mutual_groups || []).length
            ? data.mutual_groups.map(g => `<span class="text-xs">${escHtml(g.name)}</span>`).join('')
            : `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
    } catch {
        document.getElementById('fp-mutual-friends').innerHTML = `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
        document.getElementById('fp-mutual-groups').innerHTML  = `<span class="text-xs" style="color:var(--text-muted);">None</span>`;
        document.getElementById('fp-next-free').textContent    = 'Unavailable';
    }
}

function closeProfilePopup() {
    document.getElementById('friend-profile-overlay').classList.remove('open');
}

const loadInterests = async () => {
    const result = await fetch('/api/interests');
    if (!result.ok) return;
    const data = await result.json();
    for (const entry of data) {
        interests[entry.id] = entry.name;
    }
};

const loadAvatarImageSmall = (f) => {
    let avatarImage = ``;
    if (f["avatar"] === "avatar_1") {
        avatarImage = `<span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style="background:var(--blue);">${escHtml(f.username[0].toUpperCase())}</span>`;
    }
    else {
        avatarImage = `<img class="w-7 h-7 rounded-full" src='static/assets/${f["avatar"]}.png' />`;
    }
    return avatarImage;
}

const loadAvatarImageLarge = (f) => {
    let avatarImage = ``;

    if (f["avatar"] === "avatar_1") {
        avatarImage = `<p class="text-white text-xl font-bold">${escHtml(f.username[0].toUpperCase())}</p>`;
    }
    else {
        avatarImage = `<img class="rounded-full" src='static/assets/${f["avatar"]}.png' />`;
    }
    return avatarImage;
}