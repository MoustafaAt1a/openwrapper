# OpenWrapper Versioning System
**Version**: `0.2.7 LTS`

This document outlines the versioning architecture, synchronization mechanics, and release policies across the OpenWrapper monorepo.

---

## 1. Multi-Ecosystem Monorepo Challenge

OpenWrapper spans five distinct language ecosystems and package managers:
- **Rust / Cargo**: Core engine, payment provider adapters (`paymob`, `fawry`, `stripe`), and HTTP/gRPC gateway.
- **TypeScript / Node / pnpm**: Monorepo root, Next.js Web Control Plane (`apps/web`), and official TypeScript SDK (`sdk/typescript`).
- **PHP / Composer**: Official PHP 8.1+ SDK (`sdk/php`).
- **.NET / NuGet**: Official .NET 8 / C# SDK (`sdk/dotnet`).
- **OpenAPI & Test Vectors**: REST API definitions (`docs/openapi/openapi.yaml`, `docs/openapi/openapi.json`) and cross-SDK contract test vectors (`tests/vectors/sdk-contract.json`).

Historically, releasing or bumping a version across heterogeneous manifests was error-prone, leading to package version drift (e.g. NuGet or Composer falling behind Cargo). OpenWrapper uses a centralized, deterministic version orchestrator (`scripts/version.mjs`) that synchronizes, validates, and atomically bumps 35 targets across 7 categories in a single atomic step.

---

## 2. Manifest & Monorepo Target Registry

`scripts/version.mjs` tracks and synchronizes 35 targets grouped into 7 categories:

### 2.1. Core Package Manifests & Contracts (Invariant I8 - 11 Targets)
| # | Target Name | Ecosystem | Manifest Path | Version Location |
|---|-------------|-----------|---------------|------------------|
| 1 | **Cargo Workspace Root** *(Canonical Source)* | Rust | `Cargo.toml` | `[workspace.package].version` |
| 2 | **Monorepo Root** | pnpm/Node | `package.json` | `version` |
| 3 | **Web Control Plane** | Next.js | `apps/web/package.json` | `version` |
| 4 | **TypeScript SDK** | npm | `sdk/typescript/package.json` | `version` |
| 5 | **PHP SDK** | Composer | `sdk/php/composer.json` | `version` |
| 6 | **.NET SDK** | NuGet | `sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj` | `<Version>` |
| 7 | **OpenAPI Spec (YAML)** | OpenAPI | `docs/openapi/openapi.yaml` | `info.version` |
| 8 | **OpenAPI Spec (JSON)** | OpenAPI | `docs/openapi/openapi.json` | `info.version` |
| 9 | **SDK Contract Vectors** | Vectors | `tests/vectors/sdk-contract.json` | `version` |
| 10 | **GraphQL Health Resolver** | GraphQL | `apps/web/lib/graphql/resolvers.ts` | `health.version` |
| 11 | **GraphQL Health Test** | Test | `apps/web/test/graphql.test.ts` | `health.version` assertion |

### 2.2. Extended Targets (24 Targets)
- **Runtime Code Constants**: `apps/web/lib/version.ts`, `apps/gateway/src/outbound_webhook.rs`
- **SDK Documentation & Badges**: `sdk/typescript/README.md`, `sdk/php/README.md`, `sdk/dotnet/README.md`
- **Environment Templates**: `.env.example`, `apps/web/.env.example`, `sdk/typescript/.env.example`, `sdk/php/.env.example`, `sdk/dotnet/.env.example`
- **Kubernetes & Container Deployments**: `infra/k8s/deployment.yaml` (gateway & web GHCR image tags)
- **Multi-SDK Checkout Demos**: `examples/checkout-demo/typescript/package.json`, `server.js`, `test-cli.js`, `php/server.php`, `php/test-cli.php`, `public/index.html`, `public/app.js`
- **Platform Documentation Guides**: `docs/VERSIONING.md`, `README.md`, `docs/LIMITATIONS.md`, `CONTRIBUTING.md`, `docs/OPERATIONS.md`, `docs/openapi/README.md`

---

## 3. Versioning CLI Commands

The versioning tool is executable via `node` or `pnpm`:

### 3.1. Verification / Status Check (`check`)
Validates that every manifest, code constant, SDK, and documentation file is strictly aligned with the canonical version in `Cargo.toml`. Returns exit code `0` on match, and `1` on drift.

```bash
node scripts/version.mjs check
# Or via pnpm script:
pnpm run version:check

# Machine-readable JSON output for CI / monitoring:
node scripts/version.mjs check --json

# Verify a specific category:
node scripts/version.mjs check --category=manifests
```

### 3.2. Synchronization (`sync`)
Takes the canonical version from `Cargo.toml` (or an explicit target argument) and updates all other 34 targets to match:

```bash
# Sync all targets:
pnpm run version:sync

# Dry-run preview without modifying files on disk:
node scripts/version.mjs sync --dry-run
```

### 3.3. Semantic Version Bump (`bump`)
Bumps the version according to Semantic Versioning 2.0.0 rules, updating all 35 targets and `Cargo.lock`:

```bash
# Bump patch: 0.2.7 -> 0.2.8
pnpm run version:bump patch

# Bump minor: 0.2.7 -> 0.3.0
pnpm run version:bump minor

# Bump major: 0.2.7 -> 1.0.0
pnpm run version:bump major

# Explicit target semver:
pnpm run version:bump 0.3.0-rc.1

# Preview bump with dry run:
node scripts/version.mjs bump minor --dry-run
```

---

## 4. Semantic Versioning Policy (SemVer 2.0.0)

OpenWrapper adheres strictly to [SemVer 2.0.0](https://semver.org/):

- **MAJOR version (`X.y.z`)**: Incompatible API breaking changes:
  - Removal or renaming of core wire types (`Payment`, `PaymentStatus`, `Money`).
  - Breaking changes to provider adapter contracts (`Provider` trait).
  - Removing supported HTTP or gRPC endpoints.
- **MINOR version (`x.Y.z`)**: Backward-compatible functionality additions:
  - Adding a new payment provider adapter (e.g. `openwrapper-provider-stripe`).
  - Adding new optional request fields or query capabilities.
  - Adding new SDK helper methods.
- **PATCH version (`x.y.Z`)**: Backward-compatible bug fixes and internal hardening:
  - Defensive parsing improvements.
  - Mathematical precision or jitter tuning.
  - Documentation and test coverage improvements.

---

## 5. CI / CD Release Enforcement

To ensure that no release or pull request introduces version discrepancies:
1. `scripts/ci-full.sh` runs `node scripts/version.mjs check` before running any test suites or package builds.
2. If any manifest has drifted, CI terminates immediately with exit code `1`, preventing inadvertent partial releases.
