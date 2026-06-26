# spike/pty 实战笔记

> 时间倒序记录。最新在上。每条笔记包含：现象 / 假设 / 验证 / 结论。

---

## 2026-06-26 · 工程骨架预备

**现象**：未开始。仅准备好目录结构与文件清单。

**预备清单**（开干前打勾）：

- [ ] `which claude` 能找到 claude CLI（路径记到本文件）
- [ ] `node --version` ≥ 18 LTS
- [ ] `pnpm --version` 有
- [ ] 系统装了 `make` / `g++`（node-pty 可能要源码编译）：`which make g++`
- [ ] `python3` 在 PATH 里（node-gyp 要）

**机器档案**（开干时填）：

```
OS:                <uname -a>
Node:              <node --version>
pnpm:              <pnpm --version>
claude CLI 路径:   <which claude>
claude 版本:       <claude --version>
```

---

## 模板（每条笔记照抄）

```markdown
## YYYY-MM-DD HH:MM · <小标题>

- **现象**：…
- **假设**：…
- **验证**：跑了什么、看到什么
- **结论**：解决 / 绕过 / 留着 / 升级到 README 结论
```
