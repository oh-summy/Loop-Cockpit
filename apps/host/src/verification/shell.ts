// apps/host/src/verification/shell.ts
/**
 * Shell evaluator — runs a command in a subprocess and checks exit code.
 * Used for done criteria (successCondition) evaluation.
 *
 * 安全模型（ADR-0011 §6）：
 *  - 命令校验走单一可信来源 util/shell.ts::'isSafeCommand'
 *  - spawnSync 用 shell:false，避免 shell 元字符注入
 *  - 明确拒绝 sh -c / bash -c，只允许 sh -s（从 stdin 读提示）
 *  - 命令必须是绝对路径或纯 basename（真实路径）
 */
import { spawnSync } from 'child_process';
import { isSafeCommand, splitCommand, sanitizeForJson, truncateUtf8 } from '../util/shell';

export interface EvalResult {
  passed: boolean;
  exitCode: number;
  stdoutTail: string;
  stderrTail: string;
  durationMs: number;
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
  const [cmd, args] = splitCommand(command);
  // 复合命令走 sh -s：整条链通过 stdin 传入，退出码以末段为准。
  const isShStdin = cmd === 'sh' && args[0] === '-s';

  try {
    const result = spawnSync(cmd, isShStdin ? [] : args, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024, // 1MB
      ...(isShStdin ? { input: args[1] } : {}),
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
      stdoutTail: sanitizeForJson(truncateUtf8(stdout, 4096)),
      stderrTail: sanitizeForJson(truncateUtf8(stderr, 4096)),
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
