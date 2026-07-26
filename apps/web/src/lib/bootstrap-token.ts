// apps/web/src/lib/bootstrap-token.ts
// 前端启动时从 host 取 token，拼进每个 REST / WS 请求。
// 缓存启动 token 到 localStorage；host 重启后若 token 变化，先清缓存。

const STORAGE_KEY = 'loop-cockpit-token';
const VERSION_KEY = 'loop-cockpit-token-version';

const HOST_TOKEN_URL = '/api/auth/token';

let _cached: string | null = null;

async function fetchToken(): Promise<string> {
  const res = await fetch(HOST_TOKEN_URL, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('获取 token: ' + res.status);
  const { token } = await res.json();
  if (!token) throw new Error('token 空');
  _cached = token;
  try {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(VERSION_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  return token;
}

export async function getCachedToken(): Promise<string> {
  if (_cached) return _cached;
  // 尝试从 localStorage 取（同源共享 host-process）
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { _cached = stored; return stored; }
  } catch {
    // ignore
  }
  return fetchToken();
}

export function clearTokenCache(): void {
  _cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
  } catch {
    // ignore
  }
}
