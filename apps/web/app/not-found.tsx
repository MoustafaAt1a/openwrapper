import { BookOpen, Home, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={26}
              height={26}
              className="size-6 rounded-md object-cover ring-1 ring-border/80"
            />
            <span className="font-semibold text-sm tracking-tight text-foreground">
              OpenWrapper
            </span>
          </Link>
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-muted-foreground border-border/80"
          >
            HTTP 404
          </Badge>
        </div>
      </header>

      {/* Center 404 Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6 animate-rise">
          {/* Glowing 404 Badge */}
          <div className="size-16 rounded-2xl bg-muted/30 border border-border/80 flex items-center justify-center font-mono text-xl font-bold text-foreground shadow-2xs">
            404
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              The page, endpoint, or resource you are looking for does not exist, has been moved, or
              is unauthorized.
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
            <Button size="sm" className="font-mono text-xs shadow-2xs flex-1" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="size-3.5 mr-1" /> Dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-border/80 flex-1"
              asChild
            >
              <Link href="/dashboard/documentation">
                <BookOpen className="size-3.5 mr-1" /> API Docs
              </Link>
            </Button>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            <Home className="size-3" /> Return to Homepage
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 py-4 px-6 text-center text-xs font-mono text-muted-foreground">
        OpenWrapper Unified Payment Gateway
      </footer>
    </div>
  )
}
