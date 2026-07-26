// apps/host/src/auth/token.ts
// 极简的本地鉴权：启动时随机生成一个 token，UI 入口注入进 header。
// 目的不是防御远程攻击（host 默认绑定 127.0.0.1，外部访问防火墙来做），
// 而是防止本机其他进程 / 其他浏览器标签 / 恶意网页直接调 localhost:3000 就能创建 run、读审计、看 PTY。
// （CORS 白名单会挡住跨域，但 CSRF with credentials / 本地进程绕过需要 token。）

import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../db/connection';

let _token: string | null = null;

/**
 * 生成（或读取已有的）本地 token。文件保存在 DATA_DIR/.ws-token，
 * 仅当前用户可读。如果文件已存在就直接复用——这样重启后 UI 已缓存的 token 仍可用。
 */
function ensureTokenFile(): string {
  const tokenPath = path.join(getDataDir(), '.ws-token');
  if (fs.existsSync(tokenPath)) {
    try {
      const existing = fs.readFileSync(tokenPath, 'utf-8').trim();
      if (existing.length >= 24) return existing;
    } catch {
      // ignore
    }
  }
  const fresh = randomBytes(24).toString('base64url');
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.writeFileSync(tokenPath, fresh, { mode: 0o600 });
  return fresh;
}

export function getOrSeedToken(): string {
  if (!_token) _token = ensureTokenFile();
  return _token;
}

export function resetTokenForTest(): void {
  _token = null;
}

export const TOKEN_HEADER = 'x-loop-token';
