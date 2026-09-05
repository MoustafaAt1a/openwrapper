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
import { useState, useTransition } from "react"
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ApiKeyRow = {
  id: number
  name: string
  prefix: string
  lastFour: string
  createdAt: Date
  lastUsedAt: Date | null
}

export function ApiKeyManager({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [revealedKey, setRevealedKey] = useState("")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function create() {
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setMessage(data.error || "Failed to create API key.")
          return
        }
        setRevealedKey(data.key ?? "")
        setName("")
        setMessage("")
        router.refresh()
      } catch {
        // Fallback to server action if fetch failed
        const result = await createApiKey(trimmed)
        if (result.error) return setMessage(result.error)
        setRevealedKey(result.key ?? "")
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
      {/* Key Creation Field */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              create()
            }
          }}
          placeholder="Key label, e.g. Production Backend"
          aria-label="API key name"
          maxLength={40}
          className="h-10 rounded-xl border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] text-sm focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/20"
        />
        <button
          type="button"
          onClick={create}
          disabled={pending || !name.trim()}
          className="h-10 rounded-full bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white px-5 text-xs font-medium shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
        >
          {pending ? (
            <HugeiconsIcon icon={Loading03Icon} size={15} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={Add01Icon} size={15} />
          )}
          <span>Create Key</span>
        </button>
      </div>

      {message && (
        <p className="text-xs font-mono text-[#ea2261]" role="alert">
          {message}
        </p>
      )}

      {/* One-time Revealed Key Banner */}
      {revealedKey && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <HugeiconsIcon icon={ShieldCheckIcon} size={16} className="shrink-0" />
            <p className="text-xs font-semibold">
              Copy this secret token now. It is SHA-256 hashed and will not be displayed again.
            </p>
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
        </div>
      )}

      {/* Keys List */}
      <div className="flex flex-col divide-y divide-[#e3e8ee]/80 dark:divide-white/10">
        {keys.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e3e8ee] dark:border-white/15 p-6 text-center">
            <HugeiconsIcon icon={Key01Icon} size={20} className="text-[#64748d]/60" />
            <p className="text-xs font-semibold text-[#0d253d] dark:text-white">
              No active API keys
            </p>
            <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] max-w-xs font-light">
              Generate an API key to authenticate requests from your backend server or SDK.
            </p>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-[#0d253d] dark:text-white">
                    {key.name}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="size-1 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
                <p className="font-mono text-xs text-[#64748d] dark:text-[#8ca3ba] tracking-wide">
                  {key.prefix}
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
          ))
        )}
      </div>
    </div>
  )
}
