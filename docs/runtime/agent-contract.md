# Agent 运行时契约

> ⚠️ **本文件与 [`AGENTS.md`](../../AGENTS.md) 不是同一份。**
>
> - `AGENTS.md`：开发期，规范"AI 协助我开发 Loop Cockpit"
> - 本文件：运行期，规范"Loop Cockpit 在用户项目里调用 Agent 时注入的契约"

---

## 1. 注入时机

当 Loop Cockpit 启动一个 Run 时，会做以下事情：

1. 创建 worktree
2. 在 worktree 根目录写入 `CLAUDE.md` 或对应 Agent 的契约文件（如 Codex 的 `AGENTS.md`、Cursor 的 `.cursorrules` 等）
3. 文件内容由本文件模板渲染（变量替换：`{{goal}}`, `{{doneCriteria}}`, `{{worktree}}`, `{{skills}}`, `{{memory}}`, `{{tokenBudget}}`）

---

## 2. 契约模板（草案）

```markdown
# Loop Cockpit 运行时契约

你正在被 Loop Cockpit 调度执行一个 Loop Run。请严格遵循以下规则。

## 当前任务

**目标（Goal）**：{{goal}}

**完成判定（Done Criteria）**：
你的工作做完后，Loop Cockpit 会运行以下命令判定是否完成：
```
{{doneCriteria}}
```
退出码 0 = 完成；非 0 = 未完成，会被退回让你继续。

## 你的工作空间

- 你只能在以下目录工作：`{{worktree}}`
- **禁止**修改该目录之外的文件
- **禁止**执行 `rm -rf`、`sudo`、修改系统级配置等危险操作
- 所有变更通过 git commit 提交到当前 worktree 的分支

## 已注入的 Skills

{{skills}}

## 历史经验（Memory）

以下是之前类似任务的失败教训，请参考避免：

{{memory}}

## 资源预算

- 最大 token 消耗：{{tokenBudget}}
- 单次 Run 超时：{{timeoutMinutes}} 分钟
- 最大重试次数：{{maxRetries}}

## 失败时的行为

- 失败后 Loop Cockpit 会重新调用你，并把上次的 stderr 作为上下文
- 不要"假装成功"——状态码 0 是真实信号
- 如遇无法解决的环境问题（缺依赖、缺权限），输出明确错误并 exit 1
```

---

## 3. 安全护栏

Loop Cockpit 在启动 Agent 前会主动检查：

- [ ] worktree 路径必须在 `~/.loop-cockpit/workspaces/` 下
- [ ] doneCriteria 中是否包含危险 token（`rm -rf /`, `mkfs`, `dd if=`, `:(){:|:&};:` 等）→ 命中则拒绝启动
- [ ] Agent 进程的 cwd 强制设为 worktree 路径
- [ ] 环境变量中**不暴露** Loop Cockpit 自己的 token / 密钥

---

## 4. 待办

- [ ] Iter 2：实现最小版本（Goal + Done Criteria 注入）
- [ ] Iter 3：加入 worktree 路径强约束
- [ ] Iter 5：注入 Memory
- [ ] Iter 7+：支持多 Agent 各自的契约文件（CLAUDE.md / AGENTS.md / .cursorrules 等）
