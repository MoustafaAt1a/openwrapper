"use client"

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Search,
} from "lucide-react"
import Link from "next/link"
import { Fragment, useMemo, useState } from "react"
import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GooTabs } from "@/components/ui/goo-tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JsonViewer } from "@/lib/code-syntax-highlighter"
import { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-status-resolver"
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

export function AuthoritativeTransactionLedgerTable({ initialPayments }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || providerFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setProviderFilter("all")
    setPage(1)
  }

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-4 border-b border-border/80 bg-muted/20">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by Payment ID, Merchant Ref, Customer..."
            className="pl-8.5 h-8.5 font-mono text-xs bg-background/80 border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter — Sliding Indicator */}
          <GooTabs
            items={[
              { id: "all", label: "All Status" },
              { id: "succeeded", label: "Succeeded" },
              { id: "pending", label: "Pending" },
              { id: "failed", label: "Failed" },
            ]}
            activeId={statusFilter}
            onTabChange={(s) => handleFilterChange(setStatusFilter, s)}
            className="bg-background/80 border border-border/80 font-mono"
            indicatorClassName="bg-primary text-primary-foreground shadow-2xs"
            size="sm"
          />

          {/* Provider Filter — Sliding Indicator */}
          <GooTabs
            items={[
              { id: "all", label: "All Rails" },
              { id: "fawry", label: "Fawry" },
              { id: "paymob", label: "Paymob" },
              { id: "stripe", label: "Stripe" },
              { id: "mock", label: "Mock" },
            ]}
            activeId={providerFilter}
            onTabChange={(p) => handleFilterChange(setProviderFilter, p)}
            className="bg-background/80 border border-border/80 font-mono"
            indicatorClassName="bg-secondary text-secondary-foreground shadow-2xs"
            activeTabClassName="text-foreground"
            size="sm"
          />

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
      <Table
        containerClassName="max-h-[540px] overflow-auto border-t border-border/60"
        className="w-full table-fixed min-w-[1120px]"
      >
        <TableHeader className="sticky top-0 z-20 bg-card shadow-2xs">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-mono text-[11px] bg-card w-[210px] sticky top-0 z-20">
              Payment ID
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[90px] sticky top-0 z-20">
              Provider
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[115px] sticky top-0 z-20">
              Status
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[115px] sticky top-0 z-20">
              Amount
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[145px] sticky top-0 z-20">
              Merchant Ref
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[115px] sticky top-0 z-20">
              Next Action
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[160px] sticky top-0 z-20">
              Customer
            </TableHead>
            <TableHead className="text-right font-mono text-[11px] bg-card w-[170px] sticky top-0 z-20">
              Created
            </TableHead>
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
                      <Link href="/checkout">Open Checkout Demo</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="text-xs font-mono">
                      <Link href="/dashboard/documentation">API Documentation</Link>
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
            paginatedRows.map((row) => {
              const isExpanded = expandedId === row.id
              return (
                <Fragment key={row.id}>
                  <TableRow
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className={`border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer ${
                      isExpanded ? "bg-muted/30" : ""
                    }`}
                  >
                    <TableCell className="w-[210px] font-mono text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-1.5 min-w-0 group">
                        {isExpanded ? (
                          <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                        )}
                        <span className="truncate max-w-[145px]" title={row.id}>
                          {row.id}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(row.id)
                          }}
                          aria-label={`Copy payment ID ${row.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0"
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
                    <TableCell className="w-[90px] font-mono text-xs capitalize text-muted-foreground truncate">
                      {row.provider}
                    </TableCell>
                    <TableCell className="w-[115px]">
                      <PaymentStatusBadge
                        status={normalizePaymentStatus(row.status, paymentHasNextAction(row))}
                      />
                    </TableCell>
                    <TableCell className="w-[115px] font-mono text-xs font-semibold text-foreground whitespace-nowrap font-tnum">
                      {formatMinorUnits(row.amountMinorUnits, row.currency)}
                    </TableCell>
                    <TableCell className="w-[145px] font-mono text-xs text-muted-foreground">
                      <span
                        className="truncate block max-w-[135px]"
                        title={row.merchantReference || ""}
                      >
                        {row.merchantReference || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="w-[115px] font-mono text-xs">
                      {row.nextActionType ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-primary truncate max-w-[85px] font-medium">
                            {row.nextActionType === "redirect_to_url" ? "3DS URL" : "Kiosk Ref"}
                          </span>
                          {safeHttpUrl(row.nextActionPayload) && (
                            <a
                              href={safeHttpUrl(row.nextActionPayload)!}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Open payment action link"
                              className="text-primary hover:text-primary-deep shrink-0"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-[160px] text-xs text-muted-foreground">
                      <div className="flex flex-col min-w-0 leading-snug">
                        <span
                          className="truncate max-w-[150px] font-medium text-foreground"
                          title={row.customerName || ""}
                        >
                          {row.customerName || "—"}
                        </span>
                        {(row.customerPhone || row.customerEmail) && (
                          <span
                            className="font-mono text-[10px] text-muted-foreground/80 truncate max-w-[150px]"
                            title={row.customerPhone || row.customerEmail || ""}
                          >
                            {row.customerPhone || row.customerEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[170px] text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <span suppressHydrationWarning>{formatDate(row.createdAt)}</span>
                    </TableCell>
                  </TableRow>

                  {/* Inline Expandable Detail Tray */}
                  {isExpanded && (
                    <TableRow className="bg-muted/15 border-b border-border/60 hover:bg-muted/15">
                      <TableCell colSpan={8} className="p-0 max-w-0">
                        <div className="p-4 pl-8 max-w-full overflow-hidden">
                          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-2xs max-w-full overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Code2 className="size-4 text-primary" />
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  Authoritative Payment Payload
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ID: {row.id}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1 text-xs">
                              <div>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  Provider Ref
                                </span>
                                <p className="font-mono text-xs font-medium text-foreground truncate">
                                  {row.merchantReference || "None"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  Settlement Currency
                                </span>
                                <p className="font-mono text-xs font-medium text-foreground">
                                  {row.currency}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  Customer Contact
                                </span>
                                <p className="font-mono text-xs font-medium text-foreground truncate">
                                  {row.customerPhone || row.customerEmail || "Anonymous"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  Next Action Type
                                </span>
                                <p className="font-mono text-xs font-medium text-foreground">
                                  {row.nextActionType || "Terminal State"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-1">
                              <JsonViewer
                                data={{
                                  paymentId: row.id,
                                  provider: row.provider,
                                  status: row.status,
                                  amountMinorUnits: row.amountMinorUnits,
                                  currency: row.currency,
                                  merchantReference: row.merchantReference,
                                  nextAction: row.nextActionType
                                    ? {
                                        type: row.nextActionType,
                                        payload: row.nextActionPayload,
                                      }
                                    : null,
                                  customer: {
                                    phone: row.customerPhone,
                                    email: row.customerEmail,
                                    name: row.customerName,
                                  },
                                  createdAt: row.createdAt,
                                }}
                                title="Transaction JSON Payload"
                                filename={`${row.id}.json`}
                                showLineNumbers={true}
                                className="max-w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/80 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" /> Prev
            </Button>
            <span className="px-2">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs"
            >
              Next <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const TransactionLedgerTable = AuthoritativeTransactionLedgerTable
export default AuthoritativeTransactionLedgerTable
