"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ChartDataPoint {
  day: string
  requests: number
  errors: number
}

export function UsageChart({ data }: { data: ChartDataPoint[] }) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = data.length
    ? data
    : [
        { day: "Mon", requests: 12, errors: 0 },
        { day: "Tue", requests: 28, errors: 1 },
        { day: "Wed", requests: 45, errors: 0 },
        { day: "Thu", requests: 62, errors: 2 },
        { day: "Fri", requests: 89, errors: 1 },
        { day: "Sat", requests: 110, errors: 0 },
        { day: "Sun", requests: 95, errors: 0 },
      ]

  return (
    <div className="flex flex-col gap-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-xs bg-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Successful API Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-xs bg-muted-foreground/40" />
            <span className="font-mono text-xs text-muted-foreground">Errors</span>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setTimeframe("7d")}
            className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
              timeframe === "7d"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("30d")}
            className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
              timeframe === "30d"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Recharts Minimal Bar Chart */}
      <div className="relative h-64 w-full min-w-0" style={{ height: "256px", minHeight: "256px", width: "100%" }}>
        {mounted ? (
          <ResponsiveContainer
            width="100%"
            height={256}
            minWidth={100}
            minHeight={200}
          >
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                dy={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-popover p-3 shadow-lg font-mono text-xs">
                        <p className="font-semibold text-popover-foreground mb-1">{label}</p>
                        <div className="flex flex-col gap-1 text-muted-foreground">
                          <div className="flex items-center justify-between gap-4">
                            <span>Requests:</span>
                            <span className="font-bold text-foreground">{payload[0]?.value}</span>
                          </div>
                          {Number(payload[1]?.value) > 0 && (
                            <div className="flex items-center justify-between gap-4 text-destructive">
                              <span>Errors:</span>
                              <span className="font-bold">{payload[1]?.value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="requests" fill="var(--foreground)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="errors" fill="var(--destructive)" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-lg bg-muted/20 animate-pulse" />
        )}
      </div>

    </div>
  )
}

