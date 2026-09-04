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
      }))
  }, [requests])

  if (!buckets.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No routing latency samples in the last 24 hours.
      </p>
    )
  }

  return (
    <div className="h-48 w-full">
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="ms" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
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
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={false}
              name="P95"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full animate-pulse rounded-lg bg-muted/30" />
      )}
    </div>
  )
}
