# 2026-06-28 · Blueprint 编辑器 v4 设计稿

> **brainstorming skill 流程产出**
> **维护者**: @oh-summy
> **状态**: ✅ 已批准,待实现
> **目标**: docs/prototype/features/blueprint-editor/ 替换 v3,作为 F002 PRD 的最终原型输入

---

## 1. 问题陈述

v3 维护者反馈 5 项:
1. 周/月快捷预设丰富化
2. 已选时间应表达完整规则(每月几号 + 几点完整配合,不是两堆分别选)
3. 数字字段升级:重试 / 超时 / 预算 都应该是数字而非文本,可增减
4. 项目路径用"选择"而非"输入"
5. 目标 / 完成判定 应根据类型预填,可勾选要点追加,支持用户保存模板

附加要求:
- **视觉风格**: "程序员极客感",参考 Linear / Vercel / Raycast / Cursor / Warp,不要太丑
- 自行设计审美,需要时参考别人项目

## 2. 视觉系统(Linear + Warp 混合 · 高密度)

### 2.1 色板

| 用途 | 暗色 | 亮色 |
|---|---|---|
| 背景 | `#0a0a0b` | `#fafafa` |
| 表面层 1 | `#141416` | `#f3f3f4` |
| 边线(1px) | `#202023` | `#e6e6e8` |
| 主文字 | `#e4e4e7` | `#0a0a0b` |
| 次文字 | `#71717a` | `#71717a` |
| accent 1 | `#7c5cff`(紫) | 同 |
| accent 2 - ok | `#10b981`(绿) | 同 |
| accent 2 - warn | `#f59e0b`(黄) | 同 |
| accent 2 - danger | `#ef4444`(红) | 同 |

### 2.2 字体

- 主字体: `Inter, -apple-system, 'PingFang SC'`, **13px 基础**
- 等宽: `'JetBrains Mono', 'SF Mono', ui-monospace`(命令 / 路径 / 时间 / cron / 状态 token)
- 标题最大 18px,**绝不超过 20px**
- 行高紧 `1.4`

### 2.3 布局

- 顶部 navbar **48px** 高(不是 64px)
- 主体 `max-width: 1100px`(比 v3 窄,显得紧)
- 表单字段间距 16px
- **去掉所有圆角卡片堆**:用 `1px` 边线分组,只在按钮 / chip / popover 给 `6px` 圆角

### 2.4 Warp 风元素

- 命令行字段(Done Criteria、Cron 表达式)前加 `$` 提示符,monospace
- 路径字段前加 `~` 或目录图标
- 状态 token 多色:`[active]` 绿 / `[paused]` 灰 / `[error]` 红
- 时间 chip monospace:`09:00` / `14:30`

## 3. 模板系统数据契约

### 3.1 内置模板(产品发布时硬编码)

```typescript
type BuiltinTemplate = {
  id: string;
  type: 'bug' | 'refactor' | 'test' | 'docs' | 'check' | 'other';
  name: string;
  goalText: string;          // 整段预填
  goalCheckpoints: Checkpoint[];
  doneCriteriaText: string;
  doneCheckpoints: Checkpoint[];
};

type Checkpoint = {
  id: string;
  label: string;       // UI 显示:"复现问题"
  appendText: string;  // 勾选追加:"复现:[复现步骤]"
};
```

### 3.2 6 个内置模板(原型阶段)

**Bug 修复**
```
goalText: "修复 [问题简述]。定位根因,确保不复发。"
goalCheckpoints:
  - 复现问题 → 追加 "\n复现:[复现步骤]"
  - 定位根因 → 追加 "\n在 [文件路径] 找到根因"
  - 写回归测试 → 追加 "\n新增测试覆盖此 bug"
  - 提交 PR → 追加 "\n提交 PR 关联 issue"
doneCriteriaText: "pnpm test"
doneCheckpoints:
  - 通过测试 → " && pnpm test"
  - 通过 lint → " && pnpm lint"
  - 通过类型检查 → " && pnpm typecheck"
```

**重构**
```
goalText: "对 [模块/文件] 进行重构,保持外部行为不变。"
goalCheckpoints: 拆分函数 / 提取常量 / 加类型注释 / 写测试保证不退化
doneCriteriaText: "pnpm test && pnpm typecheck"
```

**测试**
```
goalText: "为 [模块] 补充测试,目标覆盖率 ≥ 80%。"
goalCheckpoints: 单元测试 / 集成测试 / 边界用例 / coverage 报告
doneCriteriaText: "pnpm test -- --coverage && coverage > 80"
```

**文档**
```
goalText: "为 [模块/功能] 补充文档。"
goalCheckpoints: API 文档 / 用法示例 / Changelog 更新 / README 同步
doneCriteriaText: "test -f docs/<file>.md"
```

**定期检查**(默认选这个,示例就是 daily-lint)
```
goalText: "保持 main 分支健康。"
goalCheckpoints: lint / test / build / typecheck
doneCriteriaText: "pnpm lint && pnpm test && pnpm build"
```

**其他**(空白模板)
```
goalText: ""
goalCheckpoints: []
doneCriteriaText: ""
doneCheckpoints: []
```

### 3.3 用户模板

- "💾 另存为我的模板"按钮
- 弹 popup 输入模板名
- 保存到 localStorage(原型阶段);Iter 2 进 SQLite `templates` 表
- 类型下拉的"模板"二级下拉中显示:`系统内置 / 我的模板`

## 4. UI 结构

```
─────────────────────────────────────────────────────────────
▸ Loop Cockpit     Dashboard  Blueprints  Runs       🌙 @summy
─────────────────────────────────────────────────────────────

Create Blueprint                           [Save]  [Save+Run]
─────────────────────────────────────────────────────────────

▾ Type 🐛 Bug 修复            ▾ Template 基础版

─ Core ─────────────────────────────────────────────────────
Name             daily-lint
Goal             [textarea,根据模板预填]
                 💡 加入要点(勾选追加):
                 ☐ 复现问题  ☐ 定位根因  ☑ 写回归测试  ☑ 提交 PR
Done             $ pnpm test
                 💡 加入校验: ☑ 通过测试 ☐ 通过 lint ☐ 通过类型
Path             ~/project/Loop-Cockpit              [📁 Browse]

─ Trigger ──────────────────────────────────────────────────
Mode             ◉ Manual   ◯ Schedule   ◯ Webhook

[Schedule 子区(条件渲染):每天/每周/每月/每 N 天/自定义]
[每周快捷新增]: 工作日 9点 / 工作日 12点 / 周一 0点 /
              周末 10点 / 周一周三周五 9点

📅 触发预览(预览句 - 实时):
   每月 1、15 号 09:00 · 19:00
   下次:6月30日 09:00 / 7月1日 09:00 / 7月1日 19:00

─ Retry Policy ─────────────────────────────────────────────
Max retries  [− 3 +]      Single run timeout  [− 10 +] [min ▾]
Token budget $[    ]  (空 = 不限)
On fail      Notify ▼

─ Advanced ─────────────────────────────────────────────────
▾ System prompt template
[折叠]

[Footer]: Powered by @oh-summy · GitHub · Issues · 中文/EN · MIT · 本地优先
```

## 5. 5 条反馈逐项落实

### 5.1 周/月快捷预设丰富化

每周快捷新增 5 个常用组合(一键应用,自动设置日期 + 时间):
- 工作日 9点
- 工作日 12点
- 周一 0点
- 周末 10点
- 周一/周三/周五 9点

### 5.2 已选时间 = 完整规则

保留双选区(日期 + 时间),**上方加预览句**:
- 实时句子拼接:"每月 1、15 号 09:00 · 19:00"
- 下方再列近 3 次具体触发(已有)
- 让用户一眼看到 N×M 交叉触发的全貌

### 5.3 数字输入升级

| 字段 | 控件 | 说明 |
|---|---|---|
| 重试次数 | `[− 3 +]` | 整数,0-20,点击 ± 步进,可手动键入 |
| 超时 | `[− 10 +] [分钟 ▾]` | 单位下拉:分钟(整数,1-120)/ 小时(0.5 步长,0.5-24)|
| 预算 | `$[    ]` | 数字,默认空 = 不限。键入 0 也视为不限 |

### 5.4 项目路径选择器

- 当前 `<input type="text">` 改为 `[文本框 / 📁 Browse...]`
- 原型 HTML 不能调真 native dialog
- 点击 Browse 弹模拟 popup:列几个 mock 路径示例 + 输入框,带注释"Iter 2 走 Electron/Tauri 的 dialog API"

### 5.5 模板系统

- Type 下拉:6 类(Bug / Refactor / Test / Docs / Check / Other)
- 选类型后,二级 Template 下拉出现:`[基础版]` 或 `[我的: xxx]` 或 `[+ 空白]`
- 选模板后:
  - Goal textarea 填入 `goalText`
  - Goal 下方出现 Checkpoint chip 行(可点击勾选追加)
  - Done 同理
- 全屏底部加按钮: "💾 另存为我的模板"
- 用户模板存 `localStorage.lc-templates`

## 6. 技术实现约束

- 单 HTML 文件,Tailwind CDN(v3 路线延续)
- 加 Google Fonts: Inter + JetBrains Mono
- 不引 React,纯 JS,**可丢弃**
- localStorage 存:
  - `lc-theme`: 'dark' | 'light'
  - `lc-templates`: UserTemplate[]
- 视觉系统中所有色用 CSS 变量,确保暗/亮色一致

## 7. 不做的事(YAGNI)

- ❌ 真 React 实现 — Iter 2 重写
- ❌ 表单校验 — F002 PRD 实施时做(zod)
- ❌ 真后端 API — 模拟数据
- ❌ 模板远端同步 — non-goals §3 冲突
- ❌ 拖拽排序模板 — 用户量不够,YAGNI
- ❌ 模板版本 — Iter 5+ Memory 模块时再考虑

## 8. 决策吸收路径

v4 通过后:
1. 更新 [F002 PRD](../../prd/F002-blueprint-editor.md) §6.1 数据契约:
   - Blueprint 表加 `type` (string[]) 字段
   - 新增 `templates` 表(Iter 2 schema)
   - Trigger 字段重定义为 discriminated union(含 interval / every-N-days/weeks)
2. 更新 [F002 PRD](../../prd/F002-blueprint-editor.md) §6.4 UI 字段映射:替换为 v4 截图 / 描述
3. 写 `decision.md` 闭环原型

## 9. 修订记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-28 | v0.1 | 首版,基于 v3 维护者 5 项反馈 + brainstorming skill 完成 5 轮问答 |
