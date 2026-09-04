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
  const maxVolume = Math.max(10000, ...data.map((d) => d.settledVolume))
  const maxErrors = Math.max(5, ...data.map((d) => d.errors))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-foreground" />
            Settled volume (EGP)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-destructive" />
            API errors
          </span>
        </div>
        <div className="flex rounded-lg bg-muted p-0.5">
          {(["7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf === "7d" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {(totalSettled / 100).toLocaleString("en-EG", { style: "currency", currency: "EGP" })}{" "}
        settled in period
      </p>

      <div className="h-64 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 8, left: -6, bottom: 4 }}>
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
                width={44}
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
                width={40}
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
                    <div className="rounded-lg border border-border/80 bg-popover/95 p-3 text-xs shadow-md backdrop-blur-xs">
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
                fill="var(--foreground)"
                fillOpacity={0.08}
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
        ) : (
          <div className="h-full animate-pulse rounded-lg bg-muted/30" />
        )}
      </div>
    </div>
  )
}
