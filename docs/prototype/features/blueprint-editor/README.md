---
id: P001
name: blueprint-editor
level: feature
status: Exploring
related-prd: F002
updated: 2026-06-28
---

# Prototype · Blueprint 编辑器 v2

> 单 HTML 文件,基于 v1 维护者反馈重做。
> 双击 `index.html` 在浏览器打开即可看,无需任何构建工具。

---

## 这次原型回答什么问题

**Iter 2 Blueprint 编辑器的核心 UX:启动方式怎么配?暗/亮色怎么切?**

v1(3 变体 A/B/C)维护者已选 **B 双列分组**,本 v2 在 B 基础上加:
- **暗/亮色切换**(顶栏按钮,localStorage 持久化)
- **启动方式分类化**:手动 / 定时 / Webhook(后两个 Tab 切)
- **定时模式 4 种子模式**:每天 / 每周 / 每月 / 自定义 cron 表达式
- **每天**:时间多选(预设 chips + HH:MM 自定义添加)
- **每周**:周一到周日多选 + 时间多选
- **每月**:1-31 号多选(28+ 标提示"不存在日期跳过")+ 时间多选
- **自定义**:直接写 cron 表达式 + 解析预览 + crontab.guru 链接
- **触发预览**:近 3 次触发时间(实际由后端 cron parser 算)

## 怎么看

```bash
open docs/prototype/features/blueprint-editor/index.html
```

- 顶栏右上 `🌙 暗色 / ☀️ 亮色` 按钮切换主题,刷新后保持
- 启动方式 Tab(手动 / 定时 / Webhook)切换右侧面板
- 定时模式 4 子 Tab(每天/每周/每月/自定义)切换配置区
- 所有日期/时间选择都是多选(再点取消)

## 已落地的决策

| 决策 | 体现 |
|---|---|
| H1 暗色默认 + **支持切换** | 顶栏 toggle,localStorage 持久化 |
| H5 Tailwind | CDN |
| H2 中文默认 | 全中文 label |
| D1.3 试跑按钮 | Done Criteria label 右侧 |
| **Manual 仍是 Loop** | 手动面板有提示:"配合 maxRetries > 0 时,Agent 失败 → retry → 直到 Done Criteria 通过" |
| **Cron 可视化配置器** | 4 子模式覆盖所有常见场景,无需写表达式 |
| F002 字段完整 | Name / Goal / Done Criteria / Agent+Model / Project / Trigger / Retry / Prompt Template |

## v1 → v2 变化

| | v1 | v2 |
|---|---|---|
| 变体数 | 3 (A/B/C) | 1 (基于 B) |
| 主题切换 | 仅暗色 | 暗/亮可切 + 持久化 |
| Trigger 配置 | 一行 `0 9 * * *` 输入框 | 4 子模式可视化(每天/每周/每月/自定义) |
| Manual 语义 | "Manual" 单词无解释 | 显式说明"仍是 Loop,retry 在 Run 内部" |

## 故意未做的事(skill 规则)

- ❌ 不接后端 API,提交按钮无反应(纯静态)
- ❌ 不做表单校验(zod 在 F002 实施时做)
- ❌ "试跑"和"触发预览"是模拟数据,真实数据需后端
- ❌ 没用 React/Vue(prototype 阶段不引依赖)
- ❌ 一旦决策落地,Iter 2 用 React+Tailwind 重写,本文件归档

## 决策吸收路径

选定后(`decision.md` 写完):
1. 更新 [F002 PRD](../../../prd/F002-blueprint-editor.md) §6.4 UI 字段映射
2. **更新 F002 §6.1 数据契约**:Trigger 字段重新定义,支持结构化 schedule(daily/weekly/monthly/cron expr)
3. Iter 2 第一周建 `apps/web/src/pages/blueprints/new.tsx` 时按本原型重写

## 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v1 | 3 变体 A/B/C |
| 2026-06-28 | v2 | 基于 B + 维护者反馈:主题切换 + 结构化 Cron 配置器 + Manual 语义说明 |
| 2026-06-28 | v3 | v2 + 7 项细化反馈:小时分钟滚轮选择器、周末/工作日快捷、每月 1-31 多选 + 月初/月中/月末快捷、**新增"每 N 天/周"模式 + 起始时间**、Retry Policy 中文化 + ⓘ 悬浮解释、Footer(GitHub + Power by)、Agent 显示名空格(Claude Code) + 模型本地读取提示、**类型字段(6 类多选:Bug 修复/重构/测试/文档/定期检查/其他)** |

## v2 → v3 变化要点

| 项 | v2 | v3 |
|---|---|---|
| 时间选择 | 8 个固定预设 chips | 滚轮 + ± 按钮 + 手动输入 + 6 快捷预设(0/4/8/12/16/20点)+ 已选时间 chip 显示 |
| 周/月快捷 | 无 | 周:工作日/周末/全选/清空;月:月初/月中/月末/清空 |
| 周期模式 | 无 | **新增 每 N 天/周 + 起始时间("从下一个匹配时间开始" 或 datetime-local)** |
| Retry Policy | 英文 jargon | 全中文 + 4 个 ⓘ 悬浮解释 |
| Footer | 无 | GitHub / Issues / 中英 link / Power by @oh-summy |
| Agent 显示 | claude-code(hyphen) | Claude Code(空格);说明本地配置读取 |
| 类型字段 | 无 | 6 类 chip 多选,默认选"定期检查" |
