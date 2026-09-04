# OpenWrapper Versioning System

This document outlines the versioning architecture, synchronization mechanics, and release policies across the OpenWrapper monorepo.

---

## 1. Multi-Ecosystem Monorepo Challenge

OpenWrapper spans five distinct language ecosystems and package managers:
- **Rust / Cargo**: Core engine, payment provider adapters (`paymob`, `fawry`, `stripe`), and HTTP/gRPC gateway.
- **TypeScript / Node / Bun**: Monorepo root, Next.js Web Control Plane (`apps/web`), and official TypeScript SDK (`sdk/typescript`).
- **PHP / Composer**: Official PHP 8.1+ SDK (`sdk/php`).
- **.NET / NuGet**: Official .NET 8 / C# SDK (`sdk/dotnet`).
- **OpenAPI & Test Vectors**: REST API definitions (`docs/openapi/openapi.yaml`, `docs/openapi/openapi.json`) and cross-SDK contract test vectors (`tests/vectors/sdk-contract.json`).

Historically, releasing or bumping a version across heterogeneous manifests was error-prone, leading to package version drift (e.g. NuGet or Composer falling behind Cargo). OpenWrapper uses a centralized, deterministic version orchestrator (`scripts/version.mjs`) that synchronizes and validates all 11 targets in a single atomic step.

---

## 2. Manifest & Contract Registry

The 11 targets tracked and synchronized by `scripts/version.mjs` are:

| # | Target Name | Ecosystem | Manifest Path | Version Location |
|---|-------------|-----------|---------------|------------------|
| 1 | **Cargo Workspace Root** *(Canonical Source)* | Rust | `Cargo.toml` | `[workspace.package].version` |
| 2 | **Monorepo Root** | Bun/Node | `package.json` | `version` |
| 3 | **Web Control Plane** | Next.js | `apps/web/package.json` | `version` |
| 4 | **TypeScript SDK** | npm | `sdk/typescript/package.json` | `version` |
| 5 | **PHP SDK** | Composer | `sdk/php/composer.json` | `version` |
| 6 | **.NET SDK** | NuGet | `sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj` | `<Version>` |
| 7 | **OpenAPI Spec (YAML)** | OpenAPI | `docs/openapi/openapi.yaml` | `info.version` |
| 8 | **OpenAPI Spec (JSON)** | OpenAPI | `docs/openapi/openapi.json` | `info.version` |
| 9 | **SDK Contract Vectors** | Vectors | `tests/vectors/sdk-contract.json` | `version` |
| 10 | **GraphQL Health Resolver** | GraphQL | `apps/web/lib/graphql/resolvers.ts` | `health.version` |
| 11 | **GraphQL Health Test** | Test | `apps/web/test/graphql.test.ts` | `health.version` assertion |

---

## 3. Versioning CLI Commands

The versioning tool is executable via `node` or `bun`:

### 3.1. Verification / Status Check (`check`)
Validates that every manifest and test contract is strictly aligned with the canonical version in `Cargo.toml`. Returns exit code `0` on match, and `1` on drift.

```bash
node scripts/version.mjs check
# Or via npm/bun script:
bun run version:check
```

Example output:
```
🔍 OpenWrapper Monorepo Version Status (Canonical: 0.1.3)
=====================================================================================
 Target                    | Ecosystem  | File                           | Version  | Status
-------------------------------------------------------------------------------------
 Cargo Workspace Root      | Rust       | Cargo.toml                     | 0.1.3    | MATCH
 Monorepo Root             | Bun/Node   | package.json                   | 0.1.3    | MATCH
 Web Control Plane         | Next.js    | apps/web/package.json          | 0.1.3    | MATCH
 TypeScript SDK            | npm        | sdk/typescript/package.json    | 0.1.3    | MATCH
 PHP SDK                   | Composer   | sdk/php/composer.json          | 0.1.3    | MATCH
 .NET SDK                  | NuGet      | sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj | 0.1.3    | MATCH
 OpenAPI Spec (YAML)       | OpenAPI    | docs/openapi/openapi.yaml      | 0.1.3    | MATCH
 OpenAPI Spec (JSON)       | OpenAPI    | docs/openapi/openapi.json      | 0.1.3    | MATCH
 SDK Contract Vectors      | Vectors    | tests/vectors/sdk-contract.json | 0.1.3    | MATCH
 GraphQL Health Resolver   | GraphQL    | apps/web/lib/graphql/resolvers.ts | 0.1.3    | MATCH
 GraphQL Health Test       | Test       | apps/web/test/graphql.test.ts  | 0.1.3    | MATCH
=====================================================================================

✅ All 11 package manifests and contract targets are in sync at v0.1.3.
```

### 3.2. Synchronization (`sync`)
Takes the canonical version from `Cargo.toml` (or an explicit target argument) and updates all other 10 targets to match:

```bash
bun run version:sync
```

### 3.3. Semantic Version Bump (`bump`)
Bumps the version according to Semantic Versioning 2.0.0 rules, updating all 11 targets and `Cargo.lock`:

```bash
# Bump patch: 0.1.3 -> 0.1.4
bun run version:bump patch

# Bump minor: 0.1.3 -> 0.2.0
bun run version:bump minor

# Bump major: 0.1.3 -> 1.0.0
bun run version:bump major

# Explicit target semver:
bun run version:bump 0.1.4-rc.1
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
