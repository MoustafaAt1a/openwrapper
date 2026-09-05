"use client"

import { useEffect, useState } from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartDataPoint } from "@/lib/dashboard-data"

interface VolumeTrendChartProps {
  weeklyData: ChartDataPoint[]
  monthlyData: ChartDataPoint[]
}

export function VolumeTrendChart({ weeklyData, monthlyData }: VolumeTrendChartProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d")
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const data = timeframe === "7d" ? weeklyData : monthlyData
  const totalSettled = data.reduce((s, d) => s + d.settledVolume, 0)
  const totalErrors = data.reduce((s, d) => s + d.errors, 0)
  const hasActivity = totalSettled > 0 || totalErrors > 0

  const peakVolume = Math.max(0, ...data.map((d) => d.settledVolume))
  const maxVolume = peakVolume > 0 ? Math.ceil(peakVolume * 1.15) : 1000
  const peakErrors = Math.max(0, ...data.map((d) => d.errors))
  const maxErrors = peakErrors > 0 ? Math.max(4, Math.ceil(peakErrors * 1.2)) : 5

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-xs bg-foreground" />
            Settled volume (EGP)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-xs bg-destructive" />
            API errors (4xx/5xx)
          </span>
        </div>
        <div className="flex rounded-lg border border-border/80 bg-muted/40 p-0.5">
          {(["7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-all ${
                timeframe === tf
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf === "7d" ? "Past 7 Days" : "Past 30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {(totalSettled / 100).toLocaleString("en-EG", { style: "currency", currency: "EGP" })}{" "}
          <span className="text-xs font-normal text-muted-foreground">settled in this period</span>
        </p>
        {totalErrors > 0 && (
          <p className="font-mono text-xs text-destructive font-medium">
            {totalErrors.toLocaleString()} total errors
          </p>
        )}
      </div>

      <div className="relative h-64 w-full">
        {!mounted ? (
          <div className="h-full animate-pulse rounded-lg bg-muted/30" />
        ) : !hasActivity ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center">
            <p className="text-xs font-medium text-foreground">
              No settled transaction volume or errors in the{" "}
              {timeframe === "7d" ? "last 7 days" : "last 30 days"}.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground max-w-sm">
              Process payments via SDKs or the hosted checkout demo to populate real-time volume
              curves.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 8, left: -6, bottom: 4 }}>
              <defs>
                <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={timeframe === "30d" ? 4 : 0}
              />
              <YAxis
                yAxisId="volume"
                domain={[0, maxVolume]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => `${(v / 100).toFixed(0)}`}
              />
              <YAxis
                yAxisId="errors"
                orientation="right"
                domain={[0, maxErrors]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fill: "var(--destructive)", fontSize: 11 }}
                tickFormatter={(v) => Number(v).toLocaleString()}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const settled = Number(
                    payload.find((p) => p.dataKey === "settledVolume")?.value ?? 0,
                  )
                  const errors = Number(payload.find((p) => p.dataKey === "errors")?.value ?? 0)
                  return (
                    <div className="rounded-lg border border-border/80 bg-popover/95 p-3 text-xs shadow-md backdrop-blur-xs font-mono">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-muted-foreground mt-1">
                        Settled: {(settled / 100).toFixed(2)} EGP
                      </p>
                      {errors > 0 ? (
                        <p className="text-destructive font-medium mt-0.5">
                          Errors: {errors.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  )
                }}
              />
              <Area
                yAxisId="volume"
                type="monotone"
                dataKey="settledVolume"
                fill="url(#volumeAreaGradient)"
                stroke="var(--foreground)"
                strokeWidth={2}
              />
              <Bar
                yAxisId="errors"
                dataKey="errors"
                fill="var(--destructive)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
