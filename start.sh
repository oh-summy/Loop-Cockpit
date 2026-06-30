#!/usr/bin/env bash
# start.sh — 一键启动 Loop Cockpit（后端 + 前端，dev 模式）
# 用法：
#   bash start.sh           # 真跑 claude（需要 claude CLI 在 PATH）
#   bash start.sh --mock    # 用 mock claude，不花钱
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MOCK=""
if [ "${1:-}" = "--mock" ]; then
  MOCK="MOCK_CLAUDE=1"
  echo "[start] MOCK_CLAUDE=1 (假 agent，不调真 claude)"
fi

# 1. 确保 node-pty native binding 在
if [ ! -f apps/host/node_modules/node-pty/build/Release/pty.node ]; then
  echo "[start] node-pty native binding 缺失，跑 postinstall.sh..."
  bash postinstall.sh
fi

# 2. 清理可能残留的进程
pkill -f "tsx apps/host/src/index" 2>/dev/null || true
pkill -f "vite.*--port 5173" 2>/dev/null || true
sleep 1

mkdir -p .loop-cockpit-logs

# 3. 启动后端
echo "[start] 后端 → http://localhost:3000"
eval "$MOCK nohup npx tsx apps/host/src/index.ts > .loop-cockpit-logs/host.log 2>&1 &"
HOST_PID=$!

# 4. 等后端 ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s --noproxy '*' -m 1 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "[start] 后端 ready (PID $HOST_PID)"
    break
  fi
  sleep 1
done

# 5. 启动前端
echo "[start] 前端 → http://localhost:5173"
cd apps/web
nohup ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 > ../../.loop-cockpit-logs/web.log 2>&1 &
WEB_PID=$!
cd "$ROOT"

sleep 2
echo ""
echo "=========================================="
echo "  Loop Cockpit running"
echo "  ----------"
echo "  浏览器打开:  http://localhost:5173"
echo "  后端 API:    http://localhost:3000"
echo "  后端日志:    .loop-cockpit-logs/host.log"
echo "  前端日志:    .loop-cockpit-logs/web.log"
echo "  停止:        bash stop.sh"
echo "=========================================="
