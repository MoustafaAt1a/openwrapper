"use client"

import { ArrowRight, Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface NavLinkItem {
  id: string
  href: string
  label: string
}

const NAV_LINKS: NavLinkItem[] = [
  { id: "product", href: "/#product", label: "Products" },
  { id: "regional", href: "/#regional", label: "Sovereign Rails" },
  { id: "developers", href: "/#developers", label: "Developers" },
  { id: "sdks", href: "/sdk", label: "SDKs" },
  { id: "pricing", href: "/#pricing", label: "Pricing" },
  { id: "faq", href: "/#faq", label: "FAQ" },
]

export function GlobalHeaderNavigation() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<string>("")
  const [isScrolled, setIsScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  // Fast, passive, requestAnimationFrame-throttled scroll listener
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 12)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    if (pathname.startsWith("/sdk")) {
      setActiveSection("sdks")
      return
    }

    if (pathname !== "/") {
      setActiveSection("")
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    )

    const sections = NAV_LINKS.filter((item) => item.href.startsWith("/#"))
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    for (const el of sections) {
      observer.observe(el)
    }

    return () => {
      for (const el of sections) {
        observer.unobserve(el)
      }
    }
  }, [pathname])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: NavLinkItem) => {
    setOpen(false)

    // For non-hash routes (e.g. /sdk), allow Next.js Link to handle normal page navigation
    if (!link.href.startsWith("/#")) {
      return
    }

    // If on homepage, smoothly scroll to section
    if (pathname === "/") {
      e.preventDefault()
      const target = document.getElementById(link.id)
      if (target) {
        target.scrollIntoView({ behavior: "smooth" })
        setActiveSection(link.id)
        window.history.pushState(null, "", `#${link.id}`)
      }
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? "border-b border-border/80 bg-background/80 backdrop-blur-md stripe-card-shadow-xs"
          : "border-b border-transparent bg-transparent"
      }`}
      style={{
        contain: "layout style",
        willChange: "backdrop-filter, background-color",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Column: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-border transition-transform duration-200 group-hover:scale-105 shrink-0"
              priority
            />
            <span className="font-semibold text-[15px] tracking-tight text-foreground">
              OpenWrapper
            </span>
          </Link>
        </div>

        {/* Center Column: Perfectly Centered Primary Navigation */}
        <nav
          className="hidden md:flex items-center justify-center gap-1 lg:gap-1.5"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`px-3 py-1.5 rounded-full text-[13.5px] transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "text-foreground font-medium bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Column: Actions (Theme Toggle + Sign in + Primary Pill Button) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <ThemeToggle />

          <Link
            href="/login"
            className="hidden sm:inline-flex text-[13.5px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-muted transition-all"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-deep active:bg-primary-press text-primary-foreground px-4 py-1.5 text-xs sm:text-[13px] font-medium stripe-card-shadow-xs hover:stripe-card-shadow-md transition-all shrink-0 whitespace-nowrap"
          >
            <span>Get started</span>
            <ArrowRight className="size-3.5" />
          </Link>

          {/* Mobile Navigation Sheet */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    pill
                    aria-label="Toggle navigation menu"
                    className="size-9 border-border"
                  >
                    <Menu className="size-4" />
                  </Button>
                }
              />
              <SheetContent side="right" className="w-72 p-6 flex flex-col justify-between">
                <div>
                  <SheetTitle className="flex items-center gap-2.5 pb-6 border-b border-border/60">
                    <Image
                      src="/openwrapper-icon.jpeg"
                      alt="OpenWrapper"
                      width={24}
                      height={24}
                      className="size-6 rounded-md object-cover"
                    />
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      OpenWrapper
                    </span>
                  </SheetTitle>

                  <nav className="flex flex-col gap-1.5 pt-6" aria-label="Mobile navigation">
                    {NAV_LINKS.map((link) => {
                      const isActive = activeSection === link.id
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={(e) => handleNavClick(e, link)}
                          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "font-medium text-primary bg-primary/10"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                    <div className="my-2 border-t border-border/40" />
                    <Link
                      href="/dashboard/documentation"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      API Explorer & SDKs
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      Live Checkout Demo
                    </Link>
                  </nav>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button variant="outline" pill className="w-full text-xs font-semibold" asChild>
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    pill
                    className="w-full text-xs font-semibold bg-primary hover:bg-primary-deep text-primary-foreground"
                    asChild
                  >
                    <Link href="/register" onClick={() => setOpen(false)}>
                      Start Building Free
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}

export const SiteHeader = GlobalHeaderNavigation
export default GlobalHeaderNavigation
