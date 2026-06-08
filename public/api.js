// ============================================================
//  api.js  —  shared frontend helper
//  Include this in every HTML page:  <script src="api.js"></script>
// ============================================================

// ── Change this ONE line when you deploy to Render ───────────
const API_BASE = 'http://localhost:5000';
// After deploy:  const API_BASE = 'https://your-app-name.onrender.com';

// ── Auth helpers ─────────────────────────────────────────────
const Auth = {
    getToken()  { return localStorage.getItem('token'); },
    getUser()   { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; },
    isLoggedIn(){ return !!this.getToken(); },
    logout()    { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'login.html'; }
};

// ── Generic fetch wrapper ────────────────────────────────────
async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch(API_BASE + path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ── API methods ──────────────────────────────────────────────
const API = {
    // Auth
    signup: (body)       => apiFetch('/api/auth/signup',    { method:'POST', body: JSON.stringify(body) }),
    login:  (body)       => apiFetch('/api/auth/login',     { method:'POST', body: JSON.stringify(body) }),
    getMe:  ()           => apiFetch('/api/auth/me'),
    updateMe: (body)     => apiFetch('/api/auth/me',        { method:'PUT',  body: JSON.stringify(body) }),

    // Players
    getPlayers: (params) => apiFetch('/api/players?' + new URLSearchParams(params)),
    getPlayer:  (id)     => apiFetch(`/api/players/${id}`),

    // Leaderboard
    getLeaderboard: (limit = 50) => apiFetch(`/api/leaderboard?limit=${limit}`),
    submitScore: (body)  => apiFetch('/api/leaderboard/submit', { method:'POST', body: JSON.stringify(body) }),
    getMyScores: ()      => apiFetch('/api/leaderboard/my-scores'),

    // Tournaments
    getTournaments: (status) => apiFetch('/api/tournaments' + (status ? `?status=${status}` : '')),
    getTournament:  (id)     => apiFetch(`/api/tournaments/${id}`),
    joinTournament: (id)     => apiFetch(`/api/tournaments/${id}/join`, { method:'POST' }),

    // ── Tournament Registrations (CRUD) ──────────────────────
    // Create – register for a tournament with payment
    registerForTournament: (body) =>
        apiFetch('/api/registrations', { method: 'POST', body: JSON.stringify(body) }),

    // Read all (admin sees all; player sees own)
    getRegistrations: (params = {}) =>
        apiFetch('/api/registrations?' + new URLSearchParams(params)),

    // Read one by registration ID
    getRegistration: (id) =>
        apiFetch(`/api/registrations/${id}`),

    // Update (change payment method, player name, or admin status change)
    updateRegistration: (id, body) =>
        apiFetch(`/api/registrations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

    // Delete / cancel
    deleteRegistration: (id) =>
        apiFetch(`/api/registrations/${id}`, { method: 'DELETE' }),

    // Admin summary stats
    getRegistrationStats: () =>
        apiFetch('/api/registrations/stats/summary'),

    // Admin only
    createTournament: (body)        => apiFetch('/api/tournaments', { method:'POST', body: JSON.stringify(body) }),
    setMatchResult:   (id, body)    => apiFetch(`/api/tournaments/${id}/result`, { method:'POST', body: JSON.stringify(body) }),
    setTournamentWinner: (id, body) => apiFetch(`/api/tournaments/${id}/winner`, { method:'PUT',  body: JSON.stringify(body) }),
    updateTournamentStatus: (id, body) => apiFetch(`/api/tournaments/${id}/status`, { method:'PUT', body: JSON.stringify(body) }),
    deleteTournament: (id)          => apiFetch(`/api/tournaments/${id}`,  { method:'DELETE' }),
};

// ── Auto-update nav if logged in ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    const nav  = document.querySelector('header nav');
    if (!nav) return;

    if (user) {
        // Replace signup/login links with greeting + logout
        nav.querySelectorAll('a[href="signup.html"], a[href="login.html"]').forEach(a => a.remove());
        const greeting = document.createElement('span');
        greeting.style.cssText = 'color:#00f5ff; font-weight:700; margin-left:14px; font-size:14px;';
        greeting.textContent = `👤 ${user.firstName}`;
        nav.appendChild(greeting);

        const logoutBtn = document.createElement('a');
        logoutBtn.href = '#';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.cssText = 'color:#ff6b6b; margin-left:14px;';
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
        nav.appendChild(logoutBtn);
    }
});
