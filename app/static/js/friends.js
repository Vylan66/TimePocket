// JavaScript for local state (frontend-only, resets on page reload) 

// Dummy test users
let friends  = [
    { id: 101, username: 'alice' },
    { id: 102, username: 'bob' },
    { id: 103, username: 'charlie' },
    { id: 104, username: 'diana' },
    { id: 105, username: 'evan' },
];
let requests = [
    { id: 201, username: 'frank',  fid: 901 },
    { id: 202, username: 'grace',  fid: 902 },
];
let nextId = 903;

// Helpers 
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    renderFriends();
    renderRequests();

    document.getElementById('friend-search').addEventListener('input',
        debounce(e => searchUsers(e.target.value), 280));

    document.getElementById('friend-profile-close').addEventListener('click', closeProfilePopup);
    document.getElementById('friend-profile-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('friend-profile-overlay')) closeProfilePopup();
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

// Search users (uses existing /users/search API) 
async function searchUsers(q) {
    const results = document.getElementById('friend-search-results');
    if (q.length < 2) { results.style.display = 'none'; return; }

    try {
        const res  = await fetch(`/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const users = (data.users || []).filter(
            u => !friends.find(f => f.id === u.id) && !requests.find(r => r.id === u.id)
        );

        if (users.length === 0) {
            results.innerHTML = `<div class="px-3 py-2 text-xs" style="color:var(--text-fine);">No users found</div>`;
        } else {
            results.innerHTML = users.map(u => `
                <button onclick="sendRequest(${u.id}, '${escHtml(u.username)}')"
                    class="flex items-center gap-2 px-3 py-2 text-xs text-left w-full transition-colors"
                    style="color:var(--dark);"
                    onmouseover="this.style.background='var(--bg-tab-pill)'"
                    onmouseout="this.style.background='transparent'">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style="background:var(--blue);">${escHtml(u.username[0].toUpperCase())}</span>
                    ${escHtml(u.username)}
                </button>`).join('');
        }
        results.style.display = 'flex';
        results.style.flexDirection = 'column';
    } catch {
        results.style.display = 'none';
    }
}

// Send friend request (adds to local requests list as demo) 
function sendRequest(userId, username) {
    document.getElementById('friend-search-results').style.display = 'none';
    document.getElementById('friend-search').value = '';

    if (friends.find(f => f.id === userId) || requests.find(r => r.id === userId)) {
        showToast('Already a friend or request pending', true);
        return;
    }

    requests.push({ id: userId, username, fid: nextId++ });
    renderRequests();
    showToast(`Friend request sent to ${username}`);
}

// Render friends list 
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
    row.style.cssText = 'border: 1px solid var(--border-card);';
    row.onmouseover = () => row.style.background = 'var(--bg-tab-pill)';
    row.onmouseout  = () => row.style.background = 'transparent';

    row.innerHTML = `
        <div class="flex items-center gap-3 cursor-pointer friend-info-btn">
            <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style="background:var(--blue);">${escHtml(f.username[0].toUpperCase())}</span>
            <span class="text-sm">${escHtml(f.username)}</span>
        </div>
        <div class="relative">
            <button class="btn-icon friend-menu-btn" title="Options">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
            </button>
            <div class="friend-menu hidden absolute right-0 top-full mt-1 rounded-xl shadow-lg z-20 py-1 min-w-[130px]"
                style="background:var(--bg-surface); border:1px solid var(--border-card);">
                <button class="remove-btn flex items-center gap-2 px-3 py-2 text-xs w-full text-left transition-colors"
                    style="color:#ef4444;"
                    onmouseover="this.style.background='var(--bg-tab-pill)'"
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

    row.querySelector('.friend-info-btn').addEventListener('click', () => openProfilePopup(f.username));

    row.querySelector('.friend-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = row.querySelector('.friend-menu');
        document.querySelectorAll('.friend-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
        menu.classList.toggle('hidden');
    });

    row.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        friends = friends.filter(x => x.id !== f.id);
        renderFriends();
        showToast('Friend removed');
    });

    return row;
}

// Render friend requests 
function renderRequests() {
    const list = document.getElementById('friend-requests-list');

    if (requests.length === 0) {
        list.innerHTML = `<p class="text-xs" style="color:var(--text-fine);">No pending requests</p>`;
        return;
    }

    list.innerHTML = requests.map(r => `
        <div class="flex items-center justify-between gap-2 py-1" data-rid="${r.fid}">
            <div class="flex items-center gap-2 min-w-0 cursor-pointer"
                onclick="openProfilePopup('${escHtml(r.username)}')">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style="background:var(--blue);">${escHtml(r.username[0].toUpperCase())}</span>
                <span class="text-xs truncate">${escHtml(r.username)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="acceptRequest(${r.fid})" title="Accept"
                    class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style="background:#dcfce7; color:#16a34a;"
                    onmouseover="this.style.background='#bbf7d0'"
                    onmouseout="this.style.background='#dcfce7'">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </button>
                <button onclick="rejectRequest(${r.fid})" title="Reject"
                    class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style="background:#fee2e2; color:#dc2626;"
                    onmouseover="this.style.background='#fecaca'"
                    onmouseout="this.style.background='#fee2e2'">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>`).join('');
}

function acceptRequest(fid) {
    const req = requests.find(r => r.fid === fid);
    if (!req) return;
    requests = requests.filter(r => r.fid !== fid);
    friends.push({ id: req.id, username: req.username });
    renderRequests();
    renderFriends();
    showToast(`${req.username} is now your friend`);
}

function rejectRequest(fid) {
    requests = requests.filter(r => r.fid !== fid);
    renderRequests();
    showToast('Request rejected');
}


// Dummy test profile popups
const MOCK_BIOS = [
    'Loves hiking and photography on weekends.',
    'Coffee enthusiast and part-time coder.',
    'Into music production and board games.',
    'Avid reader and occasional runner.',
    'Foodie who enjoys trying new restaurants.',
];
const MOCK_HOBBIES = [
    ['Hiking', 'Photography', 'Travel'],
    ['Coffee', 'Coding', 'Gaming'],
    ['Music', 'Board Games', 'Film'],
    ['Reading', 'Running', 'Yoga'],
    ['Cooking', 'Art', 'Cinema'],
];
const MOCK_GROUPS = [
    ['Study Group', 'Dev Team'],
    ['Dev Team'],
    ['Study Group', 'Book Club'],
    ['Book Club', 'Fitness Crew'],
    ['Fitness Crew', 'Study Group'],
];
const MOCK_TIMES = [
    'Tomorrow, 2:00 PM – 4:00 PM',
    'Today, 6:00 PM – 8:00 PM',
    'Thu, 10:00 AM – 12:00 PM',
    'Fri, 3:00 PM – 5:00 PM',
    'Sat, 11:00 AM – 1:00 PM',
];

function getMockProfile(username) {
    const i = username.charCodeAt(0) % 5;
    const mutualFriends = friends
        .filter(f => f.username !== username)
        .slice(0, (username.charCodeAt(0) % 3) + 1)
        .map(f => f.username);
    return {
        bio:          MOCK_BIOS[i],
        hobbies:      MOCK_HOBBIES[i],
        mutualFriends,
        mutualGroups: MOCK_GROUPS[i],
        nextFree:     MOCK_TIMES[i],
    };
}

function openProfilePopup(username) {
    const p = getMockProfile(username);

    document.getElementById('fp-avatar').textContent    = username[0].toUpperCase();
    document.getElementById('fp-username').textContent  = username;
    document.getElementById('fp-bio').textContent       = p.bio;
    document.getElementById('fp-next-free').textContent = p.nextFree;

    document.getElementById('fp-hobbies').innerHTML = p.hobbies.map(h =>
        `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style="background:var(--bg-tab-pill);color:var(--dark);">${escHtml(h)}</span>`
    ).join('');

    document.getElementById('fp-mutual-friends').innerHTML = p.mutualFriends.length
        ? p.mutualFriends.map(u =>
            `<div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style="background:var(--blue);">${escHtml(u[0].toUpperCase())}</span>
                <span class="text-xs">${escHtml(u)}</span>
            </div>`).join('')
        : `<span class="text-xs" style="color:var(--text-fine);">None</span>`;

    document.getElementById('fp-mutual-groups').innerHTML = p.mutualGroups.length
        ? p.mutualGroups.map(g =>
            `<span class="text-xs">${escHtml(g)}</span>`).join('')
        : `<span class="text-xs" style="color:var(--text-fine);">None</span>`;

    document.getElementById('friend-profile-overlay').classList.add('open');
}

function closeProfilePopup() {
    document.getElementById('friend-profile-overlay').classList.remove('open');
}

// Toast
function showToast(msg, isError = false) {
    let toast = document.getElementById('friends-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'friends-toast';
        toast.style.cssText = `
            position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            padding: 0.5rem 1.25rem; border-radius: 9999px; font-size: 0.8rem;
            z-index: 100; pointer-events: none; transition: opacity 0.3s;`;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = isError ? '#fee2e2' : 'var(--dark)';
    toast.style.color       = isError ? '#dc2626' : 'var(--bg-page)';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}
