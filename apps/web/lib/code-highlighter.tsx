"use client"

import { CheckmarkCircle01Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Prism from "prismjs"
import { type ReactNode, useMemo, useState } from "react"
import { normalizeLanguage, safeFormatJson } from "./code-formatter"

// Ensure core language grammars are registered with Prism
import "prismjs/components/prism-clike"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-php"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-json"
import "prismjs/components/prism-sql"

export interface TokenSpan {
  content: string
  type?: string
  alias?: string
}

export type TokenLine = TokenSpan[]

/**
 * Tokenizes arbitrary code into line-by-line arrays of tokens for clean React rendering.
 * Safely handles multi-line tokens, nested templates, and empty lines without broken HTML.
 */
export function tokenizeCode(code: string, language = "typescript"): TokenLine[] {
  const normLang = normalizeLanguage(language)
  const grammar =
    Prism.languages[normLang] ||
    Prism.languages.typescript ||
    Prism.languages.javascript ||
    Prism.languages.clike

  const rawTokens = Prism.tokenize(code || "", grammar)
  const lines: TokenLine[] = [[]]

  function appendSpan(text: string, type?: string, alias?: string) {
    if (!text) return
    const parts = text.split("\n")
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([])
      }
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({
          content: parts[i],
          type,
          alias,
        })
      }
    }
  }

  function walk(token: unknown, parentType?: string, parentAlias?: string) {
    if (typeof token === "string") {
      appendSpan(token, parentType, parentAlias)
      return
    }
    if (!token || typeof token !== "object") return

    const t = token as {
      type?: string
      alias?: string | string[]
      content?: unknown
    }

    const currentType = t.type || parentType
    const currentAlias = Array.isArray(t.alias)
      ? t.alias[0]
      : t.alias || parentAlias

    if (Array.isArray(t.content)) {
      for (const child of t.content) {
        walk(child, currentType, currentAlias)
      }
    } else if (typeof t.content === "string") {
      appendSpan(t.content, currentType, currentAlias)
    } else if (t.content && typeof t.content === "object") {
      walk(t.content, currentType, currentAlias)
    }
  }

  for (const tok of rawTokens) {
    walk(tok)
  }

  return lines
}

/**
 * Maps Prism token types to humanized Mac light and dark theme syntax colors.
 */
export function getTokenClassName(type?: string, alias?: string): string {
  const key = alias || type
  if (!key) return "text-[#24292f] dark:text-[#c9d1d9]"

  switch (key) {
    case "comment":
    case "prolog":
    case "doctype":
    case "cdata":
      return "text-[#6e7781] dark:text-[#8b949e] italic"

    case "keyword":
    case "atrule":
    case "rule":
      return "text-[#cf222e] dark:text-[#ff7b72] font-semibold"

    case "string":
    case "template-string":
    case "char":
    case "attr-value":
    case "double-quoted-string":
    case "single-quoted-string":
      return "text-[#0a3069] dark:text-[#a5d6ff]"

    case "template-punctuation":
      return "text-[#0a3069] dark:text-[#a5d6ff]"

    case "function":
    case "function-variable":
    case "method":
      return "text-[#8250df] dark:text-[#d2a8ff]"

    case "number":
    case "boolean":
      return "text-[#0550ae] dark:text-[#79c0ff] font-tnum"

    case "class-name":
    case "builtin":
    case "type":
      return "text-[#953800] dark:text-[#ffa657] font-semibold"

    case "property":
    case "attr-name":
      return "text-[#0550ae] dark:text-[#79c0ff]"

    case "operator":
      return "text-[#cf222e] dark:text-[#ff7b72]"

    case "punctuation":
      return "text-[#57606a] dark:text-[#8b949e]"

    case "variable":
    case "constant":
    case "parameter":
      return "text-[#953800] dark:text-[#ffa657]"

    case "regex":
    case "important":
    case "delimiter":
      return "text-[#116329] dark:text-[#7ee787]"

    default:
      return "text-[#24292f] dark:text-[#c9d1d9]"
  }
}

export interface CodeHighlighterProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  highlightedLines?: number[]
  className?: string
  lineClassName?: string
}

/**
 * Bare syntax highlighter without the outer macOS window wrapper.
 * Embeds directly inside tables, dialogs, drawers, or custom headers.
 */
export function CodeHighlighter({
  code,
  language = "typescript",
  showLineNumbers = false,
  highlightedLines = [],
  className = "",
  lineClassName = "",
}: CodeHighlighterProps) {
  const lines = useMemo(() => tokenizeCode(code, language), [code, language])

  if (!showLineNumbers) {
    return (
      <code className={`font-mono text-xs leading-relaxed ${className}`}>
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            className={`whitespace-pre ${
              highlightedLines.includes(lineIdx + 1)
                ? "bg-[#533afd]/10 dark:bg-[#533afd]/20 -mx-4 px-4"
                : ""
            } ${lineClassName}`}
          >
            {line.length === 0 ? (
              <span>&#8203;</span>
            ) : (
              line.map((token, tokIdx) => (
                <span
                  key={tokIdx}
                  className={getTokenClassName(token.type, token.alias)}
                >
                  {token.content}
                </span>
              ))
            )}
          </div>
        ))}
      </code>
    )
  }

  return (
    <pre className={`table w-full border-collapse font-mono text-xs leading-relaxed ${className}`}>
      <tbody>
        {lines.map((line, idx) => {
          const lineNum = idx + 1
          const isHighlighted = highlightedLines.includes(lineNum)
          return (
            <tr
              key={idx}
              className={`transition-colors ${
                isHighlighted
                  ? "bg-[#533afd]/10 dark:bg-[#533afd]/20"
                  : "hover:bg-[#f6f8fa] dark:hover:bg-white/[0.03]"
              }`}
            >
              <td className="w-9 pr-3 text-right text-[#8c959f] dark:text-[#6e7681] select-none text-[11px] align-top font-light font-tnum border-r border-[#eaecf0] dark:border-[#21262d]">
                {lineNum}
              </td>
              <td className="pl-3.5 whitespace-pre font-mono align-top overflow-visible select-text">
                {line.length === 0 ? (
                  <span>&#8203;</span>
                ) : (
                  line.map((token, tokIdx) => (
                    <span
                      key={tokIdx}
                      className={getTokenClassName(token.type, token.alias)}
                    >
                      {token.content}
                    </span>
                  ))
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </pre>
  )
}

export interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  filename?: string
  showLineNumbers?: boolean
  highlightedLines?: number[]
  className?: string
  maxHeight?: string
  copyable?: boolean
  badge?: string
  headerActions?: ReactNode
  id?: string
}

/**
 * Standard macOS styled Code Block with traffic light controls,
 * syntax highlighting, copy action, and language labels.
 */
export function CodeBlock({
  code,
  language = "typescript",
  title,
  filename,
  showLineNumbers = true,
  highlightedLines = [],
  className = "",
  maxHeight,
  copyable = true,
  badge,
  headerActions,
  id,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayTitle = filename || title

  return (
    <div
      id={id}
      className={`relative w-full overflow-hidden rounded-xl border border-[#d2d2d7] dark:border-[#2d3139] bg-white dark:bg-[#141418] shadow-xs transition-all ${className}`}
    >
      {/* macOS Window Titlebar Header */}
      <div className="flex items-center justify-between border-b border-[#e5e5e7] dark:border-[#2b2b32] bg-[#f6f6f6] dark:bg-[#1e1e24] px-3.5 py-2 select-none">
        <div className="flex items-center gap-2 min-w-0">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
            <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
          </div>

          {displayTitle && (
            <span className="text-xs font-mono font-medium text-[#1d1d1f] dark:text-[#e6edf3] ml-2 pl-2 border-l border-[#e5e5e7] dark:border-[#2b2b32] truncate">
              {displayTitle}
            </span>
          )}

          {badge && (
            <span className="rounded-full bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider shrink-0">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerActions}

          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy code to clipboard"
              className="flex items-center gap-1 rounded-md border border-[#d2d2d7] dark:border-[#3a3a46] bg-white dark:bg-[#2c2d38] hover:bg-[#f6f6f6] dark:hover:bg-[#363746] px-2.5 py-1 text-xs font-mono text-[#1d1d1f] dark:text-[#e6edf3] shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={12}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={Copy01Icon}
                    size={12}
                    className="text-[#6e6e73] dark:text-[#98989f]"
                  />
                  <span className="text-[10.5px]">Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor Body */}
      <div
        className="overflow-x-auto p-4 font-mono text-[11.5px] sm:text-xs leading-relaxed text-[#24292f] dark:text-[#c9d1d9] bg-[#ffffff] dark:bg-[#0f111a]"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <CodeHighlighter
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
          highlightedLines={highlightedLines}
        />
      </div>
    </div>
  )
}

export interface JsonViewerProps {
  data: unknown
  title?: string
  filename?: string
  showLineNumbers?: boolean
  maxHeight?: string
  className?: string
}

/**
 * Interactive, highlighted JSON payload viewer for transactions, webhooks, and telemetry.
 */
export function JsonViewer({
  data,
  title = "Payload",
  filename = "response.json",
  showLineNumbers = true,
  maxHeight = "360px",
  className = "",
}: JsonViewerProps) {
  const jsonString = useMemo(() => safeFormatJson(data), [data])

  return (
    <CodeBlock
      code={jsonString}
      language="json"
      title={title}
      filename={filename}
      showLineNumbers={showLineNumbers}
      maxHeight={maxHeight}
      badge="JSON"
      className={className}
    />
  )
}
