export function StructuredData({ siteUrl }: { siteUrl: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "OpenWrapper",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/openwrapper-icon.jpeg`,
          caption: "OpenWrapper Logo",
        },
        description:
          "Unified, provider-neutral payment gateway abstraction layer for Paymob, Fawry, Stripe, and MENA payment rails.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Cairo",
          addressRegion: "Cairo Governorate",
          addressCountry: "EG",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "technical support",
          availableLanguage: ["English", "Arabic"],
        },
        sameAs: ["https://github.com/MoustafaAt1a/openwrapper"],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "OpenWrapper Payment Gateway",
        applicationCategory: "FinancialApplication",
        operatingSystem: "All (Cloud Native, Linux, Windows, macOS, Docker)",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Enterprise-grade unified payment API and stateless routing engine supporting Paymob, Fawry, Stripe, cards, mobile wallets, and retail kiosk codes.",
        softwareRequirements: "Node.js >= 18, Rust >= 1.80, or PHP >= 8.1",
        featureList: [
          "Stateless Zero-Storage Merchant Key Routing",
          "Paymob Card & Mobile Wallet Integration (Vodafone Cash, InstaPay, Meeza)",
          "Fawry Retail Kiosk Code Generation",
          "Stripe Hosted Checkout Sessions",
          "Normalized Cryptographic Webhook Delivery",
          "Sub-millisecond Routing Latency with Telemetry",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is OpenWrapper?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OpenWrapper is a unified payment gateway abstraction layer and telemetry platform. It enables developers to integrate Paymob, Fawry, and Stripe through a single standardized API with zero vendor lock-in.",
            },
          },
          {
            "@type": "Question",
            name: "How does OpenWrapper ensure merchant key security with zero storage?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OpenWrapper operates on a stateless per-request architecture. Merchant provider keys (Paymob secret keys, Fawry secure keys, Stripe secret keys) remain inside the merchant's application .env and are passed statelessly over encrypted TLS headers. OpenWrapper never persists secret keys to the database.",
            },
          },
          {
            "@type": "Question",
            name: "What Egyptian payment methods are supported by OpenWrapper?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "OpenWrapper supports Visa, MasterCard, Meeza national cards, all Egyptian mobile wallets (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay), InstaPay direct transfers via Paymob, and retail kiosk cash reference codes via Fawry.",
            },
          },
          {
            "@type": "Question",
            name: "How do I install the OpenWrapper SDK?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "For TypeScript/Node.js, install via npm: 'npm install @openwrapper/sdk'. For PHP/Laravel, install via Composer: 'composer require moustafaat1a/openwrapper-php'.",
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  )
}
