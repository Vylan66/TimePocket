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
}

const navLinks = {
    'dash-link': 'dashboard',
    'personal-timetable-link': 'personal',
    'groups-link': 'group',
    'profile-link': 'profile',
};
Object.entries(navLinks).forEach(([id, page]) => {
    document.getElementById(id)?.addEventListener('click', () => openPage(page));
});
