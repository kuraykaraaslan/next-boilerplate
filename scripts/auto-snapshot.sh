#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

OUT="public/registry/registry.json"
SRC_DIRS=(modules modules_next app/internal/api app/tenant)

if [ -f "$OUT" ] && [ -z "$(find "${SRC_DIRS[@]}" -newer "$OUT" -type f \( -name '*.ts' -o -name '*.tsx' -o -name 'module.json' \) -print -quit 2>/dev/null)" ]; then
  exit 0
fi

npm run registry:snapshot --silent
