#!/usr/bin/env bash
# Run security + stress tests against a live OpenWrapper stack (local compose or Railway).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET_URL="${TARGET_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-ow_test_key_change_me}"
STRESS_VUS="${STRESS_VUS:-10}"
STRESS_DURATION="${STRESS_DURATION:-20s}"

echo "==> Live API security tests → ${TARGET_URL}"
TARGET_URL="$TARGET_URL" API_KEY="$API_KEY" node tests/security/security-test.mjs

if command -v k6 >/dev/null 2>&1; then
  echo "==> Live API stress tests (k6)"
  TARGET_URL="$TARGET_URL" API_KEY="$API_KEY" k6 run \
    --vus "$STRESS_VUS" --duration "$STRESS_DURATION" \
    tests/load/stress-test.js
else
  echo "==> k6 not installed — skipping stress tests"
fi

echo ""
echo "Live API tests passed."
