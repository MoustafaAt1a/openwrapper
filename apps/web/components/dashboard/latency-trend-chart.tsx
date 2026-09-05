"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface LatencyBucket {
  label: string
  p50: number
  p95: number
  count: number
}

interface LatencyTrendChartProps {
  requests: Array<{ createdAt: string | Date; routingLatencyMs?: number | null; latencyMs: number }>
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

export function LatencyTrendChart({ requests }: LatencyTrendChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const buckets = useMemo((): LatencyBucket[] => {
    const byHour = new Map<string, number[]>()
    const now = Date.now()
    for (const r of requests) {
      const t = new Date(r.createdAt).getTime()
      if (now - t > 24 * 60 * 60 * 1000) continue
      const hour = new Date(t)
      hour.setMinutes(0, 0, 0)
      const key = hour.toISOString()
      const sample = Number(r.routingLatencyMs ?? r.latencyMs)
      if (!Number.isFinite(sample) || sample <= 0 || sample >= 2000) continue
      const arr = byHour.get(key) ?? []
      arr.push(sample)
      byHour.set(key, arr)
    }
    return Array.from(byHour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([iso, values]) => ({
        label: new Date(iso).toLocaleTimeString("en-US", { hour: "numeric" }),
        p50: percentile(values, 50),
        p95: percentile(values, 95),
        count: values.length,
      }))
  }, [requests])

  if (!buckets.length) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center">
        <p className="text-xs font-medium text-foreground">
          No routing telemetry samples in the last 24 hours
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground max-w-sm">
          Internal proxy routing latency is recorded for requests sent through the API gateway.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-foreground" />
            P50 Median Latency
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-muted-foreground/70" />
            P95 Tail Latency
          </span>
        </div>
        <span className="text-[11px] font-mono">Excludes provider network RTT</span>
      </div>

      <div className="h-48 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={buckets} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                unit="ms"
                width={40}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const p50 = payload.find((p) => p.dataKey === "p50")?.value
                  const p95 = payload.find((p) => p.dataKey === "p95")?.value
                  const count = (payload[0]?.payload as LatencyBucket)?.count ?? 0
                  return (
                    <div className="rounded-lg border border-border/80 bg-popover/95 p-3 text-xs shadow-md backdrop-blur-xs font-mono">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-foreground mt-1 font-medium">P50: {p50} ms</p>
                      <p className="text-muted-foreground">P95: {p95} ms</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1 border-t border-border/60 pt-1">
                        {count} samples
                      </p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="p50"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={false}
                name="P50"
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="P95"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-lg bg-muted/30" />
        )}
      </div>
    </div>
  )
}
