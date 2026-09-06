/**
 * Utilities for normalizing and formatting code snippets and JSON across OpenWrapper.
 */

export function normalizeLanguage(lang?: string): string {
  if (!lang) return "typescript"
  const l = lang.toLowerCase().trim()
  if (l === "ts" || l === "typescript" || l === "tsx") return "typescript"
  if (l === "js" || l === "javascript" || l === "jsx") return "javascript"
  if (l === "cs" || l === "csharp" || l === "dotnet" || l === ".net" || l === "c#") return "csharp"
  if (l === "php") return "php"
  if (l === "json") return "json"
  if (
    l === "bash" ||
    l === "sh" ||
    l === "shell" ||
    l === "zsh" ||
    l === "curl" ||
    l === "terminal" ||
    l === "console"
  ) {
    return "bash"
  }
  if (l === "sql") return "sql"
  return "typescript"
}

export function safeFormatJson(val: unknown, indent = 2): string {
  if (val === undefined || val === null) {
    return val === null ? "null" : ""
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (!trimmed) return ""
    try {
      const parsed = JSON.parse(trimmed)
      return JSON.stringify(
        parsed,
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        indent,
      )
    } catch {
      return val
    }
  }
  try {
    return JSON.stringify(
      val,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      indent,
    )
  } catch {
    return String(val)
  }
}

export function safeCompactJson(val: unknown): string {
  if (val === undefined || val === null) {
    return val === null ? "null" : ""
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (!trimmed) return ""
    try {
      const parsed = JSON.parse(trimmed)
      return JSON.stringify(parsed, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      )
    } catch {
      return trimmed.replace(/\s+/g, " ")
    }
  }
  try {
    return JSON.stringify(val, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    )
  } catch {
    return String(val)
  }
}

export function formatJsonByteSize(str: string): string {
  if (!str) return "0 B"
  const bytes =
    typeof Blob !== "undefined"
      ? new Blob([str]).size
      : typeof Buffer !== "undefined"
        ? Buffer.byteLength(str, "utf8")
        : str.length
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function stripIndent(str: string): string {
  const lines = str.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n")
  const minIndent = lines.reduce((acc, line) => {
    if (line.trim().length === 0) return acc
    const indent = line.match(/^\s*/)?.[0].length ?? 0
    return Math.min(acc, indent)
  }, Infinity)
  if (!Number.isFinite(minIndent) || minIndent === 0) return lines.join("\n")
  return lines.map((l) => l.slice(minIndent)).join("\n")
}

export function generateCurlSnippet(
  endpoint: string,
  method = "POST",
  apiKey = "ow_test_sandbox_secret_key",
  payload?: Record<string, unknown>,
): string {
  const isGet = method.toUpperCase() === "GET"
  const baseUrl = "https://gateway.openwrapper.muejam.com"
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`

  const lines = [
    `curl -X ${method.toUpperCase()} "${url}" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json"`,
  ]

  if (!isGet) {
    lines.push(`  -H "Idempotency-Key: req_${Date.now()}"`)
  }

  if (payload && !isGet) {
    const jsonStr = JSON.stringify(payload, null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : `  ${line}`))
      .join("\n")
    lines.push(`  -d '${jsonStr}'`)
  }

  return lines.join(" \\\n")
}
