import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"

import { Geist, Geist_Mono } from "next/font/google"
import { StructuredData } from "@/components/json-ld"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

const siteUrl =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenWrapper — Unified Payment Gateway & Routing for Paymob, Fawry, and Stripe",
    template: "%s — OpenWrapper",
  },
  description:
    "Provider-neutral payment infrastructure and stateless routing for Egypt, MENA, and global markets. Unify Paymob, Fawry, Meeza, Vodafone Cash, InstaPay, and Stripe through one standardized API.",
  keywords: [
    "OpenWrapper",
    "Paymob API",
    "Fawry Gateway",
    "Egypt Payment Gateway",
    "Meeza Card Integration",
    "Vodafone Cash Payment API",
    "InstaPay Egypt",
    "Stripe Egypt Integration",
    "Unified Payment API",
    "Stateless Payment Gateway",
    "MENA Fintech Payment Rails",
    "Payment Gateway Aggregator",
    "PHP Payment SDK",
    "TypeScript Payment SDK",
    "Multi-Gateway Telemetry",
  ],
  authors: [{ name: "OpenWrapper Core Team", url: "https://github.com/MoustafaAt1a/openwrapper" }],
  creator: "OpenWrapper",
  publisher: "OpenWrapper",
  applicationName: "OpenWrapper",
  category: "Fintech & Developer Tools",
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "ar-EG": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_EG", "en_EG"],
    url: siteUrl,
    siteName: "OpenWrapper",
    title: "OpenWrapper — Unified Payment Gateway for Paymob, Fawry, and Stripe",
    description:
      "A stable, observable, and stateless API layer for Paymob, Fawry, Stripe, cards, mobile wallets, and retail kiosk codes.",
    images: [
      {
        url: "/openwrapper-logo.jpeg",
        width: 1200,
        height: 630,
        alt: "OpenWrapper Unified Payment Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenWrapper — Unified Payment Gateway for Paymob, Fawry, and Stripe",
    description:
      "Stateless, zero-storage payment infrastructure for Egypt & MENA. Unify cards, mobile wallets, and kiosk references.",
    images: ["/openwrapper-logo.jpeg"],
    creator: "@openwrapper",
  },
  other: {
    "geo.region": "EG-C",
    "geo.placename": "Cairo, Egypt",
    "geo.position": "30.0444;31.2357",
    ICBM: "30.0444, 31.2357",
    "DC.title": "OpenWrapper Unified Payment Gateway",
    rating: "General",
  },
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f9fa",
  userScalable: true,
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="light bg-background text-foreground"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <StructuredData siteUrl={siteUrl} />
      </head>
      <body
        className={`${geist.className} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
