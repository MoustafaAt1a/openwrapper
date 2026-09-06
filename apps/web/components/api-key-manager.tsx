"use client"

import {
  Add01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  Delete02Icon,
  Key01Icon,
  Loading03Icon,
  ShieldCheckIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CodeBlock } from "@/lib/code-highlighter"
import { type DashboardMode, useEnvironmentMode } from "@/lib/environment-context"

export type ApiKeyRow = {
  id: number
  name: string
  prefix: string
  lastFour: string
  environment?: "live" | "test"
  createdAt: Date
  lastUsedAt: Date | null
}

function getEnv(key: ApiKeyRow): "live" | "test" {
  if (key.environment) return key.environment
  return key.prefix.startsWith("ow_test") ? "test" : "live"
}

export function ApiKeyManager({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter()
  const { mode: currentDashboardMode } = useEnvironmentMode()

  const [name, setName] = useState("")
  const [creationEnv, setCreationEnv] = useState<DashboardMode>(currentDashboardMode)
  const [filterEnv, setFilterEnv] = useState<"all" | "live" | "test">(currentDashboardMode)
  const [revealedKey, setRevealedKey] = useState("")
  const [revealedEnv, setRevealedEnv] = useState<DashboardMode>("live")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  // Sync creation environment and filter when user flips global dashboard mode
  useEffect(() => {
    setCreationEnv(currentDashboardMode)
    setFilterEnv(currentDashboardMode)
  }, [currentDashboardMode])

  const liveCount = useMemo(() => keys.filter((k) => getEnv(k) === "live").length, [keys])
  const testCount = useMemo(() => keys.filter((k) => getEnv(k) === "test").length, [keys])

  const filteredKeys = useMemo(() => {
    if (filterEnv === "all") return keys
    return keys.filter((k) => getEnv(k) === filterEnv)
  }, [keys, filterEnv])

  function create() {
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, environment: creationEnv }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setMessage(data.error || "Failed to create API key.")
          return
        }
        setRevealedKey(data.key ?? "")
        setRevealedEnv(creationEnv)
        setName("")
        setMessage("")
        router.refresh()
      } catch {
        // Fallback to server action if fetch failed
        const result = await createApiKey(trimmed, creationEnv)
        if (result.error) return setMessage(result.error)
        setRevealedKey(result.key ?? "")
        setRevealedEnv(creationEnv)
        setName("")
        setMessage("")
      }
    })
  }

  function revoke(id: number) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/api-keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        if (!res.ok) {
          await revokeApiKey(id)
        } else {
          router.refresh()
        }
      } catch {
        await revokeApiKey(id)
      }
    })
  }

  async function copy() {
    await navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Key Creation Form */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-[#fbfcfd] dark:bg-[#0c1024] p-4 sm:p-5 stripe-card-shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-[#0d253d] dark:text-white">
              Generate New API Key
            </h3>
            <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-light">
              Choose the operational rail environment for this token.
            </p>
          </div>

          {/* Environment Selector Pills */}
          <div className="inline-flex items-center gap-1 rounded-full bg-[#f0f4f8] dark:bg-[#141b33] p-1 border border-[#e3e8ee] dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setCreationEnv("test")}
              className={`rounded-full px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                creationEnv === "test"
                  ? "bg-amber-500 text-white font-semibold shadow-xs"
                  : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
              }`}
            >
              Test (ow_test_)
            </button>
            <button
              type="button"
              onClick={() => setCreationEnv("live")}
              className={`rounded-full px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                creationEnv === "live"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
              }`}
            >
              Live (ow_live_)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row mt-1">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                create()
              }
            }}
            placeholder={
              creationEnv === "test"
                ? "Key label, e.g. Local Dev Sandbox"
                : "Key label, e.g. Production Backend"
            }
            aria-label="API key name"
            maxLength={40}
            className="h-10 rounded-xl border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] text-sm focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/20"
          />
          <button
            type="button"
            onClick={create}
            disabled={pending || !name.trim()}
            className={`h-10 rounded-full text-white px-5 text-xs font-medium shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 ${
              creationEnv === "test"
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c]"
            }`}
          >
            {pending ? (
              <HugeiconsIcon icon={Loading03Icon} size={15} className="animate-spin" />
            ) : (
              <HugeiconsIcon icon={Add01Icon} size={15} />
            )}
            <span>Generate {creationEnv === "test" ? "Test" : "Live"} Key</span>
          </button>
        </div>

        {message && (
          <p className="text-xs font-mono text-[#ea2261]" role="alert">
            {message}
          </p>
        )}
      </div>

      {/* One-time Revealed Key Banner */}
      {revealedKey && (
        <div
          className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm ${
            revealedEnv === "test"
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 ${
                revealedEnv === "test"
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              <HugeiconsIcon icon={ShieldCheckIcon} size={16} className="shrink-0" />
              <p className="text-xs font-semibold">
                Copy this {revealedEnv === "test" ? "Test" : "Live"} secret token now. It is SHA-256
                hashed and will never be displayed again.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase border ${
                revealedEnv === "test"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              }`}
            >
              {revealedEnv} key
            </span>
          </div>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] px-3 py-2 font-mono text-xs font-semibold text-[#0d253d] dark:text-white select-all">
              {revealedKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copy}
              className="h-9 px-3.5 font-mono text-xs rounded-full border-[#e3e8ee] dark:border-white/15 bg-white dark:bg-[#0f1426] shrink-0"
              aria-label="Copy API key"
            >
              {copied ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={14}
                    className="text-emerald-500"
                  />{" "}
                  Copied
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Copy01Icon} size={14} /> Copy
                </>
              )}
            </Button>
          </div>

          <div className="mt-1">
            <CodeBlock
              code={`curl -X GET "https://gateway.openwrapper.muejam.com/api/v1/health" \\\n  -H "Authorization: Bearer ${revealedKey}"`}
              language="bash"
              filename="test_key.sh"
              showLineNumbers={false}
            />
          </div>
        </div>
      )}

      {/* Keys List Filter Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-[#e3e8ee] dark:border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setFilterEnv("all")}
            className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
              filterEnv === "all"
                ? "bg-[#0d253d] text-white dark:bg-white dark:text-[#0d253d] font-medium shadow-2xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            All Keys ({keys.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterEnv("test")}
            className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
              filterEnv === "test"
                ? "bg-amber-500 text-white font-medium shadow-2xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Test Keys ({testCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterEnv("live")}
            className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
              filterEnv === "live"
                ? "bg-emerald-600 text-white font-medium shadow-2xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Live Keys ({liveCount})
          </button>
        </div>

        {/* Keys List */}
        <div className="flex flex-col divide-y divide-[#e3e8ee]/80 dark:divide-white/10">
          {filteredKeys.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e3e8ee] dark:border-white/15 p-6 text-center">
              <HugeiconsIcon icon={Key01Icon} size={20} className="text-[#64748d]/60" />
              <p className="text-xs font-semibold text-[#0d253d] dark:text-white">
                No {filterEnv !== "all" ? `${filterEnv} ` : ""}API keys found
              </p>
              <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] max-w-xs font-light">
                {filterEnv === "test"
                  ? "Generate a Test key above to simulate payments safely without real funds."
                  : filterEnv === "live"
                    ? "Generate a Live key above to process real transactions on production rails."
                    : "Generate an API key to authenticate requests from your backend server or SDK."}
              </p>
            </div>
          ) : (
            filteredKeys.map((key) => {
              const env = getEnv(key)
              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#0d253d] dark:text-white">
                        {key.name}
                      </p>

                      {/* Environment Tag */}
                      {env === "test" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <span className="size-1 rounded-full bg-amber-500" /> TEST
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          <span className="size-1 rounded-full bg-emerald-500" /> LIVE
                        </span>
                      )}

                      <span className="text-[10px] text-[#8ca3ba] font-mono">· Active</span>
                    </div>

                    <p className="font-mono text-xs text-[#64748d] dark:text-[#8ca3ba] tracking-wide">
                      <span className={env === "test" ? "text-amber-600 dark:text-amber-400" : ""}>
                        {key.prefix}
                      </span>
                      <span className="tracking-widest px-0.5 text-[#8ca3ba]/70">••••••••</span>
                      {key.lastFour}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Revoke ${key.name}`}
                    title="Revoke key"
                    className="p-1.5 rounded-lg text-[#64748d] hover:bg-[#ea2261]/10 hover:text-[#ea2261] transition-colors cursor-pointer"
                    onClick={() => revoke(key.id)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
