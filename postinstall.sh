#!/usr/bin/env bash
# postinstall.sh — ensure node-pty native binding is built + spawn-helper +x
# ADR-0002 Pit 2: node-pty's prebuild.js may exit 0 without producing a binding
# on some platforms (e.g. macOS x64 with a stale prebuild match). Fall back to
# node-gyp rebuild so `pnpm install` yields a working PTY without manual steps.
set -euo pipefail

# 1. node-pty native binding — build if missing.
PTY_DIRS=$(find . -path '*/node-pty/package.json' -not -path '*/node_modules/.pnpm/*/node_modules/node-pty/*' 2>/dev/null | sed 's|/package.json||' | head -5 || true)
for PTY_DIR in $PTY_DIRS; do
  if [ -d "$PTY_DIR" ] && [ ! -f "$PTY_DIR/build/Release/pty.node" ]; then
    echo "[postinstall] node-pty native binding missing at $PTY_DIR, running node-gyp rebuild..."
    if command -v node-gyp >/dev/null 2>&1; then
      (cd "$PTY_DIR" && node-gyp rebuild)
    else
      (cd "$PTY_DIR" && npx --no-install node-gyp rebuild)
    fi
  fi
done

# 2. spawn-helper execute permission (ADR-0002 Pit 2) — both prebuilt and compiled.
find . -path '*/node-pty/*' -name 'spawn-helper' -type f 2>/dev/null | while read -r f; do
  chmod +x "$f"
done
