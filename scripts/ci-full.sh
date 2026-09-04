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

echo "==> Biome: monorepo check"
bunx @biomejs/biome check .

echo "==> TypeScript SDK"
(
  cd sdk/typescript
  bun run build
  bun test test/client.test.mjs
)

echo "==> PHP SDK"
php sdk/php/tests/run.php

echo "==> .NET SDK"
dotnet test sdk/dotnet/OpenWrapper.sln

echo "==> Web: install"
(
  cd apps/web
  bun install
)

echo "==> Web: typecheck"
(
  cd apps/web
  bun run lint
)

echo "==> Web: tests"
(
  cd apps/web
  bun run test
)

echo "==> Web: build"
(
  cd apps/web
  NEXT_TELEMETRY_DISABLED=1 \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/openwrapper \
  BETTER_AUTH_SECRET=test_ci_secret_32_characters_long_key_openwrapper \
  bun run build
)

echo "==> OpenAPI lint"
bunx @redocly/cli@2.49.0 lint openapi.yaml

if ! cmp --silent openapi.yaml docs/openapi/openapi.yaml; then
  echo "docs/openapi/openapi.yaml is not synchronized with openapi.yaml" >&2
  exit 1
fi

if [[ "${RUN_LIVE_API_TESTS:-0}" == "1" ]]; then
  echo "==> Live API tests"
  bash scripts/test-live-api.sh
fi

echo ""
echo "All CI checks passed."
