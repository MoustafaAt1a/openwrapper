import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardPageHeader({
  title,
  description,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-2",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 -ml-2 rounded-full hover:bg-muted transition-colors font-mono"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Link>
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground font-display">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground font-light leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export const PageHeader = DashboardPageHeader
export default DashboardPageHeader
