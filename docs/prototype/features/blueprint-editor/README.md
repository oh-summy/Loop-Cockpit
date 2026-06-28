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
| 2026-06-28 | v3 | v2 + 7 项细化反馈:时间滚轮、周末/工作日快捷、每 N 天/周 + 起始时间、Retry Policy 中文化、Footer、Agent 显示名空格、类型字段 |
| 2026-06-28 | **v4** | **完全重设计**:Linear + Warp 混合风格(JetBrains Mono / Inter / 13px 高密度 / 1px edge-to-edge 分隔)+ **模板系统**(6 类内置模板 + 用户另存) + **可勾选要点追加** + 数字 stepper + 路径选择器 popup + 完整规则预览句。详细设计稿见 [docs/superpowers/specs/2026-06-28-blueprint-editor-v4-design.md](../../../superpowers/specs/2026-06-28-blueprint-editor-v4-design.md) |

## v3 → v4 完全重设计

| 项 | v3 | v4 |
|---|---|---|
| 视觉风格 | Tailwind 默认风,偏 SaaS | Linear + Warp 混合 — 程序员极客感 |
| 字体 | 系统默认 | Inter (UI) + JetBrains Mono (机器值) |
| 信息密度 | 中等 | 高密度(13px / 16px gap),Linear 列表风 |
| 间隔 | 卡片堆叠(圆角阴影) | 1px edge-to-edge 分隔 |
| 模板 | 无 | 6 内置模板 + 可勾选要点 + 用户另存 (localStorage) |
| 类型字段 | 6 chip 多选(独立字段) | 类型 + 二级模板下拉,作为 form 起点 |
| 数字字段 | text input | stepper [− N +],支持单位切换(分钟/小时 0.5 步长) |
| 项目路径 | text input | text + Browse 按钮 + 模态目录选择器 |
| 时间预览 | 仅"近 3 次" | 实时预览句("每月 1、15 号 09:00 · 19:00") + 近 3 次 |
| 命令/路径 | 普通字体 | monospace + $ / ~ 提示符 |
| 状态 token | 无 | tok-ok / tok-warn / tok-err / tok-accent(Warp 风) |
| 暗/亮 切换 | 已有 | 保留,优化色板(纯黑偏蓝 / 纯白偏灰) |
| Footer | GitHub + Power by | 同 + 键盘提示(S save · Cmd+Enter save&run) |
