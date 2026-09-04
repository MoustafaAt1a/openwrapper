"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ProviderMixPoint } from "@/lib/dashboard-data"

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)"]

interface ProviderMixChartProps {
  data: ProviderMixPoint[]
}

export function ProviderMixChart({ data }: ProviderMixChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const chartData = data.length
    ? data.map((d) => ({ name: d.provider, value: d.count }))
    : [{ name: "none", value: 1 }]

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <p className="text-sm font-medium text-foreground">Provider mix</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="h-36 w-36 shrink-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={data.length ? COLORS[i % COLORS.length] : "var(--muted)"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} payments`, String(name)]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-full bg-muted/30" />
          )}
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2 text-sm sm:flex-1">
          {data.length === 0 ? (
            <li className="text-muted-foreground">No payments yet</li>
          ) : (
            data.map((d, i) => {
              const pct = total ? Math.round((d.count / total) * 100) : 0
              return (
                <li key={d.provider} className="flex min-w-0 items-center gap-2 capitalize">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="shrink-0 text-foreground">{d.provider}</span>
                  <span className="truncate text-muted-foreground">
                    {d.count.toLocaleString()} ({pct}%)
                  </span>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
