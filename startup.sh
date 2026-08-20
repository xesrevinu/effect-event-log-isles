#!/bin/sh
set -eu
# Project root = directory containing this script.
# Works in Grok App Builder (/workspace), project-agent mounts
# (/home/workdir/artifacts), and local git clones.
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
