#!/usr/bin/env bash
# Run security + stress tests against a live OpenWrapper stack (local compose or Railway).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${REQUIRE_LIVE_API_SECRETS:-0}" == "1" ]]; then
  : "${TARGET_URL:?LIVE_API_TARGET_URL secret is required}"
  : "${API_KEY:?LIVE_API_KEY secret is required}"
  if [[ "${TARGET_URL}" != https://* ]]; then
    echo "TARGET_URL must use HTTPS for remote live tests" >&2
    exit 2
  fi
fi

TARGET_URL="${TARGET_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-ow_test_key_change_me}"
# Optional — enable Paymob/Stripe in k6 payment rotation and PROV-06/07 security tests:
# PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_HMAC_SECRET, PAYMOB_INTEGRATION_ID
# STRIPE_SECRET_KEY (use sk_test_... for sandbox)

echo "==> Live API security tests → ${TARGET_URL}"
TARGET_URL="$TARGET_URL" API_KEY="$API_KEY" node tests/security/security-test.mjs

if command -v k6 >/dev/null 2>&1; then
  echo "==> Live API stress tests (k6)"
  TARGET_URL="$TARGET_URL" API_KEY="$API_KEY" k6 run tests/load/stress-test.js
else
  echo "==> k6 not installed — skipping stress tests"
fi

echo ""
echo "Live API tests passed."
