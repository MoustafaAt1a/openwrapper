let selectedProduct = {
  id: 'pro',
  name: 'OpenWrapper Pro Subscription',
  price: 150,
  minorUnits: 15000,
  currency: 'EGP'
};

let activeProvider = 'paymob';
let currentPaymentId = null;
let pollTimer = null;

const products = {
  starter: { id: 'starter', name: 'Starter Developer Tier', price: 50, minorUnits: 5000, currency: 'EGP' },
  pro: { id: 'pro', name: 'OpenWrapper Pro Plan', price: 150, minorUnits: 15000, currency: 'EGP' },
  enterprise: { id: 'enterprise', name: 'Enterprise Gateway License', price: 450, minorUnits: 45000, currency: 'EGP' }
};

function selectProduct(key) {
  selectedProduct = products[key];
  document.querySelectorAll('.product-btn').forEach(el => {
    el.classList.remove('border-emerald-500', 'bg-emerald-500/10');
    el.classList.add('border-white/10', 'bg-white/[0.02]');
  });
  const btn = document.getElementById('prod-' + key);
  if (btn) {
    btn.classList.remove('border-white/10', 'bg-white/[0.02]');
    btn.classList.add('border-emerald-500', 'bg-emerald-500/10');
  }

  document.getElementById('cartTitle').textContent = selectedProduct.name;
  document.getElementById('cartAmount').textContent = `${selectedProduct.currency} ${selectedProduct.price.toFixed(2)}`;
  document.getElementById('cartMinorUnits').textContent = `(${selectedProduct.minorUnits.toLocaleString()} minor units)`;
  document.getElementById('submitBtnAmount').textContent = `Pay ${selectedProduct.currency} ${selectedProduct.price.toFixed(2)} with ${activeProvider.toUpperCase()}`;
  
  updateCodePreview();
}

function selectProvider(provider) {
  activeProvider = provider;
  document.querySelectorAll('.provider-card').forEach(el => el.classList.remove('active'));
  const btn = document.getElementById('btn-' + provider);
  if (btn) btn.classList.add('active');

  document.getElementById('submitBtnAmount').textContent = `Pay ${selectedProduct.currency} ${selectedProduct.price.toFixed(2)} with ${activeProvider.toUpperCase()}`;
  updateCodePreview();
}

function updateCodePreview() {
  const codeEl = document.getElementById('sdkCodePreview');
  if (!codeEl) return;

  const phone = document.getElementById('custPhone')?.value || '+201001234567';
  const name = document.getElementById('custName')?.value || 'Ahmed Ali';
  const email = document.getElementById('custEmail')?.value || 'customer@example.com';

  codeEl.textContent = `// Backend TypeScript SDK Execution
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "https://web-production-884cd.up.railway.app",
  apiKey: process.env.OPENWRAPPER_API_KEY,
});

const payment = await client.payments.create({
  provider: "${activeProvider}",
  amountMinorUnits: ${selectedProduct.minorUnits}, // ${selectedProduct.price}.00 ${selectedProduct.currency}
  currency: "${selectedProduct.currency}",
  customer: {
    phone: "${phone}",
    email: "${email}",
    fullName: "${name}",
  },
  merchantReference: "order_${Date.now().toString().slice(-6)}",
  description: "${selectedProduct.name}",
});`;
}

async function handleCheckout(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const resultCard = document.getElementById('resultCard');

  submitBtn.disabled = true;
  btnSpinner.classList.remove('hidden');

  try {
    const payload = {
      provider: activeProvider,
      amount_minor_units: selectedProduct.minorUnits,
      currency: selectedProduct.currency,
      customer: {
        phone: document.getElementById('custPhone').value,
        email: document.getElementById('custEmail').value,
        full_name: document.getElementById('custName').value,
      },
      merchant_reference: 'ord_' + Math.random().toString(36).substring(2, 8),
      description: selectedProduct.name,
    };

    const startTime = performance.now();
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) throw new Error(data.error || 'Payment request failed');

    currentPaymentId = data.paymentId || data.payment_id;
    document.getElementById('resPaymentId').textContent = currentPaymentId;
    document.getElementById('resStatus').textContent = data.status;
    document.getElementById('resDuration').textContent = `${duration}ms`;

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

    // Start auto polling for status update
    startStatusPolling();
  } catch (err) {
    alert('Payment Creation Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    btnSpinner.classList.add('hidden');
  }
}

async function checkPaymentStatus() {
  if (!currentPaymentId) return;
  const statusEl = document.getElementById('resStatus');
  statusEl.textContent = 'checking...';
  try {
    const res = await fetch('/api/payment/' + encodeURIComponent(currentPaymentId));
    const data = await res.json();
    if (data.status) {
      statusEl.textContent = data.status;
      if (data.status === 'succeeded') {
        statusEl.className = 'text-emerald-400 font-bold';
        if (pollTimer) clearInterval(pollTimer);
      }
    }
  } catch (err) {
    console.error('Status check error:', err);
  }
}

function startStatusPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(checkPaymentStatus, 4000);
}

// Initial binding
document.addEventListener('DOMContentLoaded', () => {
  ['custName', 'custPhone', 'custEmail'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCodePreview);
  });
  updateCodePreview();
});
