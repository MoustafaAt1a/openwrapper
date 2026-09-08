import Link from "next/link"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"

export const metadata = {
  title: "Terms of Service — OpenWrapper",
  description:
    "Terms governing the use of the OpenWrapper unified payment gateway, SDKs, and developer platform.",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GlobalHeaderNavigation />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#0d253d] dark:text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-[#64748d] dark:text-[#8ca3ba] font-light">
            Last updated September 2026
          </p>
        </header>

        <article className="prose-sm flex flex-col gap-8 text-[#273951] dark:text-[#c2d1e0] leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Acceptance of terms
            </h2>
            <p className="text-sm leading-relaxed">
              By accessing or using the OpenWrapper platform, gateway API, SDKs, or developer
              dashboard, you agree to be bound by these terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Service description
            </h2>
            <p className="text-sm leading-relaxed">
              OpenWrapper provides a provider-neutral payment gateway and routing layer that
              connects your application to upstream payment processors (Paymob, Fawry, Stripe, and
              others). OpenWrapper is not a payment processor itself — we route, normalize, and
              observe payment transactions on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              API usage and rate limits
            </h2>
            <ul className="text-sm leading-relaxed flex flex-col gap-2 list-disc pl-5">
              <li>
                All API requests must include a valid API key via the{" "}
                <code className="font-mono text-xs bg-[#f6f9fc] dark:bg-[#141b33] px-1.5 py-0.5 rounded">
                  Authorization
                </code>{" "}
                header
              </li>
              <li>
                POST requests to payment endpoints must include an{" "}
                <code className="font-mono text-xs bg-[#f6f9fc] dark:bg-[#141b33] px-1.5 py-0.5 rounded">
                  Idempotency-Key
                </code>{" "}
                header
              </li>
              <li>
                Rate limits are enforced per API key (60 req/min for payments, 120 req/min for
                reads)
              </li>
              <li>Exceeding rate limits returns HTTP 429 with a Retry-After header</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Monetary amounts
            </h2>
            <p className="text-sm leading-relaxed">
              All monetary values in the OpenWrapper API are expressed as integer minor units (e.g.,
              cents for USD, piasters for EGP). You must never send floating-point numbers for
              currency amounts. OpenWrapper will reject requests containing non-integer amount
              values.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Provider credentials
            </h2>
            <p className="text-sm leading-relaxed">
              You are responsible for the security of your payment provider credentials. When using
              Stateless Zero-Knowledge Mode, credentials are passed via TLS headers and are never
              stored by OpenWrapper. When using ambient environment configuration, credentials are
              held in memory only and are not persisted to disk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Limitation of liability
            </h2>
            <p className="text-sm leading-relaxed">
              OpenWrapper is provided &ldquo;as is&rdquo; without warranty of any kind. OpenWrapper
              is not liable for any payment processing failures, declined transactions, or losses
              arising from the use of upstream payment providers. Transaction disputes and
              chargebacks are handled directly between you and the relevant payment processor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Open source license
            </h2>
            <p className="text-sm leading-relaxed">
              The OpenWrapper gateway engine and SDKs are open source software. The source code is
              available on{" "}
              <Link
                href="https://github.com/MoustafaAt1a/openwrapper"
                className="text-[#533afd] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </Link>
              . The hosted platform (dashboard, telemetry, managed infrastructure) is a separate
              commercial offering.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-3">
              Changes to terms
            </h2>
            <p className="text-sm leading-relaxed">
              We may update these terms from time to time. Material changes will be communicated via
              the developer dashboard or email. Continued use of the platform after changes
              constitutes acceptance.
            </p>
          </section>
        </article>
      </div>

      <GlobalFooterNavigation />
    </main>
  )
}
