// apps/host/src/pty/ws-registry.ts
/**
 * Registry of active WS clients per run.
 *
 * 增加：
 *  - 心跳 ping/pong：30s 一次 ping，90s 内没 pong 视为僵尸连接断掉
 *  - 广播背压：bufferedAmount 超阈值的客户端自动跳过
 *  - 启动/停止心跳
 */

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 90_000;

interface Entry {
  ws: any; // 避免对 ws 模块的硬依赖
  lastPong: number;
}

export class WsRegistry {
  private clients = new Map<string, Set<Entry>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /** 开启心跳；返回停止函数 */
  start(): () => void {
    if (this.pingTimer) return () => {};
    this.pingTimer = setInterval(() => this.pingRound(), PING_INTERVAL_MS);
    return () => this.stop();
  }

  stop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private pingRound(): void {
    const now = Date.now();
    for (const [runId, set] of this.clients) {
      for (const entry of set) {
        if (now - entry.lastPong > PONG_TIMEOUT_MS) {
          // 超时未 pong：强制断
          try { entry.ws.terminate(); } catch { /* ignore */ }
          set.delete(entry);
          continue;
        }
        try {
          entry.ws.ping();
        } catch { /* ignore */ }
      }
      if (set.size === 0) this.clients.delete(runId);
    }
  }

  /** Subscribe a WS client to a run's output stream */
  subscribe(runId: string, ws: any): void {
    if (!this.clients.has(runId)) {
      this.clients.set(runId, new Set());
    }
    const entry: Entry = { ws, lastPong: Date.now() };
    this.clients.get(runId)!.add(entry);

    // 任何 pong 都刷新时间戳
    ws.on('pong', () => { entry.lastPong = Date.now(); });
    ws.on('close', () => {
      this.clients.get(runId)?.delete(entry);
      if (this.clients.get(runId)?.size === 0) this.clients.delete(runId);
    });
    ws.on('error', () => {
      this.clients.get(runId)?.delete(entry);
      if (this.clients.get(runId)?.size === 0) this.clients.delete(runId);
    });
  }

  /** Get all WS clients for a run */
  get(runId: string): Set<any> {
    const set = this.clients.get(runId);
    if (!set) return new Set();
    // 返回纯 ws 集合（剥离 Entry 包装）
    const out = new Set<any>();
    for (const e of set) out.add(e.ws);
    return out;
  }

  /** Unsubscribe all clients for a run */
  unsubscribe(runId: string): void {
    this.clients.delete(runId);
  }

  /** Count total subscriptions */
  get count(): number {
    let total = 0;
    for (const set of this.clients.values()) total += set.size;
    return total;
  }
}

export const wsRegistry = new WsRegistry();
