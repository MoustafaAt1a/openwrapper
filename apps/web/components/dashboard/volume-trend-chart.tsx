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
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 font-medium text-[#0d253d] dark:text-white">
            <span className="size-2 rounded-full bg-[#533afd] shadow-[0_0_8px_rgba(83,58,253,0.6)]" />
            Settled Volume (EGP)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#64748d] dark:text-[#8ca3ba]">
            <span className="size-2 rounded-full bg-[#ea2261] shadow-[0_0_8px_rgba(234,34,97,0.6)]" />
            Gateway Errors
          </span>
        </div>

        <div className="flex rounded-full border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-0.5 font-mono">
          {(["7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                timeframe === tf
                  ? "bg-[#533afd] text-white shadow-xs font-medium"
                  : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
              }`}
            >
              {tf === "7d" ? "Past 7 Days" : "Past 30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <p className="text-base font-light font-tnum tracking-tight text-[#0d253d] dark:text-white">
          {(totalSettled / 100).toLocaleString("en-EG", { style: "currency", currency: "EGP" })}{" "}
          <span className="text-xs font-normal text-[#64748d] dark:text-[#8ca3ba]">
            settled in window
          </span>
        </p>
        {totalErrors > 0 && (
          <p className="font-mono text-xs text-[#ea2261] font-medium">
            {totalErrors.toLocaleString()} total errors
          </p>
        )}
      </div>

      <div className="relative h-64 w-full">
        {!mounted ? (
          <div className="h-full animate-pulse rounded-xl bg-black/[0.03] dark:bg-white/[0.03]" />
        ) : !hasActivity ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#111630]/30 p-6 text-center">
            <p className="text-xs font-medium text-[#0d253d] dark:text-white">
              No settled transaction volume or errors in the{" "}
              {timeframe === "7d" ? "last 7 days" : "last 30 days"}.
            </p>
            <p className="mt-1 text-[11px] text-[#64748d] dark:text-[#8ca3ba] max-w-sm">
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
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(140, 163, 186, 0.15)"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8ca3ba", fontSize: 11, fontFamily: "monospace" }}
                interval={timeframe === "30d" ? 4 : 0}
              />
              <YAxis
                yAxisId="volume"
                domain={[0, maxVolume]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "#8ca3ba", fontSize: 11, fontFamily: "monospace" }}
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
                tick={{ fill: "#ea2261", fontSize: 11, fontFamily: "monospace" }}
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
                    <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white/95 dark:bg-[#0c1024]/95 p-3 text-xs shadow-xl backdrop-blur-md font-mono">
                      <p className="font-semibold text-[#0d253d] dark:text-white">{label}</p>
                      <p className="text-[#533afd] mt-1 font-medium">
                        Settled: {(settled / 100).toFixed(2)} EGP
                      </p>
                      {errors > 0 ? (
                        <p className="text-[#ea2261] font-medium mt-0.5">
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
