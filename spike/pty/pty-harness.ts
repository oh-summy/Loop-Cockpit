/**
 * spike/pty/pty-harness.ts
 *
 * Loop Cockpit PTY Harness 的**雏形**。
 * 目标：把 00/01/02 共用的"启进程 + 读流 + 写 stdin + 退出"逻辑沉淀下来，
 *      为 Iter 2 正式实现 apps/host/src/pty/ 提供蓝本。
 *
 * ⚠️ 本文件目前是**接口骨架**，没有实现。
 *    实现等 01/02 跑通后再来抽。先把"未来 module 该长什么样"定下来。
 *
 * 设计参考：
 *   - PRD §D PTY 执行层
 *   - PRD §C1 Adapter 接口
 *   - glossary § PTY Harness
 */

import type { IPty } from "node-pty";

/** PTY 启动参数 */
export interface SpawnOptions {
  /** 命令绝对路径或 PATH 内的名字 */
  command: string;
  /** 命令参数 */
  args?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 环境变量（默认继承当前进程） */
  env?: Record<string, string>;
  /** 终端尺寸 */
  cols?: number;
  rows?: number;
  /** 是否保留 ANSI（默认 true）。Iter 2 决定 strip vs preserve */
  preserveAnsi?: boolean;
  /** 兜底超时（毫秒）。到了主动 SIGKILL */
  timeoutMs?: number;
}

/** PTY 输出事件 */
export interface DataEvent {
  /** 累计 chunk 序号 */
  seq: number;
  /** 原始字节 */
  raw: string;
  /** 时间戳（ms） */
  at: number;
}

/** PTY 退出原因 */
export interface ExitEvent {
  exitCode: number | null;
  signal: number | null;
  /** 是否因 timeoutMs 触发的 kill */
  timedOut: boolean;
  /** 总字节数 */
  totalBytes: number;
  /** 总 chunk 数 */
  totalChunks: number;
  /** 启动到退出耗时 ms */
  durationMs: number;
}

/** PTY Harness 对外接口 */
export interface PtyHarness {
  /** 底层 pty 句柄（暴露便于 spike 期诊断；正式版会收窄） */
  readonly pty: IPty;
  /** 监听 stdout/stderr 合流 */
  onData(cb: (e: DataEvent) => void): void;
  /** 监听退出 */
  onExit(cb: (e: ExitEvent) => void): void;
  /** 写一行（自动追加 \r 或 \n，由实现决定） */
  writeLine(text: string): void;
  /** 写原始字节 */
  write(raw: string): void;
  /** 主动结束 */
  kill(): Promise<void>;
}

/**
 * 启动一个 PTY 进程。
 *
 * @throws 如果 options.command 不在 PATH 且不是绝对路径
 *
 * TODO：在 01/02 跑通后实现
 */
export function spawnHarness(_options: SpawnOptions): PtyHarness {
  throw new Error(
    "pty-harness.ts 暂未实现 — 等 01-spawn-claude.ts 与 02-send-prompt.ts 跑通后再抽出共用逻辑",
  );
}
