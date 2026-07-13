const AUTH_STORAGE_KEY = "koperasi-auth";

export const ROLE_ADMIN = "admin";
export const ROLE_PENGURUS = "pengurus";
export const ROLE_GURU = "guru";
export const ROLE_SISWA = "siswa";

const SAFE_CLIENT_SESSION_KEYS = [
  "role",
  "username",
  "nis",
  "nip",
  "nama",
  "kelas",
  "bidang_studi",
];

const roleRedirects = {
  [ROLE_ADMIN]: "/admin",
  [ROLE_PENGURUS]: "/pengurus/laporan",
  [ROLE_GURU]: "/guru/dashboard",
  [ROLE_SISWA]: "/dashboard",
};

export function getRedirectRouteByRole(role) {
  return roleRedirects[role] ?? null;
}

function filterSessionForClient(session) {
  if (!session || typeof session !== "object") return null;
  return SAFE_CLIENT_SESSION_KEYS.reduce((filtered, key) => {
    if (key in session) {
      filtered[key] = session[key];
    }
    return filtered;
  }, {});
}

export function saveAuthSession(user) {
  if (typeof window === "undefined") return;
  const safeSession = filterSessionForClient(user);
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeSession));
}

export function getAuthSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRoleSession(requiredRole) {
  const session = getAuthSession();
  return session?.role === requiredRole ? session : null;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
