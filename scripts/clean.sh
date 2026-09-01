#!/usr/bin/env bash
# Remove build artifacts only — never .env or databases.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> cargo clean"
cargo clean

echo "==> web artifacts"
rm -rf web/.next web/node_modules

echo "==> SDK artifacts"
rm -rf sdk/typescript/dist sdk/typescript/node_modules

echo "==> tsbuildinfo"
find . -name '*.tsbuildinfo' -not -path './node_modules/*' -delete 2>/dev/null || true

echo "Clean complete. Run scripts/ci-full.sh to verify."
