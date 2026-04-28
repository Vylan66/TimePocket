// JavaScript for Login/Authentication tab
const authOverlay = document.getElementById('auth-overlay');

function openAuth(tab) { authOverlay.classList.add('open'); switchTab(tab || 'login'); }
function closeAuth() { authOverlay.classList.remove('open'); }

function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('panel-login').classList.toggle('hidden', !isLogin);
    document.getElementById('panel-signup').classList.toggle('hidden', isLogin);
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-signup').classList.toggle('active', !isLogin);
}

// Login via AJAX
document.getElementById('btn-login-submit').addEventListener('click', function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) { window.location.href = '/dashboard'; }
        else { alert(data.message || 'Invalid credentials.'); }
    });
});

// Signup via AJAX
document.getElementById('btn-signup-submit').addEventListener('click', function() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    if (password !== confirm) { alert('Passwords do not match!'); return; }
    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) { window.location.href = '/dashboard'; }
        else { alert(data.message || 'Registration failed.'); }
    });
});

document.getElementById('btn-jump-signup').addEventListener('click', function() { openAuth('signup'); });
document.getElementById('btn-nav-login').addEventListener('click', function() { openAuth('login'); });
authOverlay.addEventListener('click', function(e) { if (e.target === authOverlay) closeAuth(); });
document.getElementById('tab-login').addEventListener('click', function() { switchTab('login'); });
document.getElementById('tab-signup').addEventListener('click', function() { switchTab('signup'); });
document.getElementById('btn-auth-close').addEventListener('click', closeAuth);
document.getElementById('btn-to-signup').addEventListener('click', function() { switchTab('signup'); });
document.getElementById('btn-to-login').addEventListener('click', function() { switchTab('login'); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAuth(); });