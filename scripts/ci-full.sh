#!/usr/bin/env bash
# Run the full OpenWrapper CI suite locally (mirrors .github/workflows/ci.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Rust: format check"
cargo fmt --all -- --check

echo "==> Rust: clippy"
cargo clippy --workspace --all-targets -- -D warnings

echo "==> Rust: workspace tests"
cargo test --workspace --jobs 2

echo "==> Rust: architecture invariants"
cargo test -p openwrapper-test-architecture

echo "==> TypeScript SDK"
(
  cd sdk/typescript
  npm ci
  npm test
)

echo "==> PHP SDK"
php sdk/php/tests/run.php

echo "==> Web: install"
(
  cd web
  pnpm install --frozen-lockfile
)

echo "==> Web: typecheck"
(
  cd web
  pnpm lint
)

echo "==> Web: tests"
(
  cd web
  pnpm test
)

echo "==> Web: build"
(
  cd web
  NEXT_TELEMETRY_DISABLED=1 \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/openwrapper \
  BETTER_AUTH_SECRET=test_ci_secret_32_characters_long_key_openwrapper \
  pnpm build
)

echo "==> OpenAPI lint"
npx --yes @redocly/cli lint openapi.yaml

if [[ "${RUN_LIVE_API_TESTS:-0}" == "1" ]]; then
  echo "==> Live API tests"
  bash scripts/test-live-api.sh
fi

echo ""
echo "All CI checks passed."
