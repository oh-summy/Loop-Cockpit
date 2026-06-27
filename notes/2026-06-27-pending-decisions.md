# 2026-06-27 · 待决策清单(从 ADR-0001 / ADR-0003 转存)

> 6/27 文档结构重构时,把 ADR 草稿里的"维护者待回答的开放问题"段转存到这里。
> ADR 本身不应塞问卷(违反 ADR 不可变原则)。

**6/28 维护者一次性拍板:全部 9 个问题按 AI 建议接受**。本文件保留作历史追溯,ADR-0001/0003 已同步 Accepted。

---

## ADR-0001 技术栈 · 5 个开放问题

### Q1 · Tailwind CSS 要不要在本 ADR 一并锁定?
- **AI 建议**:不锁。等到 ux-flow / ui-spec 写实后单独开 ADR。
- **决定**:✅ **接受 AI 建议**(2026-06-28)。本 ADR 不锁。后续 H5 横向决策已选 "Tailwind",但留单独 ADR 锁定时机给 Iter 2 起 apps/web 建立时。

### Q2 · Husky 是 P0 还是 Iter 2 才上?
- **AI 建议**:Iter 2。
- **决定**:✅ **Iter 2**(2026-06-28)。Iter 1 仅文档+spike,不上 hook。

### Q3 · Vitest vs Jest?
- **AI 建议**:Vitest(速度 + ESM 友好)。
- **决定**:✅ **Vitest**(2026-06-28)。

### Q4 · 是否需要 monorepo,还是先单包 apps/host?
- **AI 建议**:沿用 roadmap "先单包"。Iter 2 不预拆 apps/web / packages/shared。
- **决定**:✅ **先单包 apps/host**(2026-06-28)。pnpm workspace 配置就位,apps/web 在 Iter 2 后期或 Iter 3 起拆。

### Q5 · Node 版本最低 18 还是 20?
- **AI 建议**:LTS=20.x。
- **决定**:✅ **Node 20 LTS**(2026-06-28)。`engines.node = ">=20"`。

---

## ADR-0003 SQLite+Drizzle · 4 个开放问题

### Q6 · PTY 实时输出(stdout 流,可能上百 MB/run)落不落 SQLite?
- **AI 建议**:**不全落**。SQLite 存"元数据 + 关键片段 + 文件指针",原始 buffer 写 `~/.loop-cockpit/runs/<runId>/raw.log`。
- **决定**:✅ **接受双轨存储**(2026-06-28)。
  - DB(`runs` 表):元数据 + 关键报错片段 + 文件路径指针
  - 文件系统:`~/.loop-cockpit/runs/<runId>/raw.log` 存原始 ANSI buffer
  - 重放:从文件读流;查询/索引:走 DB
- **影响**:`docs/architecture/overview.md` 已同步;Iter 2 在 F003/F004 PRD 中固化字段

### Q7 · Iter 2 装 drizzle-kit migration 工作流,还是先用 `db.exec(initSchema)` 凑合?
- **AI 建议**:从 day 1 上 migration。
- **决定**:✅ **migration day 1 上**(2026-06-28)。Iter 2 第一个 schema commit 即用 `drizzle-kit generate`。

### Q8 · WAL mode 默认启用?
- **AI 建议**:强烈建议是(并发读 + 崩溃恢复)。
- **决定**:✅ **默认 WAL on**(2026-06-28)。Host 启动时 `PRAGMA journal_mode=WAL`。

### Q9 · DB schema 命名:snake_case vs camelCase?
- **AI 建议**:数据库 snake_case,TS 层 camelCase(Drizzle 支持映射)。
- **决定**:✅ **DB snake_case / TS camelCase**(2026-06-28)。Drizzle schema 文件统一用 `pgTable` 风格的列名映射。

---

## 处理流程

1. ✅ 答某个 Q → 把答案填到本文件对应"决定"行
2. ✅ 评估影响:
   - 影响 ADR-0001/0003 决策本身 → 修对应 ADR + 加修订记录
   - 是工程细节 → 在 Iter 2 起的对应 PRD 里落实(F002+)
   - 是新决策 → 开新 ADR(如 ADR-0004 起)
3. 全部 9 个答完后,本文件可归档(暂保留作历史)

## 状态

- 创建日期:2026-06-27
- 拍板日期:**2026-06-28**(全部接受 AI 建议)
- 进度:**9/9 已答 ✅**
- 后续:ADR-0001/0003 已改 Accepted,Issue #5 #7 已关
