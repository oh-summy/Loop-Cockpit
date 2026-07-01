// apps/host/src/verification/shell.ts
/**
 * Shell evaluator — runs a command in a subprocess and checks exit code.
 * Used for done criteria (successCondition) evaluation.
 */
import { spawnSync } from 'child_process';

export interface EvalResult {
  passed: boolean;
  exitCode: number;
  stdoutTail: string;
  stderrTail: string;
  durationMs: number;
}

/** Allowed shell builtins for safe command execution. */
const SAFE_BUILTINS = new Set(['sh', 'bash', 'python', 'python3', 'node', 'npx', 'pnpm', 'npm', 'yarn', 'cargo', 'go', 'make', 'cmake']);

/** Validate a command string: must start with a safe builtin, no shell operators. */
function isSafeCommand(cmd: string): boolean {
  const parts = cmd.trim().split(/\s+/);
  if (parts.length === 0) return false;
  const base = parts[0].split('/').pop() ?? parts[0];
  if (!SAFE_BUILTINS.has(base)) return false;
  // Reject shell operators anywhere in the command
  if (/[;|&`$(){}!<>\\\n\r]/.test(cmd)) return false;
  return true;
}

/** Execute a shell command safely using spawnSync (no shell interpreter). */
export function evaluateShell(
  command: string,
  cwd: string,
  timeoutMs: number = 30_000,
): EvalResult {
  if (!isSafeCommand(command)) {
    return {
      passed: false,
      exitCode: 1,
      stdoutTail: '',
      stderrTail: 'Command rejected: unsafe builtin or shell operator detected',
      durationMs: 0,
    };
  }

  const start = Date.now();
  const parts = command.trim().split(/\s+/);
  const cmd = parts.shift()!;
  const args = parts;

  try {
    const result = spawnSync(cmd, args, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024, // 1MB
    });

    if (result.error) {
      return {
        passed: false,
        exitCode: 1,
        stdoutTail: '',
        stderrTail: sanitizeForJson(String(result.error.message)),
        durationMs: Date.now() - start,
      };
    }

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    return {
      passed: result.status === 0,
      exitCode: result.status ?? 1,
      stdoutTail: sanitizeForJson(truncateTail(stdout, 4096)),
      stderrTail: sanitizeForJson(truncateTail(stderr, 4096)),
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      passed: false,
      exitCode: 1,
      stdoutTail: '',
      stderrTail: sanitizeForJson(err.message ?? 'execution_failed'),
      durationMs: Date.now() - start,
    };
  }
}

/** Sanitize string for JSON: remove control chars except newline/tab */
function sanitizeForJson(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** Get last N chars of a string */
function truncateTail(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(-maxLen);
}
