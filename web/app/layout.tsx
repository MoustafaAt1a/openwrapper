import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })


export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: { default: "OpenWrapper — One API for every payment provider", template: "%s — OpenWrapper" },
  description: "A stable, observable, and idempotent API layer for Paymob, Fawry, Stripe, and global gateways.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/openwrapper-icon.jpeg" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "OpenWrapper — One API for every payment provider",
    description: "Unify Paymob, Fawry, Stripe, and global payment rails with zero vendor lock-in.",
    images: [{ url: "/openwrapper-logo.jpeg", width: 1200, height: 630, alt: "OpenWrapper Platform" }],
  },
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f9fa",
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light bg-background text-foreground" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${geist.className} ${geistMono.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>

        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {process.env.NODE_ENV === "production" && <Analytics />}
        <Script
          src="https://cdn.aidesigner.ai/effects/runtime/v1.js"
          strategy="afterInteractive"
          data-aifx-key="aifx_pk_21a96f8f1d2340e6917137c31b03983d"
        />
      </body>
    </html>
  )
}

