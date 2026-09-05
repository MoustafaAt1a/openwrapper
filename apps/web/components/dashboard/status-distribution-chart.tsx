"use client"

interface StatusDistributionChartProps {
  requests: Array<{ statusCode: number }>
}

export function StatusDistributionChart({ requests }: StatusDistributionChartProps) {
  const total = requests.length

  if (!total) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center">
        <p className="text-xs font-medium text-foreground">No API requests recorded</p>
        <p className="mt-1 text-[11px] text-muted-foreground max-w-xs">
          HTTP status distribution will automatically populate as gateway calls are made.
        </p>
      </div>
    )
  }

  const s2xx = requests.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length
  const s4xx = requests.filter((r) => r.statusCode >= 400 && r.statusCode < 500).length
  const s5xx = requests.filter((r) => r.statusCode >= 500).length
  const s3xx = total - s2xx - s4xx - s5xx

  const p2xx = (s2xx / total) * 100
  const p4xx = (s4xx / total) * 100
  const p5xx = (s5xx / total) * 100
  const p3xx = (s3xx / total) * 100

  return (
    <div className="flex flex-col gap-4">
      {/* Stacked Proportional Bar */}
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted/50 p-0.5 border border-border/60">
        {s2xx > 0 && (
          <div
            style={{ width: `${p2xx}%` }}
            className="h-full rounded-l-full bg-emerald-500 transition-all"
            title={`2xx Success: ${s2xx} (${p2xx.toFixed(1)}%)`}
          />
        )}
        {s3xx > 0 && (
          <div
            style={{ width: `${p3xx}%` }}
            className="h-full bg-blue-500 transition-all"
            title={`3xx Redirect: ${s3xx} (${p3xx.toFixed(1)}%)`}
          />
        )}
        {s4xx > 0 && (
          <div
            style={{ width: `${p4xx}%` }}
            className="h-full bg-amber-500 transition-all"
            title={`4xx Client Error: ${s4xx} (${p4xx.toFixed(1)}%)`}
          />
        )}
        {s5xx > 0 && (
          <div
            style={{ width: `${p5xx}%` }}
            className="h-full rounded-r-full bg-destructive transition-all"
            title={`5xx Gateway Error: ${s5xx} (${p5xx.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* Legend & Count Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground font-mono">2xx Success</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {s2xx} ({p2xx.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2.5">
          <span className="size-2 rounded-full bg-amber-500" />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground font-mono">4xx Client Error</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {s4xx} ({p4xx.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2.5 col-span-2 sm:col-span-1">
          <span className="size-2 rounded-full bg-destructive" />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground font-mono">5xx Gateway Error</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {s5xx} ({p5xx.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
