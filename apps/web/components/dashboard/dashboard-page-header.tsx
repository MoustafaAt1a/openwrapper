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

export function DashboardPageHeader({ title, description, backHref, actions, className }: PageHeaderProps) {
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
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-xs text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white px-2.5 py-1 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-mono"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Link>
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-light tracking-[-0.03em] text-[#0d253d] dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
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

