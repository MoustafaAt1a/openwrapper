"use client"

import { Check, Copy, RotateCcw, Search, Webhook } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

export interface WebhookRecord {
  eventId: string
  provider: string
  paymentId: string | null
  receivedAt: string | Date
}

interface Props {
  initialWebhooks: WebhookRecord[]
}

export function WebhookDeliveriesTable({ initialWebhooks }: Props) {
  const [search, setSearch] = useState("")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const filtered = useMemo(() => {
    return initialWebhooks.filter((w) => {
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchEventId = w.eventId.toLowerCase().includes(query)
        const matchPaymentId = w.paymentId?.toLowerCase().includes(query)
        const matchProvider = w.provider.toLowerCase().includes(query)
        if (!matchEventId && !matchPaymentId && !matchProvider) {
          return false
        }
      }

      if (providerFilter !== "all" && w.provider.toLowerCase() !== providerFilter) {
        return false
      }

      return true
    })
  }, [initialWebhooks, search, providerFilter])

  const hasActiveFilters = search.trim() !== "" || providerFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setProviderFilter("all")
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-4 border-b border-border/80 bg-muted/20">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Event ID or Payment ID..."
            className="pl-8.5 h-8.5 font-mono text-xs bg-background/80 border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Provider Filter */}
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-lg p-0.5">
            {["all", "fawry", "paymob", "stripe"].map((p) => (
              <button
                key={p}
                onClick={() => setProviderFilter(p)}
                className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md capitalize transition-all ${
                  providerFilter === p
                    ? "bg-secondary text-secondary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Stats */}
      <div className="flex items-center justify-between px-4 text-[11px] font-mono text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          {initialWebhooks.length} deliveries
        </span>
      </div>

      {/* Scrollable Container with Sticky Header */}
      <div className="max-h-[380px] overflow-y-auto overflow-x-auto border-t border-border/60">
        <Table className="min-w-[640px]">
          <TableHeader className="sticky top-0 z-10 bg-card border-b border-border/80 shadow-2xs backdrop-blur-md">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-mono text-[11px] bg-card w-[260px]">Event ID</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Provider</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Linked Payment ID</TableHead>
              <TableHead className="text-right font-mono text-[11px] bg-card">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialWebhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-36 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Webhook className="size-5 text-muted-foreground/40" />
                    <p className="text-xs font-semibold text-foreground">
                      No webhook events received yet
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                      Configure your Paymob, Fawry, or Stripe destination URLs in the Providers
                      panel to stream verified webhooks.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-36 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Webhook className="size-5 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-foreground">
                      No webhook deliveries found
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Try clearing your search query or provider filter.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow
                  key={w.eventId}
                  className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-foreground font-medium">
                    <div className="flex items-center gap-1.5 group">
                      <span className="truncate max-w-[200px]" title={w.eventId}>
                        {w.eventId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(w.eventId)}
                        aria-label={`Copy webhook event ID ${w.eventId}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Copy Event ID"
                      >
                        {copiedId === w.eventId ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize font-mono text-[10px]">
                      {w.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {w.paymentId ? (
                      <span className="text-foreground/90 font-mono text-xs">{w.paymentId}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                    <span suppressHydrationWarning>{formatDate(w.receivedAt)}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
