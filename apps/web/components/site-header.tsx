import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-border/80 transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-semibold text-base tracking-tight text-foreground">
              OpenWrapper
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            <Link href="#product" className="transition-colors hover:text-foreground">
              Product
            </Link>
            <Link href="#providers" className="transition-colors hover:text-foreground">
              Providers
            </Link>
            <Link href="#developers" className="transition-colors hover:text-foreground">
              Developers
            </Link>
            <Link href="#regional" className="transition-colors hover:text-foreground">
              Regional Rails
            </Link>
            <Link href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            size="sm"
            className="rounded-md font-semibold text-xs px-3.5 h-9 bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all"
            asChild
          >
            <Link href="/sign-up">
              Get started <ArrowRight className="size-3.5 ml-1 inline" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
