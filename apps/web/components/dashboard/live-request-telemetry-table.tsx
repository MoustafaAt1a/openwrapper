"use client"

import {
  Activity,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  RotateCcw,
  Search,
} from "lucide-react"
import { Fragment, useMemo, useState } from "react"
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
import { CodeBlock, JsonViewer } from "@/lib/code-syntax-highlighter"
import { formatDate } from "@/lib/utils"

export interface ApiRequestRecord {
  id: number
  endpoint: string
  method: string
  statusCode: number
  latencyMs: number
  routingLatencyMs?: number | null
  ipAddress?: string | null
  createdAt: string | Date
}

interface Props {
  initialRequests: ApiRequestRecord[]
}

export function LiveRequestTelemetryTable({ initialRequests }: Props) {
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortByLatency, setSortByLatency] = useState<boolean>(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const filtered = useMemo(() => {
    let result = initialRequests.filter((r) => {
      // Search matching across endpoint, method, status code, ip
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const matchEndpoint = r.endpoint.toLowerCase().includes(query)
        const matchMethod = r.method.toLowerCase().includes(query)
        const matchStatus = r.statusCode.toString().includes(query)
        const matchIp = r.ipAddress?.toLowerCase().includes(query)
        if (!matchEndpoint && !matchMethod && !matchStatus && !matchIp) {
          return false
        }
      }

      // Method filter
      if (methodFilter !== "all" && r.method.toUpperCase() !== methodFilter) {
        return false
      }

      // Status code filter
      if (statusFilter === "2xx" && (r.statusCode < 200 || r.statusCode >= 300)) {
        return false
      }
      if (statusFilter === "4xx" && (r.statusCode < 400 || r.statusCode >= 500)) {
        return false
      }
      if (statusFilter === "5xx" && r.statusCode < 500) {
        return false
      }

      return true
    })

    if (sortByLatency) {
      result = [...result].sort(
        (a, b) => (b.routingLatencyMs ?? b.latencyMs) - (a.routingLatencyMs ?? a.latencyMs),
      )
    }

    return result
  }, [initialRequests, search, methodFilter, statusFilter, sortByLatency])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const hasActiveFilters =
    search.trim() !== "" || methodFilter !== "all" || statusFilter !== "all" || sortByLatency

  const clearFilters = () => {
    setSearch("")
    setMethodFilter("all")
    setStatusFilter("all")
    setSortByLatency(false)
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
            placeholder="Search by endpoint, method, status code..."
            className="pl-8.5 h-8.5 font-mono text-xs bg-background/80 border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter — Sliding Indicator */}
          <GooTabs
            items={[
              { id: "all", label: "All Methods" },
              { id: "POST", label: "POST" },
              { id: "GET", label: "GET" },
            ]}
            activeId={methodFilter}
            onTabChange={(m) => handleFilterChange(setMethodFilter, m)}
            className="bg-background/80 border border-border/80 font-mono"
            indicatorClassName="bg-primary text-primary-foreground shadow-2xs"
            size="sm"
          />

          {/* Status Filter — Sliding Indicator */}
          <GooTabs
            items={[
              { id: "all", label: "All Codes" },
              { id: "2xx", label: "2xx" },
              { id: "4xx", label: "4xx" },
              { id: "5xx", label: "5xx" },
            ]}
            activeId={statusFilter}
            onTabChange={(s) => handleFilterChange(setStatusFilter, s)}
            className="bg-background/80 border border-border/80 font-mono"
            indicatorClassName="bg-secondary text-secondary-foreground shadow-2xs"
            activeTabClassName="text-foreground"
            size="sm"
          />

          {/* Latency Sort Toggle */}
          <Button
            variant={sortByLatency ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSortByLatency((prev) => !prev)}
            className="h-8 px-2.5 text-xs font-mono"
            title="Sort by highest latency"
          >
            <ArrowUpDown className="size-3 mr-1" />
            <span>P95 First</span>
          </Button>

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
          {initialRequests.length} recorded telemetry events
        </span>
        {hasActiveFilters && (
          <span className="text-primary text-[10px] font-medium">Filtered active</span>
        )}
      </div>

      {/* Scrollable Table Container with Sticky Header */}
      <Table
        containerClassName="max-h-[540px] overflow-auto border-t border-border/60"
        className="w-full table-fixed min-w-[890px]"
      >
        <TableHeader className="sticky top-0 z-20 bg-card shadow-2xs">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-mono text-[11px] bg-card w-[110px] sticky top-0 z-20">
              Trace ID
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[100px] sticky top-0 z-20">
              Status
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[90px] sticky top-0 z-20">
              Method
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card sticky top-0 z-20">
              Endpoint
            </TableHead>
            <TableHead className="font-mono text-[11px] bg-card w-[130px] sticky top-0 z-20">
              Latency
            </TableHead>
            <TableHead className="text-right font-mono text-[11px] bg-card w-[180px] sticky top-0 z-20">
              Timestamp
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-44 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Activity className="size-6 text-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">
                    No live telemetry requests recorded yet
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Calls made using your API keys will appear here with method, status, and routing
                    latency telemetry.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Activity className="size-6 text-muted-foreground/40" />
                  <p className="text-xs font-medium text-foreground">No matching requests found</p>
                  <p className="text-[11px] text-muted-foreground">
                    Try adjusting search terms or resetting the method/status filters.
                  </p>
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
                    <TableCell className="w-[110px] font-mono text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-1.5 group">
                        {isExpanded ? (
                          <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                        )}
                        <span className="text-muted-foreground font-mono">#{row.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                          row.statusCode >= 500
                            ? "bg-destructive/10 text-destructive border-destructive/25"
                            : row.statusCode >= 400
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current shrink-0" />
                        <span>{row.statusCode}</span>
                      </span>
                    </TableCell>
                    <TableCell className="w-[90px]">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block whitespace-nowrap ${
                          row.method === "POST"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : row.method === "GET"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                              : "bg-muted text-muted-foreground border-border/80"
                        }`}
                      >
                        {row.method}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-foreground">
                      <span className="truncate block" title={row.endpoint}>
                        {row.endpoint}
                      </span>
                    </TableCell>
                    <TableCell className="w-[130px] font-mono text-xs text-muted-foreground whitespace-nowrap font-tnum">
                      {(() => {
                        const routing = row.routingLatencyMs ?? row.latencyMs
                        return (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded ${
                              routing > 500
                                ? "bg-destructive/10 text-destructive font-semibold"
                                : routing > 200
                                  ? "bg-amber-500/10 text-amber-600 font-medium"
                                  : "text-muted-foreground"
                            }`}
                            title={
                              row.routingLatencyMs
                                ? `Total ${row.latencyMs} ms · Routing ${row.routingLatencyMs} ms`
                                : undefined
                            }
                          >
                            {row.latencyMs} ms
                            {row.routingLatencyMs ? (
                              <span className="text-[10px] text-muted-foreground/70 ml-1">
                                ({row.routingLatencyMs}r)
                              </span>
                            ) : null}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="w-[180px] text-right text-xs text-muted-foreground font-mono whitespace-nowrap">
                      <span suppressHydrationWarning>{formatDate(row.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/15 border-b border-border/80">
                      <TableCell colSpan={6} className="p-0 max-w-0">
                        <div className="p-4 sm:p-5 max-w-full overflow-hidden">
                          <div className="flex flex-col gap-3 max-w-full overflow-hidden">
                            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Code2 className="size-3.5 text-primary" /> API Telemetry Inspector
                              </span>
                              <span>Trace ID #{row.id}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full overflow-hidden">
                              <CodeBlock
                                code={`# Replay request via Axum Rust Gateway\ncurl -X ${row.method} "${typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://gateway.openwrapper.muejam.com"}${row.endpoint}" \\\n  -H "Authorization: Bearer \${OPENWRAPPER_KEY}" \\\n  -H "Content-Type: application/json"`}
                                language="bash"
                                title="Replay cURL"
                                filename="replay.sh"
                                showLineNumbers={true}
                                className="max-w-full"
                              />
                              <JsonViewer
                                data={{
                                  id: row.id,
                                  method: row.method,
                                  endpoint: row.endpoint,
                                  statusCode: row.statusCode,
                                  latencyMs: row.latencyMs,
                                  routingLatencyMs: row.routingLatencyMs,
                                  ipAddress: row.ipAddress,
                                  createdAt: row.createdAt,
                                }}
                                title="Telemetry JSON Payload"
                                filename={`trace_${row.id}.json`}
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

export const LiveTelemetryTable = LiveRequestTelemetryTable
export default LiveRequestTelemetryTable
