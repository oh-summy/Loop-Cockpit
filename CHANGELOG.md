# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 项目立项与基础文档骨架
- 中英双语 README
- AGENTS.md（开发期 AI 协作规则总章）+ CLAUDE.md（跳板）
- docs/ 全部正式文档骨架：
  - product/{whitepaper, prd, non-goals, glossary, roadmap}.md（v0.1 草案）
  - design/{ux-flow, ui-spec, assets}.md（占位）
  - architecture/{overview, data-model, modules/, adr/}.md（占位 + 索引）
  - runtime/agent-contract.md（运行时契约草案）
- spike/ 与 notes/ 目录骨架
- .github/ Issue / PR / CI 模板
- .gitignore + .editorconfig
- spike/pty PTY 尖刀跑通:00/01/02 全绿,验证 node-pty + claude 在 macOS x86_64 可行(拉起/捕获/收发 prompt/exit code)

### Notes

- Iteration 1（Foundation）启动
- License: MIT
- 关键技术验证（PTY 尖刀）已完成:node-pty + claude 在 macOS x86_64 跑通(2026-06-26);Linux/Windows 留待 Iter 2
