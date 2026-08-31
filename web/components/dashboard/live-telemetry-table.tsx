"use client"

import { useState, useMemo } from "react"
import { Search, RotateCcw, Activity, ArrowUpDown } from "lucide-react"
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

export interface ApiRequestRecord {
  id: number
  endpoint: string
  method: string
  statusCode: number
  latencyMs: number
  ipAddress?: string | null
  createdAt: string | Date
}

interface Props {
  initialRequests: ApiRequestRecord[]
}

export function LiveTelemetryTable({ initialRequests }: Props) {
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortByLatency, setSortByLatency] = useState<boolean>(false)

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
      result = [...result].sort((a, b) => b.latencyMs - a.latencyMs)
    }

    return result
  }, [initialRequests, search, methodFilter, statusFilter, sortByLatency])

  const hasActiveFilters = search.trim() !== "" || methodFilter !== "all" || statusFilter !== "all" || sortByLatency

  const clearFilters = () => {
    setSearch("")
    setMethodFilter("all")
    setStatusFilter("all")
    setSortByLatency(false)
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
            placeholder="Search endpoint, method, status..."
            className="pl-8.5 h-8.5 font-mono text-xs bg-background/80 border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter */}
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-lg p-0.5">
            {["all", "POST", "GET", "OPTIONS"].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md uppercase transition-all ${
                  methodFilter === m
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-lg p-0.5">
            {[
              { id: "all", label: "All" },
              { id: "2xx", label: "2xx Success" },
              { id: "4xx", label: "4xx Client" },
              { id: "5xx", label: "5xx Server" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-all ${
                  statusFilter === s.id
                    ? "bg-secondary text-secondary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sort Latency Toggle */}
          <Button
            variant={sortByLatency ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSortByLatency(!sortByLatency)}
            className="h-8 text-xs font-mono border-border/80"
            title="Sort by highest latency"
          >
            <ArrowUpDown className="size-3 mr-1" />
            {sortByLatency ? "Slowest First" : "Default Sort"}
          </Button>

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

      {/* Filter Stats Badge */}
      <div className="flex items-center justify-between px-4 text-[11px] font-mono text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of {initialRequests.length} recorded calls
        </span>
        {hasActiveFilters && (
          <span className="text-primary text-[10px] font-medium">Filter active</span>
        )}
      </div>

      {/* Scrollable Table Container with Sticky Header */}
      <div className="max-h-[580px] overflow-y-auto overflow-x-auto border-t border-border/60">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card border-b border-border/80 shadow-2xs backdrop-blur-md">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-mono text-[11px] bg-card w-[100px]">Method</TableHead>
              <TableHead className="font-mono text-[11px] bg-card">Endpoint</TableHead>
              <TableHead className="font-mono text-[11px] bg-card w-[100px]">Status</TableHead>
              <TableHead className="font-mono text-[11px] bg-card w-[120px]">Latency</TableHead>
              <TableHead className="text-right font-mono text-[11px] bg-card">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Activity className="size-5 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-foreground">No telemetry entries found</p>
                    <p className="text-[11px] text-muted-foreground">
                      Try adjusting search terms or resetting the method/status filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
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
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {row.endpoint}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-xs font-bold ${
                        row.statusCode >= 500
                          ? "text-destructive"
                          : row.statusCode >= 400
                          ? "text-amber-500"
                          : row.statusCode === 201 || row.statusCode === 200
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {row.statusCode}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        row.latencyMs > 500
                          ? "bg-destructive/10 text-destructive font-semibold"
                          : row.latencyMs > 200
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.latencyMs} ms
                    </span>
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
