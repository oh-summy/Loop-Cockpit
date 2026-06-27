# 2026-06-27 · 待决策清单(从 ADR-0001 / ADR-0003 转存)

> 6/27 文档结构重构时,把 ADR 草稿里的"维护者待回答的开放问题"段转存到这里。
> ADR 本身不应塞问卷(违反 ADR 不可变原则),问题答完后:
> - 答案影响决策本身 → 修对应 ADR(或新建 supersede ADR)
> - 答案是工程细节 → 落到具体 PRD 或 GitHub Issue

---

## ADR-0001 技术栈 · 5 个开放问题

### Q1 · Tailwind CSS 要不要在本 ADR 一并锁定?
- **AI 建议**:不锁。等到 ux-flow / ui-spec 写实后单独开 ADR。
- **你的决定**:_未答_

### Q2 · Husky 是 P0 还是 Iter 2 才上?
- **AI 建议**:Iter 2(roadmap 写法已在 Iter 2)。
- **你的决定**:_未答_

### Q3 · Vitest vs Jest?
- **AI 建议**:Vitest(速度 + ESM 友好)。除非你有 Jest 习惯包袱。
- **你的决定**:_未答_

### Q4 · 是否需要 monorepo,还是先单包 apps/host?
- **AI 建议**:沿用 roadmap "先单包"。Iter 2 不预拆 apps/web / packages/shared。
- **你的决定**:_未答_

### Q5 · Node 版本最低 18 还是 20?
- **AI 建议**:LTS=20.x。
- **你的决定**:_未答_

---

## ADR-0003 SQLite+Drizzle · 4 个开放问题

### Q6 · PTY 实时输出(stdout 流,可能上百 MB/run)落不落 SQLite?
- **AI 建议**:**不全落**。SQLite 存"元数据 + 关键片段 + 文件指针",原始 buffer 写 `~/.loop-cockpit/runs/<runId>/raw.log`。
- **你的决定**:_未答_
- 影响:答完更新 `data-model.md`(Iter 2 写实)。

### Q7 · Iter 2 装 drizzle-kit migration 工作流,还是先用 `db.exec(initSchema)` 凑合?
- **AI 建议**:从 day 1 上 migration,养习惯。
- **你的决定**:_未答_

### Q8 · WAL mode 默认启用?
- **AI 建议**:强烈建议是(并发读 + 崩溃恢复)。
- **你的决定**:_未答_

### Q9 · DB schema 命名:snake_case vs camelCase?
- **AI 建议**:数据库 snake_case,TS 层 camelCase(Drizzle 支持映射)。
- **你的决定**:_未答_

---

## 处理流程

1. 答某个 Q → 把答案填到本文件对应"你的决定"行
2. 评估影响:
   - 影响 ADR-0001/0003 决策本身 → 修对应 ADR + 加修订记录
   - 是工程细节 → 在 Iter 2 起的对应 PRD 里落实(F002+)
   - 是新决策 → 开新 ADR(如 ADR-0004 起)
3. 全部 9 个答完后,本文件可归档到 `notes/_archive/`(或直接删,Issues 已留痕)

## 状态

- 创建日期:2026-06-27
- 进度:0/9 已答
- 阻塞:无(可异步答)
