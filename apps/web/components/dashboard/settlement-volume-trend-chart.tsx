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
import type { ChartDataPoint } from "@/lib/dashboard-telemetry-service"
import { formatMinorUnits } from "@/lib/utils"

interface VolumeTrendChartProps {
  weeklyData: ChartDataPoint[]
  monthlyData: ChartDataPoint[]
}

export function SettlementVolumeTrendChart({ weeklyData, monthlyData }: VolumeTrendChartProps) {
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
      {/* Non-visual accessibility fallback table */}
      <div className="sr-only" aria-live="polite">
        <h4>
          Settlement Volume Trend Summary ({timeframe === "7d" ? "Past 7 Days" : "Past 30 Days"})
        </h4>
        <p>
          Total settled volume: {formatMinorUnits(totalSettled, "EGP")}. Total gateway errors:{" "}
          {totalErrors}.
        </p>
        <table>
          <caption>Daily settlement volume and error count</caption>
          <thead>
            <tr>
              <th scope="col">Date/Day</th>
              <th scope="col">Settled Volume</th>
              <th scope="col">Errors</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td>{formatMinorUnits(d.settledVolume, "EGP")}</td>
                <td>{d.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden="false">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(83,58,253,0.6)]" />
            Settled Volume (EGP)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(234,34,97,0.6)]" />
            Gateway Errors
          </span>
        </div>

        <div className="flex rounded-full border border-border bg-secondary p-0.5 font-mono">
          {(["7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground shadow-xs font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf === "7d" ? "Past 7 Days" : "Past 30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <p className="text-base font-light font-tnum tracking-tight text-foreground">
          {formatMinorUnits(totalSettled, "EGP")}{" "}
          <span className="text-xs font-normal text-muted-foreground">settled in window</span>
        </p>
        {totalErrors > 0 && (
          <p className="font-mono text-xs text-destructive font-medium">
            {totalErrors.toLocaleString()} total errors
          </p>
        )}
      </div>

      <div className="relative h-64 w-full" aria-hidden="true">
        {!mounted ? (
          <div className="h-full animate-pulse rounded-xl bg-muted/40" />
        ) : !hasActivity ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
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
                  <stop offset="5%" stopColor="#533afd" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#533afd" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                interval={timeframe === "30d" ? 4 : 0}
              />
              <YAxis
                yAxisId="volume"
                domain={[0, maxVolume]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                tickFormatter={(v) => formatMinorUnits(v, "EGP")}
              />
              <YAxis
                yAxisId="errors"
                orientation="right"
                domain={[0, maxErrors]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{
                  fill: "var(--destructive)",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
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
                    <div className="rounded-xl border border-border bg-popover/95 p-3 text-xs stripe-card-shadow-lg backdrop-blur-md font-mono">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-primary mt-1 font-medium">
                        Settled: {formatMinorUnits(settled, "EGP")}
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
                stroke="#533afd"
                strokeWidth={2.5}
              />
              <Bar
                yAxisId="errors"
                dataKey="errors"
                fill="#ea2261"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export const VolumeTrendChart = SettlementVolumeTrendChart
export default SettlementVolumeTrendChart
