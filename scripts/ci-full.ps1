# Run the full OpenWrapper CI suite locally (mirrors .github/workflows/ci.yml).
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "==> Rust: format check"
cargo fmt --all -- --check

Write-Host "==> Rust: clippy"
cargo clippy --workspace --all-targets -- -D warnings

Write-Host "==> Rust: workspace tests"
cargo test --workspace --jobs 2

Write-Host "==> Rust: architecture invariants"
cargo test -p openwrapper-test-architecture

Write-Host "==> Biome: monorepo check"
bunx @biomejs/biome check .

Write-Host "==> TypeScript SDK"
Push-Location sdk/typescript
try {
  bun run build
  bun test test/client.test.mjs
} finally {
  Pop-Location
}

Write-Host "==> PHP SDK"
php sdk/php/tests/run.php

Write-Host "==> .NET SDK"
dotnet test sdk/dotnet/OpenWrapper.sln

Write-Host "==> Web: install"
Push-Location apps/web
try {
  bun install

  Write-Host "==> Web: typecheck"
  bun run lint

  Write-Host "==> Web: tests"
  bun run test

  Write-Host "==> Web: build"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/openwrapper"
  $env:BETTER_AUTH_SECRET = "test_ci_secret_32_characters_long_key_openwrapper"
  bun run build
} finally {
  Pop-Location
}

Write-Host "==> OpenAPI lint"
bunx @redocly/cli@2.49.0 lint docs/openapi/openapi.yaml


Write-Host ""
Write-Host "All CI checks passed."
