const ADMIN_FLAG_KEY = 'admin_authed_v1';
const ADMIN_TS_KEY = 'admin_authed_ts_v1';
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

// 固定パスワード。実運用では環境変数やサーバー側保護に置き換えてください。
const FIXED_PASSWORD = 'password';

export function isAdminAuthed(): boolean {
  try {
    const flag = localStorage.getItem(ADMIN_FLAG_KEY);
    const ts = Number(localStorage.getItem(ADMIN_TS_KEY) || 0);
    if (flag !== 'true') return false;
    if (!ts) return false;
    if (Date.now() - ts > SESSION_MS) {
      logoutAdmin();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function loginAdmin(password: string): boolean {
  const expected = FIXED_PASSWORD;
  const ok = typeof password === 'string' && password.length > 0 && password === expected;
  if (ok) {
    try {
      localStorage.setItem(ADMIN_FLAG_KEY, 'true');
      localStorage.setItem(ADMIN_TS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }
  return ok;
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_FLAG_KEY);
    localStorage.removeItem(ADMIN_TS_KEY);
  } catch {
    /* ignore */
  }
}

export function isPasswordConfigured(): boolean { return true; }
