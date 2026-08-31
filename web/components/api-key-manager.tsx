"use client"

import { useState, useTransition } from "react"
import { Check, Copy, KeyRound, LoaderCircle, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export type ApiKeyRow = {
  id: number
  name: string
  prefix: string
  lastFour: string
  createdAt: Date
  lastUsedAt: Date | null
}

export function ApiKeyManager({ keys }: { keys: ApiKeyRow[] }) {
  const [name, setName] = useState("")
  const [revealedKey, setRevealedKey] = useState("")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function create() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createApiKey(name)
      if (result.error) return setMessage(result.error)
      setRevealedKey(result.key ?? "")
      setName("")
      setMessage("")
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
          className="h-10 border-border/80 bg-card text-sm"
        />
        <Button
          onClick={create}
          disabled={pending || !name.trim()}
          className="h-10 font-mono text-xs font-semibold shrink-0"
        >
          {pending ? (
            <LoaderCircle data-icon="inline-start" className="size-3.5 animate-spin" />
          ) : (
            <Plus data-icon="inline-start" className="size-3.5" />
          )}
          Create Key
        </Button>
      </div>

      {message && (
        <p className="text-xs font-mono text-destructive" role="alert">
          {message}
        </p>
      )}

      {/* One-time Revealed Key Banner */}
      {revealedKey && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-4 shrink-0" />
            <p className="text-xs font-semibold">
              Copy this secret token now. It is SHA-256 hashed and will not be displayed again.
            </p>
          </div>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border/80 bg-card px-3 py-2 font-mono text-xs font-semibold text-foreground select-all">
              {revealedKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copy}
              className="h-9 px-3 font-mono text-xs border-border/80 bg-card shrink-0"
              aria-label="Copy API key"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="flex flex-col divide-y divide-border/60">
        {keys.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 p-6 text-center">
            <KeyRound className="size-5 text-muted-foreground/60" />
            <p className="text-xs font-semibold text-foreground">No active API keys</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
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
                  <p className="truncate text-xs font-semibold text-foreground">{key.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="size-1 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {key.prefix}••••••••••••{key.lastFour}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Revoke ${key.name}`}
                title="Revoke key"
                className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                onClick={() =>
                  startTransition(async () => {
                    await revokeApiKey(key.id)
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
