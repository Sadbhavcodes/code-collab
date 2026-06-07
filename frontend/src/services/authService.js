const BASE_URL    = 'http://localhost:8080';
const TOKEN_KEY   = 'cc_token';
const USERNAME_KEY = 'cc_username';

// ── Storage helpers ────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Returns the username stored after login/register.
 * Falls back to decoding the JWT sub (email) if somehow missing.
 */
export function getUsername() {
  const stored = localStorage.getItem(USERNAME_KEY);
  if (stored) return stored;
  // fallback: read sub claim from JWT
  try {
    const token = getToken();
    if (!token) return 'User';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || 'User';
  } catch {
    return 'User';
  }
}

function saveUsername(username) {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── API calls ──────────────────────────────────────────────────────
async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface the backend error message
    throw new Error(data.message || data.error || 'Something went wrong');
  }
  return data;
}

/**
 * Register a new user. Stores token + username. Backend auto-generates JWT.
 * @param {{ username: string, email: string, password: string }} payload
 * @returns {Promise<{ token: string, username: string, message: string }>}
 */
export async function register(payload) {
  const data = await post('/auth/register', payload);
  saveToken(data.token);
  saveUsername(data.username);
  return data;
}

/**
 * Login an existing user. Stores token + username.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ token: string, username: string, message: string }>}
 */
export async function login(payload) {
  const data = await post('/auth/login', payload);
  saveToken(data.token);
  saveUsername(data.username);
  return data;
}

export function logout() {
  clearSession();
}
