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

export function safeFormatJson(val: unknown): string {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return val
    }
  }
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
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
