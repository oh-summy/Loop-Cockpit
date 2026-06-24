# 数据模型

> 占位文件。完整 Drizzle Schema 将在 Iteration 2 写入。

## 计划核心表

| 表 | 内容 | Iteration |
|---|---|---|
| blueprints | Loop 蓝图定义 | 2 |
| runs | 执行实例 | 2 |
| logs | Run 日志 | 2 |
| triggers | 触发器配置（Trigger 总线） | 2（仅 Cron/Manual） |
| memories | 跨 Run 经验（FTS5） | 5 |
| artifacts | 产物索引 | 7+ |
| skills | Skill 元数据 | 7+ |
| channels | 通知渠道配置 | 6 |

参考字段定义：[PRD §A1](../product/prd.md)
