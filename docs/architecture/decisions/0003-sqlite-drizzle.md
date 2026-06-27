---
id: 0003
title: SQLite + Drizzle (而非 PostgreSQL / Prisma)
status: Proposed
date: 2026-06-26
deciders: "@oh-summy"
---

# ADR-0003 · SQLite + Drizzle

## 上下文 (Context)

Loop Cockpit 需持久化 `blueprints / runs / logs / triggers / memories / artifacts / skills / channels` 等表。
单用户独立开发者数据规模量级:`runs` ~10⁴-10⁶/年,`logs` ~10⁶ 行/年,单库 1 年内 < 5 GB。

硬约束(non-goals §6):**默认 SQLite,单文件,零配置**,不做"必须先装个数据库"的体验。

## 决策 (Decision)

使用 **SQLite + Drizzle ORM** 作为唯一默认数据层。

- 数据库文件:`~/.loop-cockpit/data.db`
- 全文检索(Iter 5 Memory 模块):**SQLite FTS5**(内置 better-sqlite3)
- ORM:**Drizzle**(TypeScript-first,schema as code)
- 迁移:Drizzle Kit (`drizzle-kit generate` + `migrate`)
- 驱动:**better-sqlite3**(同步 API,性能最高,prebuilt 完善)

**显式不在本 ADR 锁的事**:
- 是否将来切 PostgreSQL — non-goals §6 已锁"SQLite 必须永远是默认",**允许**未来开 ADR-XXXX 加可选 Postgres driver
- 是否支持 libsql/Turso — 等有跨机器同步诉求再说(与 non-goals §1 冲突,暂不考虑)

## 替代方案 (Alternatives)

### 数据库
| 候选 | 拒绝原因 |
|---|---|
| **PostgreSQL** | 强依赖外部进程,违反 non-goals §6;单用户场景并发收益用不到 |
| **MySQL/MariaDB** | 同上 + 生态 ORM 支持不如 PG |
| **DuckDB** | OLAP 取向,事务模型 / 写并发不适合日志型负载 |
| **libsql/Turso** | 网络优先,与 non-goals §1 冲突;future-option |
| **LowDB/JSON 文件** | 无事务/索引/FTS,10⁴+ 行后必崩 |
| **LevelDB/RocksDB** | KV 模型对关系数据描述力差 |
| **裸 fs JSONL** | 查询能力为零;保留作审计**额外**载体,不替代 DB |

### ORM
| 候选 | 拒绝原因 |
|---|---|
| **Prisma** | 强依赖 Rust query engine 二进制 + 独立 schema 语言;冷启动慢;sidecar 模型不匹配 single-binary 本地工具 |
| **Kysely** | type-safe SQL builder 质量高,但无 schema-as-code 迁移;要再叠 migrator |
| **TypeORM** | 装饰器+反射运行时开销;维护节奏放缓 |
| **MikroORM** | 概念过重(Identity Map / Unit of Work),独立开发者用不上 |
| **裸 better-sqlite3** | 性能最高、依赖最少;schema 飘移无静态检查;**Iter 5+ FTS5 复杂查询时可能局部裸写** |

### SQLite 驱动
| 候选 | 决策 |
|---|---|
| **better-sqlite3** | ✅ 选。同步 API、性能最高、prebuilt 完善 |
| **node-sqlite3** | 拒。异步 API 单机场景无收益,引入回调地狱 |
| **@libsql/client** | 拒。优势在远程模式 |
| **node:sqlite** (Node 22+) | 候选未来。当前 18/20 不可用,API 仍 experimental |

## 后果 (Consequences)

**正面**
- 零外部依赖:`pnpm install` 即跑
- 单文件备份:`cp ~/.loop-cockpit/data.db backup.db`
- Drizzle schema 即类型即迁移源,TS 单一真相
- better-sqlite3 同步 API → PTY/WebSocket 热路径 I/O 可读性高
- FTS5 内置 → Iter 5 Memory 模块无需额外搜索引擎

**负面**
- **写入并发瓶颈**:SQLite WAL 模式单写多读,多 Run 并行(Iter 3+)写日志需注意
  - 缓解:日志 `INSERT` batch (每 100ms flush) + 大块流式输出走文件、只索引落库
- **native binding 跨平台**:better-sqlite3 编译/distribute 比纯 JS 复杂
  - 缓解:prebuilt-binaries;CI 跑 Linux+macOS 双产物
- **Drizzle 较年轻**:生态 / 三方教程少于 Prisma
  - 缓解:核心 API 稳定,问题看官方 issue
- **无内置 DB UI**:Prisma 有 Studio
  - 缓解:用 `sqlite3` CLI 或 Beekeeper Studio 等

**中性 / 待观察**
- Drizzle migration story 在 2026 是否仍首选 — 每 6 个月回看
- FTS5 中文分词需额外 tokenizer(jieba 等)— Iter 5 处理 Memory 时再决定
- 单 db 文件 1+ 年后膨胀 — 加 retention 策略(Iter 5+)

## 关联 ADR

- [ADR-0001](./0001-tech-stack.md) §ORM §数据库 指向本 ADR
- 未来:增加 PostgreSQL 可选 driver(如有需要)
- 未来:FTS5 中文分词方案

## 引用

- [non-goals.md](../non-goals.md) §6
- [product-overview.md](../product-overview.md) §A1 / §B1 / §F3
- GitHub Issue [#7](https://github.com/oh-summy/Loop-Cockpit/issues/7)
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite) · [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [SQLite WAL](https://www.sqlite.org/wal.html) · [FTS5](https://www.sqlite.org/fts5.html)

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-26 | v0.1 | 首版草稿 |
| 2026-06-27 | v0.2 | 砍开放问题段(转 [notes/2026-06-27-pending-decisions.md](../../../notes/2026-06-27-pending-decisions.md));重组按新 ADR 模板 |
