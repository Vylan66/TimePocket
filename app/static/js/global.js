// Global JavaScript for each page
const root = document.documentElement;

// Dark mode toggle for each page
function applyTheme(dark) {
    root.classList.toggle('dark', dark);
    document.getElementById('icon-moon').style.display = dark ? 'none' : '';
    document.getElementById('icon-sun').style.display  = dark ? '' : 'none';
}

function toggleTheme() {
    const isDark = !root.classList.contains('dark');
    applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

applyTheme(localStorage.getItem('theme') === 'dark');

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);


// Navbar
function openPage(pageRequested) {
    if (pageRequested === "dashboard") {
        window.location.href = '/dashboard';
    }
    if (pageRequested === "personal") {
        window.location.href = '/personal';
    }
    if (pageRequested === "group") {
        window.location.href = '/group';
    }
    if (pageRequested === "profile") {
        window.location.href = '/profile';
    }
    if (pageRequested === "friends") {
        window.location.href = '/friends';
    }
}

const navLinks = {
    'dash-link': 'dashboard',
    'personal-timetable-link': 'personal',
    'groups-link': 'group',
    'profile-link': 'profile',
    'friends-link': 'friends',
};
Object.entries(navLinks).forEach(([id, page]) => {
    document.getElementById(id)?.addEventListener('click', () => openPage(page));
});

// Highlight active nav tab
const pathMap = {
    '/dashboard': 'dash-link',
    '/personal':  'personal-timetable-link',
    '/group':     'groups-link',
    '/friends':   'friends-link',
};
document.getElementById(pathMap[window.location.pathname])?.classList.add('active');

// Mobile hamburger
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileNav    = document.getElementById('mobile-nav');

hamburgerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileNav?.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (mobileNav?.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburgerBtn?.contains(e.target)) {
        mobileNav.classList.remove('open');
    }
});

// Mobile nav item clicks + active state
const mobilePageMap = {
    '/dashboard': 'dashboard',
    '/personal':  'personal',
    '/group':     'group',
};
const activeMobilePage = mobilePageMap[window.location.pathname];
document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    if (btn.dataset.page === activeMobilePage) btn.classList.add('active');
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) openPage(page);
    });
});
