export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-8 p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-muted/60" />
        <div className="h-8 w-64 rounded-md bg-muted/80" />
        <div className="h-4 w-96 rounded bg-muted/50" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-5 shadow-2xs"
          >
            <div className="h-3 w-20 rounded bg-muted/60" />
            <div className="h-7 w-32 rounded bg-muted/80" />
            <div className="h-3 w-28 rounded bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-80 w-full rounded-xl border border-border/70 bg-card p-6 shadow-2xs">
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 w-36 rounded bg-muted/60" />
          <div className="h-7 w-28 rounded bg-muted/50" />
        </div>
        <div className="h-52 w-full rounded bg-muted/20" />
      </div>

      {/* Tables/Split Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-border/70 bg-card p-6 shadow-2xs">
          <div className="h-4 w-40 rounded bg-muted/60 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 w-full rounded bg-muted/30" />
            ))}
          </div>
        </div>
        <div className="h-64 rounded-xl border border-border/70 bg-card p-6 shadow-2xs">
          <div className="h-4 w-40 rounded bg-muted/60 mb-4" />
          <div className="h-40 rounded bg-muted/20" />
        </div>
      </div>
    </div>
  )
}
