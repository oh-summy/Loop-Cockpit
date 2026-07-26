// apps/host/src/util/shell.ts
// 单一可信来源：所有"命令是否安全"的判定都走这里。
// 之前 verification/shell.ts、blueprint/zod.ts、runner/lifecycle.ts 三处各写一套，
// 规则不一致导致 dry-run 校验通过但 evaluateShell 拒绝（或反过来）。

import fs from 'fs';
import path from 'path';

/**
 * 允许的 shell builtin 白名单。
 * 注意：sh / bash 只允许"无参数"或"-s"（从 stdin 读），禁止 -c / -l / -- 等。
 *       因为 sh -c "..." 会把整个字符串交给 shell 解释，等于绕开 spawnSync 的 shell:false。
 *
 * 注：echo / true 等 POSIX 命令放行的前提是"shell:false" 下直接调用——
 *     因为 shell:false 时代码不会经过 shell 解析，无法注入 ;|& 等。
 *     但如果 command 包含 shell 元字符前面已经 reject，所以 echo 'a; b' 这种原本就 blocked。
 */
export const SAFE_BUILTINS = new Set([
  'sh', 'bash',
  'python', 'python3',
  'node', 'npx', 'pnpm', 'npm', 'yarn',
  'cargo', 'go', 'make', 'cmake',
  'echo', 'true', 'false', 'printf', 'cat', 'test', '[',
]);

/** 允许的 sh/bash 参数：只有 -s（从 stdin 读）或完全无参。 */
const SAFE_SHELL_ARGS = new Set(['-s']);

/**
 * 校验一条"简单命令"（无链式操作符）是否安全。
 *  - base 必须在 SAFE_BUILTINS
 *  - 不能包含任何 shell 元字符（;|`$(){}!<> 等）
 *  - sh/bash 只允许无参或 -s
 *  - 命令必须是绝对路径或纯 basename（不允许 PATH 劫持）
 *
 * 注意：本函数不处理 && / || 链 —— 那是 isSafeCommand 的职责。
 */
function isSafeSimpleCommand(trimmed: string): boolean {
  const parts = trimmed.split(/\s+/);
  const rawBase = parts[0];
  const base = rawBase.split('/').pop() ?? rawBase;

  // 1) 必须在白名单
  if (!SAFE_BUILTINS.has(base)) return false;

  // 2) sh / bash 特殊处理：只允许无参或 -s
  if (base === 'sh' || base === 'bash') {
    const args = parts.slice(1);
    if (args.length > 1) return false;
    if (args.length === 1 && !SAFE_SHELL_ARGS.has(args[0])) return false;
  }

  // 3) 如果命令带路径，必须是绝对路径且真实存在（防 PATH 劫持）
  if (rawBase.includes('/')) {
    if (!path.isAbsolute(rawBase)) return false;
    try {
      const real = fs.realpathSync.native(rawBase);
      // 解析后必须仍在原路径（防 symlink 逃逸）
      if (real !== rawBase && !real.startsWith(rawBase + '/')) return false;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * 校验一条命令是否安全。
 *
 * 支持 && 与 || 链式组合（如 "pnpm lint && pnpm test"），这是成功标准字段的常见写法。
 * 安全模型：
 *  - 整条命令只能包含 && / || 作为链式操作符
 *  - 仍拒绝 ; | ` $() {} ! < > \ 换行 等一切 shell 注入手段
 *  - 拆分后的每一段必须独立通过 isSafeSimpleCommand（白名单 + 路径校验）
 *
 * 这样 "pnpm lint && rm -rf /" 会被拒绝（rm 不在白名单），
 * 而 "echo hello; rm /" 也会被拒绝（; 不允许）。
 */
export function isSafeCommand(cmd: string): boolean {
  if (!cmd || typeof cmd !== 'string') return false;
  const trimmed = cmd.trim();
  if (!trimmed) return false;

  // 1) 拒绝任何 shell 注入元字符（包括换行、回车）。
  if (/[;`$(){}!<>\\\n\r]/.test(trimmed)) return false;
  // 2) 拒绝孤立的 & 或 |（只允许成对的 && / ||）。
  //    先剥掉所有合法的 && / ||，剩余字符串里若还有 & | 就是孤立的（含首尾位置）。
  const pairsStripped = trimmed.replace(/&&/g, '').replace(/\|\|/g, '');
  if (/[&|]/.test(pairsStripped)) return false;

  // 2) 按 && / || 拆分，逐段校验。
  const segments = trimmed.split(/&&|\|\|/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return false;

  return segments.every(isSafeSimpleCommand);
}

/**
 * 把命令拆成 [cmd, ...args]。
 *  - 简单命令：直接按空白分词
 *  - 复合命令（含 && / ||）：返回 ["sh", ["-s", 原命令]]，由 evaluateShell 通过 stdin 传入
 *    这样整条链在一个 sh 进程内执行，退出码以最后一段为准，与 shell 行为一致。
 *
 * 调用方必须先用 isSafeCommand 校验。
 */
export function splitCommand(cmd: string): [string, string[]] {
  const trimmed = cmd.trim();
  if (/&&|\|\|/.test(trimmed)) {
    return ['sh', ['-s', trimmed]];
  }
  const parts = trimmed.split(/\s+/);
  return [parts[0], parts.slice(1)];
}

/** 移除 JSON 不允许的控制字符（保留 \n \t） */
export function sanitizeForJson(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** UTF-8 安全的字节截断（避免把多字节字符劈开） */
export function truncateUtf8(str: string, maxBytes: number): string {
  if (Buffer.byteLength(str, 'utf-8') <= maxBytes) return str;
  const buf = Buffer.from(str, 'utf-8').slice(0, maxBytes);
  let out = buf.toString('utf-8');
  // 如果截断处恰好落在多字节字符中间，Buffer.toString 会带一个 U+FFFD，去掉它
  if (out.endsWith('�')) out = out.slice(0, -1);
  return out;
}
