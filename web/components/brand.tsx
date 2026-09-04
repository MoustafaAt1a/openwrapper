import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}
      aria-label="OpenWrapper home"
    >
      <Image
        src="/openwrapper-icon.jpeg"
        alt=""
        width={34}
        height={34}
        className="size-8 rounded-lg object-cover"
        priority
      />
      {!compact && <span className="text-base">OpenWrapper</span>}
    </Link>
  )
}
