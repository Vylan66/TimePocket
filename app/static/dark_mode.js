// JavaScript to enable dark mode for each page
const root = document.documentElement;

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
