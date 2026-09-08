import Link from "next/link"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"

export const metadata = {
  title: "Privacy Policy — OpenWrapper",
  description:
    "How OpenWrapper collects, processes, and protects your data. Our zero-knowledge architecture means merchant secrets never touch disk storage.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      <GlobalHeaderNavigation />

      <div className="relative isolate flex-1 overflow-hidden py-16 sm:py-24">
        <AtmosphericGradientMesh className="opacity-40 dark:opacity-20" />
        <StripeSwoosh className="opacity-30 dark:opacity-15" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground font-light">Last updated September 2026</p>
          </header>

          <article className="prose-sm flex flex-col gap-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">What we collect</h2>
              <p className="text-sm leading-relaxed">
                OpenWrapper collects the minimum data required to operate the payment gateway and
                developer platform: account registration details (name, email), API request metadata
                (timestamps, endpoint paths, response codes), and aggregated transaction telemetry
                for your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">What we never store</h2>
              <p className="text-sm leading-relaxed">
                OpenWrapper operates in <strong>Stateless Zero-Knowledge Mode</strong> by design.
                Merchant provider credentials (Paymob API keys, Fawry secure keys, Stripe secret
                keys) are transmitted exclusively via encrypted TLS headers and are never persisted
                to any database, log file, or telemetry system. Cardholder data (PANs, CVVs,
                expiration dates) never enters the OpenWrapper perimeter — all card handling is
                delegated directly to the upstream payment processor.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">How we protect your data</h2>
              <ul className="text-sm leading-relaxed flex flex-col gap-2 list-disc pl-5">
                <li>All traffic encrypted with TLS 1.3 (256-bit) in transit</li>
                <li>Database credentials rotated automatically via environment injection</li>
                <li>Idempotency keys are scoped and time-limited to prevent replay attacks</li>
                <li>Rate limiting enforced per API key to prevent abuse</li>
                <li>
                  Webhook payloads verified with constant-time HMAC signature comparison to prevent
                  timing attacks
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">Third-party services</h2>
              <p className="text-sm leading-relaxed">
                We use Vercel for hosting and analytics, and Better Auth for session management.
                Payment processing is handled by the upstream providers you configure (Paymob,
                Fawry, Stripe). Each provider has its own privacy policy that governs the cardholder
                data they process.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">Your rights</h2>
              <p className="text-sm leading-relaxed">
                You can request export or deletion of your account data at any time by contacting
                us. API request logs are retained for 90 days for debugging purposes and are
                automatically purged thereafter.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-medium text-foreground mb-3">Contact</h2>
              <p className="text-sm leading-relaxed">
                For privacy-related inquiries, reach out at{" "}
                <Link
                  href="mailto:privacy@openwrapper.dev"
                  className="text-primary hover:underline"
                >
                  privacy@openwrapper.dev
                </Link>{" "}
                or open an issue on our{" "}
                <Link
                  href="https://github.com/MoustafaAt1a/openwrapper"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repository
                </Link>
                .
              </p>
            </section>
          </article>
        </div>
      </div>

      <GlobalFooterNavigation />
    </main>
  )
}
