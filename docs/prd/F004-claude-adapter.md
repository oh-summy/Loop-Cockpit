---
id: F004
title: Claude Code Adapter + 实时终端流
status: Draft
priority: P0
iteration: Iter 2
issue: TBD
owner: "@oh-summy"
updated: 2026-06-28
---

# F004 · Claude Code Adapter + 实时终端流

> 把 F001 验证过的 node-pty + claude 能力封装成 `AgentAdapter` 接口的第一个实现,并把 raw ANSI 流转发到浏览器 Xterm.js。这是"Agent 编排"产品的真正起点。

---

## 1. 一句话

实现 `AgentAdapter` 接口的 `ClaudeCodeAdapter`,基于 [F001](./F001-pty-runner.md) 的 PTY 能力拉起 `claude` CLI,把 raw stdout 通过 WebSocket 转发到浏览器 Xterm,同时写双轨存储。

## 2. 目标 (Why)

ux-flow Flow 1 要求用户能在 UI 看到 Agent **实时**输出。这意味着:
- node-pty raw buffer 必须以 chunk 级延迟(< 100ms)到达前端 Xterm.js
- ANSI 控制码不能丢(色彩、光标控制都要)
- 同一份流要 fan-out 三个去向:WebSocket / raw.log / DB 截片段

本 PRD 是 [ADR-0002](../architecture/decisions/0002-node-pty.md) 的产品化实现。F001 是 spike,本 PRD 是 apps/host/。

## 3. 范围

### In Scope (Iter 2)
- **AgentAdapter 接口**(`apps/host/src/adapter/types.ts`):统一抽象,Iter 2 仅 claude 实现,接口为后续 OpenCode/Kimi 准备
- **ClaudeCodeAdapter**:
  - `start(ctx: RunContext): Promise<AgentProcess>`
  - 内部用 [spike/pty/pty-harness.ts](../../spike/pty/) 升级版 wrap node-pty
  - Iter 2 用 `claude -p <prompt>` headless 模式(非交互,`[y/N]` FSM 留 Iter 3)
  - `parseExitCode(output)`:claude 退出码标准 0/1/124,直接返回 process exit
  - `estimateTokens(output)`:Iter 2 用近似(`chars / 4`)+ claude 输出末尾的 cost block 解析(claude 自报 usage)
- **PTY Harness**(`apps/host/src/pty/`):
  - F001 spike 的 `pty-harness.ts` 升级 → 加 `Three-way fan-out`:
    1. WebSocket(F003 注册的 `/api/runs/:id/stream`)
    2. 文件 stream → `~/.loop-cockpit/runs/<runId>/raw.log`(append mode,fsync 每秒一次)
    3. 内存环形 buffer(最后 8 KB,失败时截 errorSnippet 入 DB)
  - `chmod +x` spawn-helper 自动化(ADR-0002 坑 2 对策):postinstall 脚本扫所有 prebuilds 目录
- **WebSocket 实时流**:`@fastify/websocket` 注册 `/api/runs/:id/stream`,客户端订阅后推送 raw chunk
- **Xterm.js 桥**:前端 `<XtermViewer runId={id} />` 组件,内部 `new Terminal()` + WebSocket → `term.write(chunk)`
- **超时控制**:接收 `timeoutMs`,到点 SIGTERM(优雅)→ 500ms 后 SIGKILL(强制)
- **取消**:`AgentProcess.kill()` 立即 SIGKILL

### Out of Scope (推后)
- `[y/N]` 自动应答 FSM(Issue #2,Iter 3+,见 [ADR-0002](../architecture/decisions/0002-node-pty.md) "下一 PRD")
- 多模型选择(Iter 2 仅 `claude-sonnet-4-6` 默认)
- 输出录像回放(Xterm replay,Iter 5)
- claude 之外的 Agent 适配(Iter 3+)

## 4. 用户故事 / Use Cases

- 作为用户,点 "Run now" 后,Run 详情页的 Xterm 区域**马上**出现 claude 的彩色输出
- 作为用户,Agent 输出长达 100KB+ 时,Xterm 滚动不卡(虚拟滚动)
- 作为用户,点 "Stop" 时,UI 立即看到 Xterm 停止输出
- 作为开发者(Iter 3 起调试 Worktree 时),raw.log 文件能 `tail -f` 看完整流水

## 5. 关联资源

| 类型 | 资源 | 说明 |
|---|---|---|
| Iter 1 PRD | [F001 PTY Runner](./F001-pty-runner.md) | 已验证的 PTY 底层能力 |
| ADR | [0002 node-pty](../architecture/decisions/0002-node-pty.md) | 三坑对策(allowBuilds / spawn-helper chmod / timer) |
| Spike 代码 | [spike/pty/pty-harness.ts](../../spike/pty/pty-harness.ts) | 雏形,本 PRD 升级 |
| 上游 PRD | [F003 Run 状态机](./F003-run-state-machine.md) | 调用方,提供 RunContext + 注册 WS |
| 下游 PRD | [F005 Audit](./F005-audit-trail.md) | 消费 token + 截片段 |
| 原型 | [prototype/components/xterm-viewer](../prototype/components/) | _周末出 Xterm 视觉规格_ |
| 架构 | [overview.md §2.2 AgentAdapter 接口](../architecture/overview.md) | 接口定义 |

## 6. 数据契约 / 接口

> ⚠️ **2026-06-28 v0.2 重大改动**:Adapter 加"多阶段同 session-id 编排"实现。详见 [ADR-0009 §2](../architecture/decisions/0009-phase-orchestration.md)。

### 6.0 阶段执行命令模板(★ v0.2 新增)

```bash
# 阶段 1(首次,Loop Cockpit 生成 session UUID)
claude -p "$PHASE_USER_MSG" \
  --bare \
  --session-id "$SESSION_UUID" \
  --append-system-prompt-file "$LOOP_DIR/phase1.md" \
  --tools "Read,Glob,Grep" \
  --plugin-dir "$LOOP_DIR/phase1-skills/" \
  --mcp-config "$LOOP_DIR/phase1-mcp.json" \
  --strict-mcp-config \
  --agents "$(cat $LOOP_DIR/phase1-agents.json)" \
  --permission-mode plan \
  --add-dir "$PROJECT_PATH" \
  --effort high \
  --output-format stream-json --verbose \
  --include-partial-messages --include-hook-events \
  --max-turns 50 --max-budget-usd 5.00

# 阶段 2+(用 --resume,session 续)
claude -p "$PHASE_USER_MSG" \
  --bare \
  --resume "$SESSION_UUID" \              # ← 关键
  --append-system-prompt-file "$LOOP_DIR/phase2.md" \
  --tools "Bash,Edit,Read,Write" \         # 改阶段工具集
  --permission-mode acceptEdits \          # 改阶段权限
  --dangerously-skip-permissions \         # 改阶段无人值守
  --effort medium \                        # 改阶段思考深度
  ...
```

### 6.1 AgentAdapter 接口

```typescript
// apps/host/src/adapter/types.ts
export interface AgentAdapter {
  readonly id: string;                          // "claude-code"
  readonly supportedModels: readonly string[];  // ["claude-sonnet-4-6", "claude-opus-4-8", ...]
  start(ctx: RunContext): Promise<AgentProcess>;
  parseExitCode(output: string): number | null;
  estimateTokens(output: string): { input: number; output: number; costUsd: number };
}

export interface RunContext {
  runId: string;
  systemPrompt: string;       // F003 拼装好(Goal + 上下文)
  cwd: string;                // blueprint.projectPath
  timeoutMs: number;          // retryPolicy.timeoutMinutes * 60_000
  env?: Record<string, string>;
  cols?: number;              // default 120
  rows?: number;              // default 30
}

export interface AgentProcess {
  pid: number;
  onData(cb: (chunk: string) => void): void;    // F003 注册,fan-out 给 WS/file/buffer
  onExit(cb: (result: { exitCode: number; signal?: string }) => void): void;
  write(input: string): void;                    // 留给 [y/N] FSM(Iter 3+)
  kill(signal?: "SIGTERM" | "SIGKILL"): Promise<void>;
}
```

### 6.2 PTY Harness 内部 Fan-out 实现

```typescript
// apps/host/src/pty/index.ts
class PtyHarnessImpl {
  spawn(ctx: RunContext): AgentProcess {
    const proc = pty.spawn("claude", ["-p", ctx.systemPrompt], {
      name: "xterm-color",
      cols: ctx.cols ?? 120,
      rows: ctx.rows ?? 30,
      cwd: ctx.cwd,
      env: { ...process.env, ...ctx.env },
    });

    // 三路 fan-out
    const rawLog = createWriteStream(rawLogPath(ctx.runId), { flags: "a" });
    const ringBuffer = new RingBuffer(8 * 1024);   // 最后 8KB
    const wsClients = wsRegistry.get(ctx.runId);   // WebSocket clients

    proc.onData((chunk) => {
      rawLog.write(chunk);                          // → raw.log (异步)
      ringBuffer.push(chunk);                       // → DB errorSnippet 候选
      wsClients?.forEach(ws => ws.send(chunk));     // → 浏览器 Xterm
      logger.debug({ runId: ctx.runId, bytes: chunk.length }, "pty data");
    });

    // 超时控制
    const timeoutHandle = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 500);
    }, ctx.timeoutMs);

    proc.onExit(({ exitCode, signal }) => {
      clearTimeout(timeoutHandle);
      rawLog.end();
      logger.info({ runId: ctx.runId, exitCode, signal }, "agent exited");
    });

    return wrapAsAgentProcess(proc, ringBuffer);
  }
}
```

### 6.3 WebSocket 协议

```
客户端 → 服务端: { type: "subscribe", runId: "..." }
服务端 → 客户端: { type: "data", chunk: "<raw ANSI string>" }
服务端 → 客户端: { type: "exit", exitCode: 0 }
服务端 → 客户端: { type: "error", message: "..." }
```

Iter 2 用纯字符串 chunk(简单);Iter 5 加 binary frame 优化(如果实测有瓶颈)。

### 6.4 Token / Cost 估算

claude 的 `-p` 模式默认在退出前输出一个 usage 块(JSON 或 markdown,具体格式 Iter 2 实施时确认)。

```typescript
estimateTokens(rawOutput: string): { input: number; output: number; costUsd: number } {
  // 1. 优先解析 claude 自报的 usage block(末尾若干字节内 grep)
  const match = rawOutput.match(/usage:\s*\{[^}]+\}/);
  if (match) return parseClaudeUsage(match[0]);

  // 2. fallback:字符数除以 4 估算
  const chars = rawOutput.length;
  return { input: chars / 8, output: chars / 4, costUsd: chars / 4 * 0.00001 };
}
```

## 7. 验收标准 (Done Criteria)

- [ ] `ClaudeCodeAdapter` 在新建的 apps/host 内能跑通,vitest 单元测试(mock pty)+ 一个集成测试(真启 claude --version)
- [ ] postinstall 脚本自动 `chmod +x` 所有平台的 spawn-helper(ADR-0002 坑 2 自动化)
- [ ] WebSocket 在 Agent 运行期间持续推送 chunk,前端 Xterm 显示彩色(色码不丢)
- [ ] raw.log 在 `~/.loop-cockpit/runs/<runId>/raw.log` 完整(`diff <(从 WS 收的拼接) <(cat raw.log)` 一致,允许时序差)
- [ ] errorSnippet 在 Agent 异常退出时填到 `runs.error_snippet`(最后 256 字节)
- [ ] `kill("SIGKILL")` 在 200ms 内让 claude 进程消失
- [ ] timeoutMs 触发后 SIGTERM → SIGKILL 流程能干净退出
- [ ] estimateTokens 解析 claude usage 块成功率 > 80%(Iter 2 实施时测)

## 8. 非功能约束

- **延迟**:WebSocket chunk 从 PTY 接收到前端渲染 < 100ms
- **吞吐**:支持 100KB/s 持续流不掉帧
- **内存**:RingBuffer 严格 8KB 上限,不会膨胀
- **fsync**:raw.log 每秒 fsync 一次,Host 崩溃最多丢 1 秒数据

## 9. 开放问题

- ⚠️ **Q · claude `-p` 模式是否需要传完整 system prompt?**
  - 走纯文本 prompt,还是用 `--system-prompt <file>` 参数?
  - 等 Iter 2 实施时确认 `claude` 当前(2.1.x)的 CLI flag
- ⚠️ **Q · WebSocket 重连**:Run 进行中前端刷新页面,新 WS 连接如何 catch up?
  - 备选 1:重放 raw.log 全部历史 + 接续 live(简单)
  - 备选 2:只接续 live,UI 提示"刷新可能丢失部分历史"
  - 倾向备选 1(用户体验优先,Iter 2 实测如果文件大延迟高再改)

## 10. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版 Draft |
| 2026-06-28 | v0.2 | ★ 加阶段执行命令模板,详细 flag 集见 §6.0。详见 [ADR-0009](../architecture/decisions/0009-phase-orchestration.md) |
