"use client"

import { Check, Copy, CreditCard, ExternalLink, RotateCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/dashboard/status-badge"
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
import { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-status"
import { formatDate, formatMinorUnits, safeHttpUrl } from "@/lib/utils"

export interface PaymentRecord {
  id: string
  provider: string
  status: string
  amountMinorUnits: number
  currency: string
  merchantReference: string | null
  nextActionType: string | null
  nextActionPayload: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerName: string | null
  createdAt: string | Date
}

interface Props {
  initialPayments: PaymentRecord[]
}

export function TransactionLedgerTable({ initialPayments }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const filtered = useMemo(() => {
    return initialPayments.filter((p) => {
      // Search matching across ID, merchant ref, customer phone/email, provider
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchId = p.id.toLowerCase().includes(query)
        const matchRef = p.merchantReference?.toLowerCase().includes(query)
        const matchPhone = p.customerPhone?.toLowerCase().includes(query)
        const matchEmail = p.customerEmail?.toLowerCase().includes(query)
        const matchProvider = p.provider.toLowerCase().includes(query)
        if (!matchId && !matchRef && !matchPhone && !matchEmail && !matchProvider) {
          return false
        }
      }

      // Status filter (display-normalized)
      if (statusFilter !== "all") {
        const display = normalizePaymentStatus(p.status, paymentHasNextAction(p))
        if (display !== statusFilter) return false
      }

      // Provider filter
      if (providerFilter !== "all" && p.provider.toLowerCase() !== providerFilter) {
        return false
      }

      return true
    })
  }, [initialPayments, search, statusFilter, providerFilter])

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || providerFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setProviderFilter("all")
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-4 border-b border-border/80 bg-muted/20">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Payment ID, Merchant Ref, Customer..."
            className="pl-8.5 h-8.5 font-mono text-xs bg-background/80 border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-lg p-0.5">
            {["all", "succeeded", "pending", "failed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md capitalize transition-all ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

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
              title="Reset all filters"
            >
              <RotateCcw className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Stats Badge */}
      <div className="flex items-center justify-between px-4 text-[11px] font-mono text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          {initialPayments.length} transactions
        </span>
        {hasActiveFilters && (
          <span className="text-primary text-[10px] font-medium">Filtered active</span>
        )}
      </div>

      {/* Scrollable Table Container with Sticky Header */}
      <div className="max-h-[540px] overflow-y-auto overflow-x-auto border-t border-border/60">
        <Table className="min-w-[880px]">
          <TableHeader className="sticky top-0 z-10 bg-card border-b border-border/80 shadow-2xs backdrop-blur-md">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-mono text-[11px] bg-card w-[220px]">Payment ID</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Provider</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Status</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Amount</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Merchant Ref</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Next Action</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Customer</TableHead>
              <TableHead className="text-right font-mono text-[11px] bg-card">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CreditCard className="size-6 text-muted-foreground/40" />
                    <p className="text-xs font-semibold text-foreground">
                      No transactions recorded yet
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                      Create a test payment using the REST API or test the multi-rail checkout demo.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="sm" asChild className="text-xs font-mono">
                        <a href="/checkout">Open Checkout Demo</a>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="text-xs font-mono">
                        <a href="/dashboard/documentation">API Documentation</a>
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CreditCard className="size-6 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-foreground">
                      No matching transactions found
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      Try adjusting your search terms or clearing the status/provider filters.
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2 text-xs font-mono"
                      >
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    <div className="flex items-center gap-1.5 group">
                      <span className="truncate max-w-[170px]" title={row.id}>
                        {row.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(row.id)}
                        aria-label={`Copy payment ID ${row.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Copy Payment ID"
                      >
                        {copiedId === row.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex capitalize rounded-md border border-border/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {row.provider}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={normalizePaymentStatus(row.status, paymentHasNextAction(row))}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                    {formatMinorUnits(row.amountMinorUnits, row.currency)}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs text-muted-foreground max-w-[160px] truncate"
                    title={row.merchantReference || ""}
                  >
                    {row.merchantReference || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {row.nextActionType === "pay_at_reference" ? (
                      <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-[11px]">
                        Code: {row.nextActionPayload}
                      </span>
                    ) : row.nextActionType === "redirect_to_url" &&
                      safeHttpUrl(row.nextActionPayload) ? (
                      <a
                        href={safeHttpUrl(row.nextActionPayload)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                      >
                        Checkout <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {row.customerPhone || row.customerEmail || row.customerName || "Anonymous"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono whitespace-nowrap">
                    <span suppressHydrationWarning>{formatDate(row.createdAt)}</span>
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
