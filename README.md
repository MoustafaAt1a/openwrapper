# OpenWrapper v0.1.1 LTS

A provider-neutral payment integration foundation and developer platform for Egypt.
OpenWrapper gives you one API over Paymob and Fawry — it does not process
payments, hold funds, or store card data. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for what it is and, just as importantly, what it deliberately is not.

**This build is ready to actually host and test against real traffic.**
API-key auth is on by default, it supports Postgres for running more than
one instance, and it ships a `Dockerfile`/`docker-compose.yml` along with a Next.js developer dashboard. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) to put it somewhere real, and
please read [`CONTRIBUTING.md`](CONTRIBUTING.md) — the whole point of
this release is collecting real feedback (especially against a real
Paymob/Fawry sandbox account) ahead of v1.0.0.

**Read [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) before deploying this
anywhere real.** Several provider-specific details (an exact endpoint
path, an exact signed-field list) are flagged there as "confirm against a
live sandbox before production" rather than asserted with false
confidence — that file is not boilerplate, it's load-bearing.

## Quickest start (Docker)

```bash
cp .env.example .env   # set POSTGRES_PASSWORD and OPENWRAPPER_API_KEYS at minimum
docker compose up --build
curl http://localhost:8080/v1/health
```

This starts the gateway alongside Postgres and Valkey. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for TLS, systemd, and a
go-live checklist.

## What's here

| Path | What it is |
|---|---|
| `core/` | Provider-neutral domain model, provider contract, error model, idempotency contract. Zero dependency on any provider crate — enforced by an automated test, not just review discipline. |
| `providers/paymob/` | Paymob adapter: Intention API + HMAC-SHA512 webhook verification. |
| `providers/fawry/` | Fawry adapter: PayAtFawry reference-code charges + SHA-256 webhook verification. |
| `gateway/` | The minimal HTTP process: SQLite-backed idempotency/payment store + a handful of routes. |
| `web/` | Modern Next.js 16 developer dashboard, live telemetry stream, API key manager, and documentation sandbox. |
| `tests/architecture/` | Automated checks that the *codebase*, not just its behavior, obeys the architectural invariants. |
| `sdk/typescript/` | TypeScript client (`@openwrapper/sdk`). |
| `sdk/php/` | PHP client (`openwrapper/sdk`). |
| `openapi.yaml` | Comprehensive OpenAPI 3.1.0 specification. |
| `docs/` | Everything explaining *why*, not just *what*. |
| `research/` | Primary-source citations backing every Paymob/Fawry-specific behavior in the adapters. |
| `Dockerfile`, `docker-compose.yml` | Container build and a full local/production-shaped stack (gateway + Postgres + Valkey). |
| `CONTRIBUTING.md` | How to report bugs, provider integration issues, and feedback for v1.0.0. |
| `CHANGELOG.md` | What changed, release by release. |

## Manual quickstart (without Docker)

### Run the gateway

```bash
cd gateway
OPENWRAPPER_API_KEYS=$(openssl rand -hex 32) \
OPENWRAPPER_ENABLE_PAYMOB=true \
PAYMOB_SECRET_KEY=... \
PAYMOB_HMAC_SECRET=... \
PAYMOB_PUBLIC_KEY=... \
PAYMOB_INTEGRATION_IDS=12345 \
PAYMOB_NOTIFICATION_URL=https://your-host/v1/webhooks/paymob \
cargo run
```

By default this uses a local SQLite file. Set `OPENWRAPPER_DATABASE_URL`
to a `postgres://` URL to use Postgres instead (required if you're
running more than one gateway instance — see `docs/DECISIONS.md`).

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for the full environment
variable reference (Fawry's equivalents, rate limiting, the distributed
cache, bind address, etc.).

### Call it

```bash
curl -X POST http://localhost:8080/v1/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $OPENWRAPPER_API_KEYS" \
  -H "Idempotency-Key: order-42" \
  -d '{
    "provider": "paymob",
    "amount_minor_units": 10000,
    "currency": "EGP",
    "customer": { "phone": "+201234567890" }
  }'
```

Or from TypeScript:

```ts
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({ baseUrl: "http://localhost:8080" });
const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 10000,
  currency: "EGP",
  customer: { phone: "+201234567890" },
});
```

Or from PHP:

```php
$client = new OpenWrapper\OpenWrapperClient('http://localhost:8080');
$payment = $client->createPayment(new OpenWrapper\CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 10000,
    currency: 'EGP',
    customer: new OpenWrapper\CustomerDetails(phone: '+201234567890'),
));
```

## Building and testing

```bash
# Rust workspace
cargo build --workspace
cargo test --workspace

# TypeScript SDK
cd sdk/typescript && npm install && npm test

# PHP SDK (composer install if you have packagist access; otherwise the
# bundled vendor_autoload.php is enough to run the test suite)
cd sdk/php && php tests/run.php
```

Every number in this README's "what's tested" claim is checkable: run the
three commands above yourself.

## Design documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the shape of the system and why
- [`docs/STATE_MACHINE.md`](docs/STATE_MACHINE.md) — payment states and transitions
- [`docs/IDEMPOTENCY.md`](docs/IDEMPOTENCY.md) — the three idempotency boundaries
- [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md) — the webhook verification pipeline
- [`docs/ERROR_MODEL.md`](docs/ERROR_MODEL.md) — the error taxonomy
- [`docs/DATA_BOUNDARY.md`](docs/DATA_BOUNDARY.md) — what OpenWrapper receives/forwards/stores/logs
- [`docs/SECURITY.md`](docs/SECURITY.md) — the security boundary
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker, TLS, systemd, go-live checklist
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — configuration reference
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architectural decisions, in Question → Evidence → Alternatives → Trade-offs → Decision → Consequence form
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — what v0.1.0 does not do, and what's unverified
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — reporting bugs, provider issues, and feedback
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`LICENSE`](LICENSE) — Apache-2.0
