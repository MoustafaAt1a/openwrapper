#!/usr/bin/env node
/**
 * Advanced Deterministic Monorepo Version Orchestrator
 *
 * Synchronizes, validates, and atomically bumps versions across 35 targets:
 * - 1. Core Package Manifests & Contracts (Invariant I8 - 11 targets):
 *      Cargo.toml, package.json, apps/web, sdk/typescript, sdk/php, sdk/dotnet,
 *      OpenAPI YAML/JSON, SDK Contract Vectors, GraphQL Health Resolver & Test
 * - 2. Runtime Code Constants:
 *      apps/web/lib/version.ts, apps/gateway/src/outbound_webhook.rs
 * - 3. SDK Package Documentation & Badges:
 *      sdk/typescript/README.md, sdk/php/README.md, sdk/dotnet/README.md
 * - 4. Environment & Configuration Templates:
 *      .env.example, apps/web/.env.example, sdk/typescript/.env.example,
 *      sdk/php/.env.example, sdk/dotnet/.env.example
 * - 5. Kubernetes & Infrastructure Deployments:
 *      infra/k8s/deployment.yaml
 * - 6. Multi-SDK Checkout Demo Runners & CLIs:
 *      examples/checkout-demo/typescript/package.json, server.js, test-cli.js,
 *      examples/checkout-demo/php/server.php, test-cli.php,
 *      examples/checkout-demo/dotnet/Program.cs,
 *      examples/checkout-demo/public/index.html, app.js
 * - 7. Core Platform Documentation Guides:
 *      README.md, CONTRIBUTING.md, docs/OPERATIONS.md, docs/LIMITATIONS.md,
 *      docs/openapi/README.md
 *
 * Usage:
 *   node scripts/version.mjs check [--json] [--category=<cat>]
 *   node scripts/version.mjs sync [version] [--dry-run]
 *   node scripts/version.mjs bump <major|minor|patch|x.y.z> [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export const CATEGORIES = {
  manifests: "Core Package Manifests & Contracts (Invariant I8)",
  code: "Runtime Code & Gateway Constants",
  sdks: "SDK Documentation & Package Badges",
  env: "Environment Configuration Templates",
  infra: "Kubernetes & Container Deployments",
  demos: "Multi-SDK Checkout Demo Runners",
  docs: "Core Platform Documentation Guides",
}

export const TARGETS = [
  // ===========================================================================
  // 1. CORE MANIFESTS & CONTRACTS (Invariant I8 - 11 Targets)
  // ===========================================================================
  {
    id: "cargo-workspace",
    name: "Cargo Workspace Root",
    file: "Cargo.toml",
    ecosystem: "Rust",
    category: "manifests",
    read(content) {
      const match = content.match(/\[workspace\.package\][\s\S]*?version\s*=\s*"([^"]+)"/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(\[workspace\.package\][\s\S]*?version\s*=\s*")([^"]+)(")/,
        `$1${newVersion}$3`
      )
    },
  },
  {
    id: "root-package-json",
    name: "Monorepo Root",
    file: "package.json",
    ecosystem: "Node/pnpm",
    category: "manifests",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "apps-web-package-json",
    name: "Web Control Plane",
    file: "apps/web/package.json",
    ecosystem: "Next.js",
    category: "manifests",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "sdk-typescript",
    name: "TypeScript SDK",
    file: "sdk/typescript/package.json",
    ecosystem: "npm",
    category: "manifests",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "sdk-php",
    name: "PHP SDK",
    file: "sdk/php/composer.json",
    ecosystem: "Composer",
    category: "manifests",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "sdk-dotnet",
    name: ".NET SDK",
    file: "sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj",
    ecosystem: "NuGet",
    category: "manifests",
    read(content) {
      const match = content.match(/<Version>([^<]+)<\/Version>/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(<Version>)([^<]+)(<\/Version>)/, `$1${newVersion}$3`)
    },
  },
  {
    id: "openapi-yaml",
    name: "OpenAPI Spec (YAML)",
    file: "docs/openapi/openapi.yaml",
    ecosystem: "OpenAPI",
    category: "manifests",
    read(content) {
      const match = content.match(/info:\s*\n\s+title:[^\n]+\n\s+version:\s*([^\n\r]+)/)
      return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null
    },
    write(content, newVersion) {
      return content
        .replace(
          /(info:\s*\n\s+title:[^\n]+\n\s+version:\s*)([^\n\r]+)/,
          `$1${newVersion}`
        )
        .replace(
          /(example:\s*)([0-9]+\.[0-9]+\.[0-9]+)/,
          `$1${newVersion}`
        )
    },
  },
  {
    id: "openapi-json",
    name: "OpenAPI Spec (JSON)",
    file: "docs/openapi/openapi.json",
    ecosystem: "OpenAPI",
    category: "manifests",
    read(content) {
      const match = content.match(/"info":\s*\{[\s\S]*?"version":\s*"([^"]+)"/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(
          /("info":\s*\{[\s\S]*?"version":\s*")([^"]+)(")/,
          `$1${newVersion}$3`
        )
        .replace(
          /("example":\s*")([0-9]+\.[0-9]+\.[0-9]+)(")/,
          `$1${newVersion}$3`
        )
    },
  },
  {
    id: "sdk-vectors",
    name: "SDK Contract Vectors",
    file: "tests/vectors/sdk-contract.json",
    ecosystem: "Vectors",
    category: "manifests",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "graphql-resolvers",
    name: "GraphQL Health Resolver",
    file: "apps/web/lib/graphql/resolvers.ts",
    ecosystem: "GraphQL",
    category: "manifests",
    read(content) {
      const match = content.match(/version:\s*"([^"]+)"/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(version:\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "graphql-test",
    name: "GraphQL Health Test",
    file: "apps/web/test/graphql.test.ts",
    ecosystem: "Test",
    category: "manifests",
    read(content) {
      const match = content.match(/assert\.equal\(health\.version,\s*"([^"]+)"\)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(assert\.equal\(health\.version,\s*")([^"]+)("\))/,
        `$1${newVersion}$3`
      )
    },
  },

  // ===========================================================================
  // 2. RUNTIME CODE & GATEWAY CONSTANTS
  // ===========================================================================
  {
    id: "web-version-ts",
    name: "Web Portal Runtime Version",
    file: "apps/web/lib/version.ts",
    ecosystem: "TypeScript",
    category: "code",
    read(content) {
      const match = content.match(/OPENWRAPPER_VERSION\s*=\s*"([^"]+)"/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(OPENWRAPPER_VERSION\s*=\s*")([^"]+)(")/, `$1${newVersion}$3`)
        .replace(/(OPENWRAPPER_VERSION_TAG\s*=\s*"v)([^" ]+)( LTS")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "gateway-webhook-useragent",
    name: "Gateway Webhook User-Agent",
    file: "apps/gateway/src/outbound_webhook.rs",
    ecosystem: "Rust",
    category: "code",
    read(content) {
      const match = content.match(/OpenWrapper-Webhook\/([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(OpenWrapper-Webhook\/)[0-9]+\.[0-9]+\.[0-9]+/,
        `$1${newVersion}`
      )
    },
  },

  // ===========================================================================
  // 3. SDK DOCUMENTATION & PACKAGE BADGES
  // ===========================================================================
  {
    id: "sdk-ts-readme",
    name: "TypeScript SDK Readme Badge",
    file: "sdk/typescript/README.md",
    ecosystem: "Markdown",
    category: "sdks",
    read(content) {
      const match = content.match(/badge\/version-([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(badge\/version-)[0-9]+\.[0-9]+\.[0-9]+/,
        `$1${newVersion}`
      )
    },
  },
  {
    id: "sdk-php-readme",
    name: "PHP SDK Readme Badge & Parity",
    file: "sdk/php/README.md",
    ecosystem: "Markdown",
    category: "sdks",
    read(content) {
      const match = content.match(/badge\/version-([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(badge\/version-)[0-9]+\.[0-9]+\.[0-9]+/, `$1${newVersion}`)
        .replace(/(Full Platform v)[0-9]+\.[0-9]+\.[0-9]+( Parity)/, `$1${newVersion}$2`)
    },
  },
  {
    id: "sdk-dotnet-readme",
    name: ".NET SDK Readme & Package Reference",
    file: "sdk/dotnet/README.md",
    ecosystem: "Markdown",
    category: "sdks",
    read(content) {
      const match = content.match(/Version \*\*([0-9]+\.[0-9]+\.[0-9]+)\*\*/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(Version \*\*)[0-9]+\.[0-9]+\.[0-9]+(\*\*)/, `$1${newVersion}$2`)
        .replace(/(--version\s+)[0-9]+\.[0-9]+\.[0-9]+/, `$1${newVersion}`)
    },
  },

  // ===========================================================================
  // 4. ENVIRONMENT CONFIGURATION TEMPLATES
  // ===========================================================================
  {
    id: "env-root",
    name: "Platform Config Template (.env.example)",
    file: ".env.example",
    ecosystem: "Config",
    category: "env",
    read(content) {
      const match = content.match(/# Version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s+LTS/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(# Version:\s*)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS)/,
        `$1${newVersion}$2`
      )
    },
  },
  {
    id: "env-web",
    name: "Web Portal Config Template (.env.example)",
    file: "apps/web/.env.example",
    ecosystem: "Config",
    category: "env",
    read(content) {
      const match = content.match(/# Version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s+LTS/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(# Version:\s*)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS)/,
        `$1${newVersion}$2`
      )
    },
  },
  {
    id: "env-sdk-ts",
    name: "TypeScript SDK Config Template",
    file: "sdk/typescript/.env.example",
    ecosystem: "Config",
    category: "env",
    read(content) {
      const match = content.match(/Package: @openwrapper\/sdk v([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(Package: @openwrapper\/sdk v)[0-9]+\.[0-9]+\.[0-9]+/,
        `$1${newVersion}`
      )
    },
  },
  {
    id: "env-sdk-php",
    name: "PHP SDK Config Template",
    file: "sdk/php/.env.example",
    ecosystem: "Config",
    category: "env",
    read(content) {
      const match = content.match(/Package: openwrapper\/sdk v([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(Package: openwrapper\/sdk v)[0-9]+\.[0-9]+\.[0-9]+/,
        `$1${newVersion}`
      )
    },
  },
  {
    id: "env-sdk-dotnet",
    name: ".NET SDK Config Template",
    file: "sdk/dotnet/.env.example",
    ecosystem: "Config",
    category: "env",
    read(content) {
      const match = content.match(/Package: OpenWrapper v([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(Package: OpenWrapper v)[0-9]+\.[0-9]+\.[0-9]+/,
        `$1${newVersion}`
      )
    },
  },

  // ===========================================================================
  // 5. KUBERNETES & CONTAINER DEPLOYMENTS
  // ===========================================================================
  {
    id: "k8s-deployment",
    name: "Kubernetes Manifests (GHCR Images)",
    file: "infra/k8s/deployment.yaml",
    ecosystem: "Kubernetes",
    category: "infra",
    read(content) {
      const match = content.match(/ghcr\.io\/openwrapper\/openwrapper-gateway:([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(ghcr\.io\/openwrapper\/openwrapper-gateway:)[0-9]+\.[0-9]+\.[0-9]+/g, `$1${newVersion}`)
        .replace(/(ghcr\.io\/openwrapper\/openwrapper-web:)[0-9]+\.[0-9]+\.[0-9]+/g, `$1${newVersion}`)
    },
  },

  // ===========================================================================
  // 6. MULTI-SDK CHECKOUT DEMO RUNNERS & CLIS
  // ===========================================================================
  {
    id: "demo-ts-package",
    name: "Checkout Demo (TS Manifest)",
    file: "examples/checkout-demo/typescript/package.json",
    ecosystem: "npm",
    category: "demos",
    read(content) {
      const json = JSON.parse(content)
      return json.version || null
    },
    write(content, newVersion) {
      return content.replace(/("version":\s*")([^"]+)(")/, `$1${newVersion}$3`)
    },
  },
  {
    id: "demo-ts-server",
    name: "Checkout Demo (TS Server)",
    file: "examples/checkout-demo/typescript/server.js",
    ecosystem: "JavaScript",
    category: "demos",
    read(content) {
      const match = content.match(/version:\s*"([0-9]+\.[0-9]+\.[0-9]+)"/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(version:\s*")[0-9]+\.[0-9]+\.[0-9]+(")/, `$1${newVersion}$2`)
    },
  },
  {
    id: "demo-ts-test-cli",
    name: "Checkout Demo (TS Test CLI)",
    file: "examples/checkout-demo/typescript/test-cli.js",
    ecosystem: "JavaScript",
    category: "demos",
    read(content) {
      const match = content.match(/TypeScript SDK \(v([0-9]+\.[0-9]+\.[0-9]+)\)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(TypeScript SDK \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g,
        `$1${newVersion}$2`
      )
    },
  },
  {
    id: "demo-php-server",
    name: "Checkout Demo (PHP Server)",
    file: "examples/checkout-demo/php/server.php",
    ecosystem: "PHP",
    category: "demos",
    read(content) {
      const match = content.match(/'version'\s*=>\s*'([0-9]+\.[0-9]+\.[0-9]+)'/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/('version'\s*=>\s*')[0-9]+\.[0-9]+\.[0-9]+(')/, `$1${newVersion}$2`)
    },
  },
  {
    id: "demo-php-test-cli",
    name: "Checkout Demo (PHP Test CLI)",
    file: "examples/checkout-demo/php/test-cli.php",
    ecosystem: "PHP",
    category: "demos",
    read(content) {
      const match = content.match(/PHP SDK \(v([0-9]+\.[0-9]+\.[0-9]+)\)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(PHP SDK \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
    },
  },
  {
    id: "demo-public-html",
    name: "Checkout Demo (HTML UI)",
    file: "examples/checkout-demo/public/index.html",
    ecosystem: "HTML",
    category: "demos",
    read(content) {
      const match = content.match(/Code Example \(v([0-9]+\.[0-9]+\.[0-9]+)\)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(OpenWrapper SDK v)[0-9]+\.[0-9]+\.[0-9]+/g, `$1${newVersion}`)
        .replace(/(Code Example \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(• v)[0-9]+\.[0-9]+\.[0-9]+/g, `$1${newVersion}`)
    },
  },
  {
    id: "demo-public-app-js",
    name: "Checkout Demo (Client JS)",
    file: "examples/checkout-demo/public/app.js",
    ecosystem: "JavaScript",
    category: "demos",
    read(content) {
      const match = content.match(/@openwrapper\/sdk \(v([0-9]+\.[0-9]+\.[0-9]+)\)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(@openwrapper\/sdk \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(openwrapper\/sdk \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(OpenWrapper \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(OpenWrapper TypeScript SDK \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(OpenWrapper PHP 8\.x SDK \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
        .replace(/(OpenWrapper \.NET 8 \/ C# SDK \(v)[0-9]+\.[0-9]+\.[0-9]+(\))/g, `$1${newVersion}$2`)
    },
  },

  // ===========================================================================
  // 7. CORE PLATFORM DOCUMENTATION GUIDES
  // ===========================================================================
  {
    id: "docs-versioning",
    name: "Versioning Architecture Guide",
    file: "docs/VERSIONING.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/\*\*Version\*\*:\s*`([0-9]+\.[0-9]+\.[0-9]+)\s+LTS`/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(\*\*Version\*\*:\s*`)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS`)/,
        `$1${newVersion}$2`
      )
    },
  },
  {
    id: "readme-root",
    name: "Platform Root Readme",
    file: "README.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/# OpenWrapper v([0-9]+\.[0-9]+\.[0-9]+)\s+LTS/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(# OpenWrapper v)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS)/, `$1${newVersion}$2`)
        .replace(/(what v)[0-9]+\.[0-9]+\.[0-9]+( does not do)/, `$1${newVersion}$2`)
    },
  },
  {
    id: "docs-limitations",
    name: "Platform Limitations Document",
    file: "docs/LIMITATIONS.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/v([0-9]+\.[0-9]+\.[0-9]+) is an experimentally validated foundation/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content
        .replace(/(v)[0-9]+\.[0-9]+\.[0-9]+( is an experimentally validated foundation)/, `$1${newVersion}$2`)
        .replace(/(scope for v)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS)/g, `$1${newVersion}$2`)
        .replace(/(implemented in v)[0-9]+\.[0-9]+\.[0-9]+/g, `$1${newVersion}`)
        .replace(/(out for v)[0-9]+\.[0-9]+\.[0-9]+( regardless)/g, `$1${newVersion}$2`)
    },
  },
  {
    id: "docs-contributing",
    name: "Contributing Guidelines",
    file: "CONTRIBUTING.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/OpenWrapper v([0-9]+\.[0-9]+\.[0-9]+)\s+LTS exists/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(
        /(OpenWrapper v)[0-9]+\.[0-9]+\.[0-9]+(\s+LTS exists)/,
        `$1${newVersion}$2`
      )
    },
  },
  {
    id: "docs-operations",
    name: "Operations & Runbook Specification",
    file: "docs/OPERATIONS.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/`\{"version":\s*"([0-9]+\.[0-9]+\.[0-9]+)"\}`/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(`\{"version":\s*")[0-9]+\.[0-9]+\.[0-9]+("\}`)/, `$1${newVersion}$2`)
    },
  },
  {
    id: "docs-openapi-readme",
    name: "OpenAPI Specification Readme",
    file: "docs/openapi/README.md",
    ecosystem: "Markdown",
    category: "docs",
    read(content) {
      const match = content.match(/Semantic version:\s*([0-9]+\.[0-9]+\.[0-9]+)/)
      return match ? match[1] : null
    },
    write(content, newVersion) {
      return content.replace(/(Semantic version:\s*)[0-9]+\.[0-9]+\.[0-9]+/, `$1${newVersion}`)
    },
  },
]

function getCanonicalVersion() {
  const cargoTarget = TARGETS.find((t) => t.id === "cargo-workspace")
  const content = readFileSync(resolve(ROOT, cargoTarget.file), "utf-8")
  const v = cargoTarget.read(content)
  if (!v) throw new Error("Could not determine canonical version from Cargo.toml")
  return v
}

function parseSemver(v) {
  const match = v.match(SEMVER_REGEX)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  }
}

function bumpVersion(current, type) {
  const parsed = parseSemver(current)
  if (!parsed) throw new Error(`Current version '${current}' is not valid semver`)

  switch (type) {
    case "major":
      return `${parsed.major + 1}.0.0`
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
    default:
      if (SEMVER_REGEX.test(type)) {
        return type
      }
      throw new Error(`Invalid bump type '${type}'. Expected major, minor, patch, or x.y.z`)
  }
}

function checkVersions(options = {}) {
  const canonical = getCanonicalVersion()
  const results = []
  let hasDrift = false
  let canonicalManifestDrift = false

  const filteredTargets = options.category
    ? TARGETS.filter((t) => t.category === options.category)
    : TARGETS

  for (const target of filteredTargets) {
    const fullPath = resolve(ROOT, target.file)
    let version = "N/A"
    try {
      const content = readFileSync(fullPath, "utf-8")
      version = target.read(content) || "MISSING"
    } catch {
      version = "ERROR"
    }

    const isMatch = version === canonical
    if (!isMatch) {
      hasDrift = true
      if (target.category === "manifests") {
        canonicalManifestDrift = true
      }
    }

    results.push({
      ...target,
      resolvedVersion: version,
      isMatch,
    })
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          canonical,
          coherent: !hasDrift,
          total: results.length,
          matched: results.filter((r) => r.isMatch).length,
          drifted: results.filter((r) => !r.isMatch).length,
          results,
        },
        null,
        2
      )
    )
    process.exit(hasDrift ? 1 : 0)
  }

  console.log(`\n🔍 OpenWrapper Monorepo Version Status (Canonical: ${canonical})`)
  console.log("=".repeat(95))

  // Group by category for clear hierarchical presentation
  const grouped = {}
  for (const [catKey, catTitle] of Object.entries(CATEGORIES)) {
    grouped[catKey] = {
      title: catTitle,
      targets: results.filter((r) => r.category === catKey),
    }
  }

  for (const group of Object.values(grouped)) {
    if (group.targets.length === 0) continue
    console.log(`\n📦 ${group.title}`)
    console.log("-".repeat(95))
    console.log(
      ` ${"Target".padEnd(30)} | ${"Ecosystem".padEnd(11)} | ${"File".padEnd(34)} | ${"Version".padEnd(8)} | Status`
    )
    console.log("-".repeat(95))

    for (const target of group.targets) {
      const status = target.isMatch
        ? "\x1b[32mMATCH\x1b[0m"
        : "\x1b[31mDRIFT\x1b[0m"
      console.log(
        ` ${target.name.padEnd(30)} | ${target.ecosystem.padEnd(11)} | ${target.file.padEnd(34)} | ${target.resolvedVersion.padEnd(8)} | ${status}`
      )
    }
  }

  console.log("\n" + "=".repeat(95))
  const matchedCount = results.filter((r) => r.isMatch).length
  const totalCount = results.length

  if (hasDrift) {
    console.error(
      `\n❌ Version drift detected! (${matchedCount}/${totalCount} matched). Run 'node scripts/version.mjs sync' to align all targets to v${canonical}.\n`
    )
    process.exit(1)
  } else {
    console.log(
      `\n✅ All ${totalCount}/${totalCount} manifests, code constants, SDKs, infra, demos & documentation targets are in sync at v${canonical}.\n`
    )
  }
}

function syncVersions(targetVersion = null, options = {}) {
  const versionToApply = targetVersion || getCanonicalVersion()
  console.log(`\n🔄 Synchronizing monorepo targets to v${versionToApply}...`)
  if (options.dryRun) {
    console.log("   (DRY RUN MODE - no files will be written to disk)")
  }

  const filteredTargets = options.category
    ? TARGETS.filter((t) => t.category === options.category)
    : TARGETS

  let updatedCount = 0
  for (const target of filteredTargets) {
    const fullPath = resolve(ROOT, target.file)
    const content = readFileSync(fullPath, "utf-8")
    const currentVersion = target.read(content)
    const updated = target.write(content, versionToApply)

    if (!options.dryRun) {
      writeFileSync(fullPath, updated, "utf-8")
    }

    const changed = currentVersion !== versionToApply
    if (changed) updatedCount++
    const prefix = options.dryRun ? "  [dry-run] " : "  ✓ "
    console.log(`${prefix}${target.name} (${target.file}) [${currentVersion} -> ${versionToApply}]`)
  }

  if (!options.dryRun) {
    updateCargoLock()
  }

  console.log(
    `\n✨ Monorepo successfully synchronized: ${updatedCount} files updated to v${versionToApply}.\n`
  )
}

function doBump(bumpType, options = {}) {
  const current = getCanonicalVersion()
  const next = bumpVersion(current, bumpType)
  console.log(`\n🚀 Bumping OpenWrapper monorepo version: ${current} -> ${next} (${bumpType})`)
  syncVersions(next, options)
}

function updateCargoLock() {
  try {
    console.log("  ⏳ Updating Cargo.lock...")
    execSync("cargo check -p openwrapper-core --quiet", { cwd: ROOT, stdio: "ignore" })
    console.log("  ✓ Cargo.lock updated.")
  } catch {
    // cargo may not be installed in all environments (e.g. node-only CI)
  }
}

// =============================================================================
// CLI Command Dispatcher
// =============================================================================
const args = process.argv.slice(2)
const command = args[0] || "check"
const isDryRun = args.includes("--dry-run")
const isJson = args.includes("--json")
const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1]
const options = { dryRun: isDryRun, json: isJson, category: categoryArg }

switch (command) {
  case "check":
  case "status":
    checkVersions(options)
    break
  case "sync": {
    const targetVersion = args[1] && !args[1].startsWith("--") ? args[1] : null
    syncVersions(targetVersion, options)
    break
  }
  case "bump": {
    const bumpType = args[1]
    if (!bumpType || bumpType.startsWith("--")) {
      console.error("Usage: node scripts/version.mjs bump <major|minor|patch|x.y.z> [--dry-run]")
      process.exit(1)
    }
    doBump(bumpType, options)
    break
  }
  default:
    console.error(`Unknown command: ${command}`)
    console.error("Available commands:")
    console.error("  node scripts/version.mjs check [--json] [--category=<cat>]")
    console.error("  node scripts/version.mjs sync [version] [--dry-run]")
    console.error("  node scripts/version.mjs bump <major|minor|patch|x.y.z> [--dry-run]")
    process.exit(1)
}
