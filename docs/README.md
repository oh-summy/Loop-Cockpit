# Loop Cockpit 文档地图

> 60 秒入口。所有文档按 **architecture(架构) / prd(功能 PRD) / prototype(原型)** 三层组织。

---

## 我想看什么?

| 目的 | 去哪 |
|---|---|
| 产品定义、全功能总览 | [architecture/product-overview.md](architecture/product-overview.md) |
| 绝对不做的事（护身符） | [architecture/non-goals.md](architecture/non-goals.md) |
| 术语表 | [architecture/glossary.md](architecture/glossary.md) |
| 系统架构、模块边界 | [architecture/overview.md](architecture/overview.md) |
| 历史技术决策（ADR） | [architecture/decisions/](architecture/decisions/) |
| 时间线 + 优先级 | [roadmap.md](roadmap.md) |
| 单个功能 PRD | [prd/README.md](prd/README.md) |
| UI 原型设计 | [prototype/README.md](prototype/README.md) |

## 我要新建文档,模板在哪?

| 新建什么 | 模板 |
|---|---|
| 新功能 PRD | [prd/_template.md](prd/_template.md) |
| 新 ADR | [architecture/decisions/template.md](architecture/decisions/template.md) |

## 文档生命周期

```
发现问题 → GitHub Issue
   ↓
功能立项 → 建 prd/F<NNN>-<slug>.md(用 _template.md)
   ↓
设计参考 → 引用 architecture/overview + decisions/<相关 ADR>
   ↓
UI 决策 → 建 prototype/<level>/<name>/（用 prototype skill）
   ↓
原型审批 → decision.md 回填到对应 PRD
   ↓
实施 → 写代码，在 PRD 关联资源中加代码路径
   ↓
完成 → 更新 PRD status + roadmap + CHANGELOG
```

## 顶层目录速览

```
docs/
├── README.md                       # 本文件
├── roadmap.md                      # Iter 时间线 + 优先级
├── architecture/                   # 架构 + 总 PRD + 决策(稳定层)
│   ├── overview.md                   # 系统分层 + 模块边界
│   ├── product-overview.md           # 产品定义、全功能总览
│   ├── non-goals.md                  # 不做清单
│   ├── glossary.md                   # 术语
│   └── decisions/                    # ADR 决策日志
├── prd/                            # 单功能 PRD(滚动追加,F<NNN>)
└── prototype/                      # 原型资产库(features/components/product)
```
