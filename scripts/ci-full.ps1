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

Write-Host "==> TypeScript SDK"
Push-Location sdk/typescript
try {
  npm ci
  npm test
} finally {
  Pop-Location
}

Write-Host "==> PHP SDK"
php sdk/php/tests/run.php

Write-Host "==> .NET SDK"
dotnet test sdk/dotnet/OpenWrapper.sln

Write-Host "==> Web: install"
Push-Location web
try {
  pnpm install --frozen-lockfile

  Write-Host "==> Web: typecheck"
  pnpm lint

  Write-Host "==> Web: tests"
  pnpm test

  Write-Host "==> Web: build"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/openwrapper"
  $env:BETTER_AUTH_SECRET = "test_ci_secret_32_characters_long_key_openwrapper"
  pnpm build
} finally {
  Pop-Location
}

Write-Host "==> OpenAPI lint"
npx --yes @redocly/cli@2.49.0 lint openapi.yaml

$CanonicalOpenApiHash = (Get-FileHash openapi.yaml -Algorithm SHA256).Hash
$PublishedOpenApiHash = (Get-FileHash docs/openapi/openapi.yaml -Algorithm SHA256).Hash
if ($CanonicalOpenApiHash -ne $PublishedOpenApiHash) {
  throw "docs/openapi/openapi.yaml is not synchronized with openapi.yaml"
}

Write-Host ""
Write-Host "All CI checks passed."
