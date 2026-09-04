#!/usr/bin/env node
/**
 * Deterministic Monorepo Version Orchestrator
 *
 * Synchronizes and validates versions across 11 manifests & contract files in:
 * - Rust / Cargo workspace (Cargo.toml, Cargo.lock)
 * - JavaScript / TypeScript / Bun (package.json, apps/web, sdk/typescript)
 * - PHP / Composer (sdk/php/composer.json)
 * - .NET / NuGet (sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj)
 * - OpenAPI specs (docs/openapi/openapi.yaml, docs/openapi/openapi.json)
 * - Test contracts (tests/vectors/sdk-contract.json)
 * - Web GraphQL resolvers & tests (apps/web/lib/graphql/resolvers.ts, apps/web/test/graphql.test.ts)
 *
 * Usage:
 *   node scripts/version.mjs check
 *   node scripts/version.mjs sync
 *   node scripts/version.mjs bump <major|minor|patch|semver>
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// Target definitions specifying how to extract and update versions in each file
const TARGETS = [
  {
    id: "cargo-workspace",
    name: "Cargo Workspace Root",
    file: "Cargo.toml",
    ecosystem: "Rust",
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
    ecosystem: "Bun/Node",
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

function checkVersions() {
  const canonical = getCanonicalVersion()
  console.log(`\n🔍 OpenWrapper Monorepo Version Status (Canonical: ${canonical})`)
  console.log("=".repeat(85))
  console.log(
    ` ${"Target".padEnd(25)} | ${"Ecosystem".padEnd(10)} | ${"File".padEnd(30)} | ${"Version".padEnd(8)} | Status`
  )
  console.log("-".repeat(85))

  let hasDrift = false
  for (const target of TARGETS) {
    const fullPath = resolve(ROOT, target.file)
    let version = "N/A"
    try {
      const content = readFileSync(fullPath, "utf-8")
      version = target.read(content) || "MISSING"
    } catch (err) {
      version = "ERROR"
    }

    const isMatch = version === canonical
    if (!isMatch) hasDrift = true

    const status = isMatch ? "\x1b[32mMATCH\x1b[0m" : "\x1b[31mDRIFT\x1b[0m"
    console.log(
      ` ${target.name.padEnd(25)} | ${target.ecosystem.padEnd(10)} | ${target.file.padEnd(30)} | ${version.padEnd(8)} | ${status}`
    )
  }
  console.log("=".repeat(85))

  if (hasDrift) {
    console.error(`\n❌ Version drift detected! Run 'node scripts/version.mjs sync' to align all targets to v${canonical}.\n`)
    process.exit(1)
  } else {
    console.log(`\n✅ All 11 package manifests and contract targets are in sync at v${canonical}.\n`)
  }
}

function syncVersions(targetVersion = null) {
  const versionToApply = targetVersion || getCanonicalVersion()
  console.log(`\n🔄 Synchronizing all manifests to v${versionToApply}...`)

  for (const target of TARGETS) {
    const fullPath = resolve(ROOT, target.file)
    const content = readFileSync(fullPath, "utf-8")
    const updated = target.write(content, versionToApply)
    writeFileSync(fullPath, updated, "utf-8")
    console.log(`  ✓ Updated ${target.name} (${target.file})`)
  }

  updateCargoLock()
  console.log(`\n✨ Monorepo successfully synchronized to v${versionToApply}.\n`)
}

function doBump(bumpType) {
  const current = getCanonicalVersion()
  const next = bumpVersion(current, bumpType)
  console.log(`\n🚀 Bumping version: ${current} -> ${next} (${bumpType})`)
  syncVersions(next)
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

// CLI Command Dispatcher
const command = process.argv[2] || "check"
const arg = process.argv[3]

switch (command) {
  case "check":
  case "status":
    checkVersions()
    break
  case "sync":
    syncVersions(arg)
    break
  case "bump":
    if (!arg) {
      console.error("Usage: node scripts/version.mjs bump <major|minor|patch|x.y.z>")
      process.exit(1)
    }
    doBump(arg)
    break
  default:
    console.error(`Unknown command: ${command}`)
    console.error("Available commands: check, sync, bump <type>")
    process.exit(1)
}
