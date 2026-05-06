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
