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

export function PageHeader({ title, description, backHref, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="flex flex-col gap-1">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
