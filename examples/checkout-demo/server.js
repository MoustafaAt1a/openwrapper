import http from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { OpenWrapperClient } from "../../sdk/typescript/dist/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env file manually without external dotenv dependency
function loadEnv() {
  const envPath = join(__dirname, ".env")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}
loadEnv()

const PORT = Number(process.env.PORT) || 4000
const BASE_URL = process.env.OPENWRAPPER_BASE_URL || "https://web-production-884cd.up.railway.app"
const API_KEY = process.env.OPENWRAPPER_API_KEY || "ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr"

// Initialize OpenWrapper TypeScript SDK
const client = new OpenWrapperClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secureKey: process.env.FAWRY_SECURE_KEY,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  },
})

// HTML Checkout UI Template
const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenWrapper Checkout Store</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
        }
      }
    }
  </script>
  <style>
    body { background-color: #0b0c0e; color: #f3f4f6; font-family: 'Inter', sans-serif; }
    .glass { background: rgba(22, 24, 29, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glow-primary:hover { box-shadow: 0 0 24px rgba(16, 185, 129, 0.2); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-black">

  <!-- Top Navbar -->
  <header class="border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="size-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-black text-sm">
          OW
        </div>
        <div>
          <span class="font-bold text-sm tracking-tight text-white">Acme Store</span>
          <span class="text-[10px] font-mono block text-emerald-400">Powered by OpenWrapper SDK</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Gateway Connected
        </span>
      </div>
    </div>
  </header>

  <!-- Main Checkout Container -->
  <main class="max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
    <div class="grid lg:grid-cols-[1.2fr_1.8fr] gap-8 items-start">
      
      <!-- Order Summary Card -->
      <div class="glass rounded-2xl p-6 flex flex-col gap-6">
        <div class="border-b border-white/10 pb-4">
          <span class="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">Order Summary</span>
          <h2 class="text-xl font-bold text-white mt-1">OpenWrapper Pro Subscription</h2>
          <p class="text-xs text-white/50 mt-1">Full access to multi-gateway payments, webhooks, and telemetry.</p>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-white/5 text-sm">
          <span class="text-white/70">Plan Tier</span>
          <span class="font-mono font-medium text-white">Pro Monthly</span>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-white/5 text-sm">
          <span class="text-white/70">Billing Period</span>
          <span class="font-mono text-white">30 Days</span>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-white/5 text-sm">
          <span class="text-white/70">Taxes & Fees</span>
          <span class="font-mono text-emerald-400">EGP 0.00 (Included)</span>
        </div>

        <div class="flex items-baseline justify-between pt-2">
          <span class="font-semibold text-white">Total Due</span>
          <div class="text-right">
            <span class="font-mono text-3xl font-bold text-white" id="displayAmount">EGP 150.00</span>
            <span class="block text-[11px] font-mono text-white/40">(15,000 minor units)</span>
          </div>
        </div>

        <!-- Security Badge -->
        <div class="rounded-xl bg-white/[0.03] border border-white/5 p-3.5 flex items-center gap-3 text-xs text-white/60">
          <svg class="size-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>End-to-end encrypted routing. No sensitive card data is stored on merchant servers.</span>
        </div>
      </div>

      <!-- Payment Form -->
      <div class="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Select Payment Method</h1>
          <p class="text-xs text-white/50 mt-1">Complete your transaction securely via your preferred payment provider.</p>
        </div>

        <!-- Provider Selection Tabs -->
        <div class="grid grid-cols-3 gap-3" id="providerSelector">
          <!-- Paymob Option -->
          <button type="button" onclick="selectProvider('paymob')" id="btn-paymob" class="provider-card active border-2 border-emerald-500 bg-emerald-500/10 rounded-xl p-3.5 flex flex-col items-center gap-2 text-center transition-all">
            <span class="text-xs font-bold text-white">Paymob</span>
            <span class="text-[10px] font-mono text-white/60">Cards & Wallets</span>
          </button>

          <!-- Fawry Option -->
          <button type="button" onclick="selectProvider('fawry')" id="btn-fawry" class="provider-card border-2 border-white/10 bg-white/[0.02] rounded-xl p-3.5 flex flex-col items-center gap-2 text-center hover:border-white/20 transition-all">
            <span class="text-xs font-bold text-white">Fawry</span>
            <span class="text-[10px] font-mono text-white/60">Kiosk Reference</span>
          </button>

          <!-- Stripe Option -->
          <button type="button" onclick="selectProvider('stripe')" id="btn-stripe" class="provider-card border-2 border-white/10 bg-white/[0.02] rounded-xl p-3.5 flex flex-col items-center gap-2 text-center hover:border-white/20 transition-all">
            <span class="text-xs font-bold text-white">Stripe</span>
            <span class="text-[10px] font-mono text-white/60">International</span>
          </button>
        </div>

        <!-- Customer Input Fields -->
        <form id="checkoutForm" onsubmit="handleCheckout(event)" class="flex flex-col gap-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono text-white/70 mb-1.5 uppercase font-semibold">Full Name</label>
              <input type="text" id="custName" required value="Ahmed Ali" class="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-sans text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-mono text-white/70 mb-1.5 uppercase font-semibold">Phone (Required)</label>
              <input type="tel" id="custPhone" required value="+201001234567" class="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-sans text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-white/70 mb-1.5 uppercase font-semibold">Email Address</label>
            <input type="email" id="custEmail" required value="customer@example.com" class="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-sans text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>

          <div class="pt-2">
            <button type="submit" id="submitBtn" class="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 px-6 rounded-xl font-mono text-sm tracking-wide transition-all shadow-lg glow-primary flex items-center justify-center gap-2">
              <span id="btnText">Pay EGP 150.00 Now</span>
              <svg id="btnSpinner" class="hidden animate-spin size-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </button>
          </div>
        </form>

        <!-- Result Box / Action Display -->
        <div id="resultCard" class="hidden rounded-xl border border-white/10 bg-black/50 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <span class="font-mono text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-emerald-400 animate-ping"></span>
              Payment Created via SDK
            </span>
            <span class="text-[11px] font-mono text-white/50" id="resPaymentId"></span>
          </div>

          <!-- URL Redirect button -->
          <div id="urlSection" class="hidden flex flex-col gap-2">
            <p class="text-xs text-white/70">Your checkout session is ready. Click below to complete the payment on the secure hosted portal:</p>
            <a id="redirectLink" href="#" target="_blank" class="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs font-semibold py-2.5 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2">
              Open Checkout Portal ↗
            </a>
          </div>

          <!-- Fawry Reference Code Display -->
          <div id="fawrySection" class="hidden flex flex-col gap-2">
            <p class="text-xs text-white/70">Present this reference code at any Fawry retail outlet or kiosk:</p>
            <div class="bg-black/80 border border-emerald-500/30 rounded-lg p-4 text-center">
              <span class="text-xs font-mono text-white/50 block">FAWRY PAYMENT CODE</span>
              <span class="font-mono text-3xl font-bold text-emerald-400 tracking-wider my-1 block" id="fawryCode">987654321</span>
              <span class="text-[10px] text-white/40">Valid for 48 hours</span>
            </div>
          </div>

          <!-- Status Poller -->
          <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
            <span class="text-white/50">Current Status: <strong class="text-emerald-400" id="resStatus">pending</strong></span>
            <button type="button" onclick="checkStatus()" class="text-white/70 hover:text-white underline">Check Status ⟳</button>
          </div>
        </div>

      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-white/10 bg-black/40 py-6 text-center text-xs font-mono text-white/40">
    OpenWrapper End-to-End Demo Store • TypeScript SDK Integration
  </footer>

  <script>
    let activeProvider = 'paymob';
    let currentPaymentId = null;

    function selectProvider(p) {
      activeProvider = p;
      document.querySelectorAll('.provider-card').forEach(el => {
        el.classList.remove('border-emerald-500', 'bg-emerald-500/10');
        el.classList.add('border-white/10', 'bg-white/[0.02]');
      });
      const selected = document.getElementById('btn-' + p);
      selected.classList.remove('border-white/10', 'bg-white/[0.02]');
      selected.classList.add('border-emerald-500', 'bg-emerald-500/10');
    }

    async function handleCheckout(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      const btnText = document.getElementById('btnText');
      const btnSpinner = document.getElementById('btnSpinner');
      const resultCard = document.getElementById('resultCard');

      submitBtn.disabled = true;
      btnText.textContent = 'Contacting OpenWrapper Gateway...';
      btnSpinner.classList.remove('hidden');

      try {
        const payload = {
          provider: activeProvider,
          amount_minor_units: 15000,
          currency: 'EGP',
          customer: {
            phone: document.getElementById('custPhone').value,
            email: document.getElementById('custEmail').value,
            full_name: document.getElementById('custName').value,
          },
          merchant_reference: 'order_' + Math.random().toString(36).substring(2, 8),
          description: 'OpenWrapper Pro Plan Order',
        };

        const res = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Payment creation failed');

        currentPaymentId = data.paymentId;
        document.getElementById('resPaymentId').textContent = data.paymentId;
        document.getElementById('resStatus').textContent = data.status;

        // Display next action
        const urlSection = document.getElementById('urlSection');
        const fawrySection = document.getElementById('fawrySection');
        urlSection.classList.add('hidden');
        fawrySection.classList.add('hidden');

        if (data.nextAction?.type === 'redirect_to_url' && data.nextAction?.url) {
          urlSection.classList.remove('hidden');
          document.getElementById('redirectLink').href = data.nextAction.url;
        } else if (data.nextAction?.type === 'pay_at_reference' && data.nextAction?.reference) {
          fawrySection.classList.remove('hidden');
          document.getElementById('fawryCode').textContent = data.nextAction.reference;
        }

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        alert('Payment Error: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Pay EGP 150.00 Now';
        btnSpinner.classList.add('hidden');
      }
    }

    async function checkStatus() {
      if (!currentPaymentId) return;
      try {
        const res = await fetch('/api/payment/' + encodeURIComponent(currentPaymentId));
        const data = await res.json();
        if (data.status) {
          document.getElementById('resStatus').textContent = data.status;
          alert('Current Payment Status: ' + data.status);
        }
      } catch (err) {
        alert('Failed to check status: ' + err.message);
      }
    }
  </script>
</body>
</html>`

// HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`)

  // 1. Serve Standalone HTML Checkout UI
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/checkout")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(htmlPage)
    return
  }

  // 2. API Endpoint: POST /api/create-payment (Uses TypeScript SDK)
  if (req.method === "POST" && url.pathname === "/api/create-payment") {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", async () => {
      try {
        const body = JSON.parse(raw)
        console.log(`[SDK Checkout] Creating payment with provider: ${body.provider}...`)

        // Invoke TypeScript SDK
        const payment = await client.payments.create({
          provider: body.provider,
          amountMinorUnits: body.amount_minor_units || 15000,
          currency: body.currency || "EGP",
          customer: {
            phone: body.customer?.phone || "+201000000000",
            email: body.customer?.email,
            fullName: body.customer?.full_name,
          },
          merchantReference: body.merchant_reference || `ord_${Date.now()}`,
          description: body.description || "Checkout Order",
        })

        console.log(`[SDK Checkout] Success! Payment ID: ${payment.paymentId}, Status: ${payment.status}`)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(payment))
      } catch (err) {
        console.error("[SDK Checkout] Error:", err)
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: err.message || "Failed to create payment" }))
      }
    })
    return
  }

  // 3. API Endpoint: GET /api/payment/:id (Uses TypeScript SDK)
  if (req.method === "GET" && url.pathname.startsWith("/api/payment/")) {
    const paymentId = url.pathname.replace("/api/payment/", "")
    try {
      const payment = await client.payments.get(paymentId)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(payment))
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // 404 Not Found
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not Found" }))
})

server.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 OpenWrapper Standalone Checkout Demo is RUNNING!`)
  console.log(`👉 Open in browser: http://localhost:${PORT}`)
  console.log(`🔗 Connected Gateway: ${BASE_URL}`)
  console.log(`🔑 Using API Key: ${API_KEY.slice(0, 15)}...`)
  console.log(`======================================================\n`)
})
