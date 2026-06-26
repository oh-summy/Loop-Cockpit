# ADR-0003：使用 SQLite + Drizzle，而非 PostgreSQL / Prisma

- **状态**：Proposed
- **日期**：2026-06-26
- **决策者**：@oh-summy
- **草稿作者**：AI 协作（待 @oh-summy 确认）

> ⚠️ **草稿（v0.1）**。维护者下线期间产出。结论本身由 `non-goals.md §6` 与 `prd.md §1` 已经事实锁定，本 ADR 只是把"为什么"写实。
> 待维护者 review 后改为 Accepted。

---

## 背景（Context）

Loop Cockpit 需要持久化以下数据：

| 表 | 内容 | Iteration |
|---|---|---|
| `blueprints` | Loop 蓝图定义 | 2 |
| `runs` | 执行实例 | 2 |
| `logs` | Run 日志（结构化 + 终端流） | 2 |
| `triggers` | 触发器配置 | 2（Cron/Manual）+ 后续 |
| `memories` | 跨 Run 经验（**FTS5**） | 5 |
| `artifacts` | 产物索引 | 7+ |
| `skills` | Skill 元数据 | 7+ |
| `channels` | 通知渠道配置 | 6 |

来自 `docs/architecture/data-model.md`。

数据规模量级估算（单用户独立开发者）：

- `blueprints`：~10² 量级（一辈子）
- `runs`：~10⁴-10⁶ 量级（一年）
- `logs`：~10⁶ 行 / 一年（peak）
- 单库总大小：**预计 1 年内 < 5 GB**

硬约束（来自 `non-goals.md` §6）：

> 默认 SQLite，单文件，零配置。
> 不做"必须先装个数据库"的体验。

## 决策（Decision）

Loop Cockpit 使用 **SQLite + Drizzle ORM** 作为唯一默认数据层。

- 数据库文件：`~/.loop-cockpit/data.db`
- 全文检索（Memory 模块）：**SQLite FTS5**（编入 better-sqlite3）
- ORM：**Drizzle**（TypeScript-first，schema 即代码）
- 迁移：Drizzle Kit `drizzle-kit generate` + `drizzle-kit migrate`
- 驱动：**better-sqlite3**（同步 API，性能 5–10x libsql / node-sqlite3，单机场景最佳）

**显式不在本 ADR 锁定的事**：

- 是否将来切到 PostgreSQL —— `non-goals.md` §6 已明确"SQLite 必须永远是默认"，但**允许**未来开 ADR-XXXX 加可选 Postgres
- 是否将来支持 libsql / Turso —— 等到有"用户跨机器同步"诉求再说（与 non-goals §1 冲突，暂不考虑）

## 备选方案（Alternatives Considered）

### 数据库

| 候选 | 拒绝原因 |
|---|---|
| **PostgreSQL** | 强依赖外部进程，违反 `non-goals.md` §6；单用户场景下并发收益用不到 |
| **MySQL / MariaDB** | 同上 + 生态对 ORM 支持不如 PG |
| **DuckDB** | 偏 OLAP，事务模型/写入并发不适合记日志型负载 |
| **libsql / Turso** | 网络优先，与 non-goals §1 本地优先冲突；future-option，不押注 |
| **LowDB / JSON 文件** | 无事务、无索引、无 FTS，量级 10⁴+ 行后必崩 |
| **LevelDB / RocksDB** | KV 模型对关系数据描述力差，需要自写大量胶水 |
| **裸 fs 写 JSONL** | 审计场景下可读性好，但查询能力为零；保留作为**审计落盘的额外**载体，不替代数据库 |

### ORM

| 候选 | 拒绝原因 |
|---|---|
| **Prisma** | 强依赖 Rust query engine 二进制 + 单独的 schema 语言；冷启动慢；TS 推导链长。Loop Cockpit 是 single-binary 友好的本地工具，Prisma 的"agentic" sidecar 模型不匹配。 |
| **Kysely** | 候选。type-safe SQL builder 质量高，但没有 schema-as-code 的迁移工具链；要再叠一层 migrator。 |
| **TypeORM** | 装饰器 + 反射的运行时开销 + 维护节奏放缓 |
| **MikroORM** | 概念过重（Identity Map / Unit of Work）；独立开发者用不上 |
| **裸 better-sqlite3** | 候选。性能最高、依赖最少；缺点是 schema 飘移没有静态检查，每次重构成本高。Iter 5+ FTS5 复杂查询时可能局部裸写。 |

### SQLite 驱动

| 候选 | 决策 |
|---|---|
| **better-sqlite3** | ✅ 选。同步 API、性能最高、prebuilt-binaries 完善 |
| **node-sqlite3** | 拒。异步 API 在单机本地场景没收益，反而引入回调地狱 |
| **@libsql/client** | 拒。优势在于远程模式，本地场景不如 better-sqlite3 |
| **node:sqlite**（Node 22+） | 候选未来。当前 Node 18/20 不可用，且 API 仍 experimental |

## 影响（Consequences）

### 正面

- 零外部依赖：装完 Loop Cockpit `pnpm install` 即跑，不需要"先装个数据库"
- 单文件备份：`cp ~/.loop-cockpit/data.db backup.db` 完事
- TypeScript schema 单一来源：Drizzle 的 schema 文件即类型即迁移源
- better-sqlite3 同步 API → PTY / WebSocket 热路径的 I/O 代码可读性高，不污染异步上下文
- FTS5 内置 → Iter 5 Memory 模块无需额外搜索引擎

### 负面

- 写入并发瓶颈：SQLite WAL 模式单写多读，多 Run 并行（Iter 3+）写日志时需注意
  - 缓解：日志走 `INSERT` batch（每 100 ms flush 一次）+ 大块流式输出走文件、只索引落库
- better-sqlite3 是 native binding，跨平台编译/distribute 比纯 JS 复杂
  - 缓解：使用 prebuilt-binaries；CI 跑 Linux + macOS 双产物
- Drizzle 相对年轻（2023+），生态 / 三方教程少于 Prisma
  - 缓解：核心 API 稳定；用法不复杂；问题可看官方 issue
- 没有内置数据库浏览器 UI（Prisma 有 Studio）
  - 缓解：用户用 `sqlite3` CLI 或 [Beekeeper Studio](https://www.beekeeperstudio.io/) 等第三方工具

### 中性 / 待观察

- Drizzle 的 migration story 在 2026 是否仍是首选 —— 每 6 个月回看
- FTS5 中文分词需要额外 tokenizer（jieba 等）—— Iter 5 处理 Memory 时再决定
- 单 db.file 是否在 1+ 年后膨胀超预期 —— 加 retention 策略（Iter 5+）

## 跟其他 ADR 的关系

- **ADR-0001** §"ORM" §"数据库" 已指向本 ADR
- **未来 ADR-XXXX**（如有）：增加 PostgreSQL 可选 driver
- **未来 ADR-XXXX**（如有）：FTS5 中文分词方案

## 备注

- 相关 Issue：[#7](https://github.com/oh-summy/Loop-Cockpit/issues/7)
- 相关代码：暂无（Iter 2 起 `apps/host/src/db/`）
- 上游文档：
  - `docs/product/non-goals.md` §6
  - `docs/product/prd.md` §A1, §B1, §F3
  - `docs/architecture/data-model.md`
  - `docs/architecture/overview.md`
- 参考阅读：
  - [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite)
  - [better-sqlite3 README](https://github.com/WiseLibs/better-sqlite3)
  - [SQLite WAL mode](https://www.sqlite.org/wal.html)
  - [FTS5 reference](https://www.sqlite.org/fts5.html)

## 维护者待回答的开放问题

1. **PTY 实时输出（stdout 流，可能上百 MB/run）落不落 SQLite？**
   - AI 建议：**不全落**。SQLite 存"元数据 + 关键片段 + 文件指针"，原始 buffer 写 `~/.loop-cockpit/runs/<runId>/raw.log`。
   - 等你决断后写进 data-model.md。
2. **是否提前在 Iter 2 装 drizzle-kit 的 migration 工作流，还是先用 `db.exec(initSchema)` 凑合？**
   - AI 倾向先用 migration，从 day 1 养习惯；但你可能想"先跑通再说"。
3. **WAL mode 是否默认启用？**
   - AI 强烈建议是（并发读 + 崩溃恢复）。无明显反对意见的话本 ADR 默认 yes。
4. **db schema 用 snake_case 还是 camelCase？**
   - AI 建议数据库 snake_case，TS 层 camelCase（Drizzle 支持映射）。等你拍。

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版草稿（AI 协作，维护者下线期间产出，待 review） |
