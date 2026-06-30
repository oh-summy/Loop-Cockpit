#!/usr/bin/env bash
# stop.sh — 停止 Loop Cockpit（后端 + 前端）
set -euo pipefail

KILLED=0
if pgrep -f "tsx apps/host/src/index" >/dev/null 2>&1; then
  pkill -f "tsx apps/host/src/index" || true
  KILLED=$((KILLED + 1))
  echo "[stop] 后端已停"
fi
if pgrep -f "vite.*--port 5173" >/dev/null 2>&1; then
  pkill -f "vite.*--port 5173" || true
  KILLED=$((KILLED + 1))
  echo "[stop] 前端已停"
fi
if [ "$KILLED" = "0" ]; then
  echo "[stop] 没有正在跑的 Loop Cockpit 进程"
fi
