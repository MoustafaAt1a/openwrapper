# OpenWrapper v0.1.3 LTS

A provider-neutral payment integration foundation and developer platform for Egypt and global gateways.
OpenWrapper gives you one unified API over Paymob, Fawry, and Stripe — with zero card data tenancy, PgBouncer connection pooling, and distributed Valkey rate limiting. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for what it is and, just as importantly, what it deliberately is not.

**This build is production-shaped, but it is not production-certified.**
API-key auth is on by default, Postgres supports multiple gateway
instances, and the repository ships Docker Compose stacks plus a Next.js
developer dashboard. Validate the unverified provider details and tune
resource limits for your environment before accepting real traffic. See
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
cp .env.example .env
# Set POSTGRES_PASSWORD, RABBITMQ_PASSWORD, OPENWRAPPER_API_KEYS,
# BETTER_AUTH_SECRET, and any provider credentials you enable.
docker compose up --build
curl http://localhost:8080/v1/ready
```

This starts the gateway alongside Postgres (via PgBouncer), RabbitMQ,
Valkey, and the web portal. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for TLS, systemd, and a
go-live checklist.

## What's here

| Path | What it is |
|---|---|
| `apps/gateway/` | High-performance dual-protocol engine (Axum HTTP `:8080` + Tonic gRPC `:50051`): durable SQLite/Postgres idempotency, payment storage, and provider adapters. |
| `apps/web/` | Modern Next.js 16 developer dashboard, GraphQL analytics ledger (`/api/graphql` + GraphiQL IDE), live telemetry stream, and sub-millisecond gRPC IPC bridge. |
| `proto/` | Canonical Protobuf definitions (`openwrapper/v1/payment.proto`) ensuring zero-float integer precision and high-throughput serialization. |
| `crates/core/` | Provider-neutral domain model, provider contract, error model, idempotency contract. Zero dependency on any provider crate — enforced by an automated test, not just review discipline. |
| `crates/providers/paymob/` | Paymob adapter: Intention API + HMAC-SHA512 webhook verification. |
| `crates/providers/fawry/` | Fawry adapter: PayAtFawry reference-code charges + SHA-256 webhook verification. |
| `tests/architecture/` | Automated checks that the *codebase*, not just its behavior, obeys the architectural invariants. |
| `sdk/typescript/` | TypeScript client (`@openwrapper/sdk`). |
| `sdk/php/` | PHP client (`openwrapper/sdk`). |
| `sdk/dotnet/` | .NET 8 client (`OpenWrapper`). |
| `examples/checkout-demo/` | Multi-SDK real-world checkout store demo (TypeScript, PHP 8, .NET 8, Makefile, justfile). |
| `docs/openapi/` | Comprehensive OpenAPI 3.1.0 specifications in YAML (`openapi.yaml`) and JSON (`openapi.json`). |
| `docs/` | Everything explaining *why*, not just *what*. |
| `docs/research/` | Primary-source citations backing every Paymob/Fawry-specific behavior in the adapters. |
| `Dockerfile`, `docker-compose*.yml` | Gateway image plus local and production-shaped stacks (gateway + web + Postgres + PgBouncer + RabbitMQ + Valkey + gRPC). |
| `CONTRIBUTING.md` | How to report bugs, provider integration issues, and feedback for v1.0.0. |
| `CHANGELOG.md` | What changed, release by release. |

## Manual quickstart (without Docker)

### Run the gateway

```bash
export OPENWRAPPER_API_KEY="$(openssl rand -hex 32)"
cd apps/gateway
OPENWRAPPER_API_KEYS="$OPENWRAPPER_API_KEY" \
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
  -H "X-API-Key: $OPENWRAPPER_API_KEY" \
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

const client = new OpenWrapperClient({
  baseUrl: "http://localhost:8080",
  apiKey: process.env.OPENWRAPPER_API_KEY,
});
const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 10000,
  currency: "EGP",
  customer: { phone: "+201234567890" },
});
```

Or from PHP:

```php
$client = new OpenWrapper\OpenWrapperClient(
    baseUrl: 'http://localhost:8080',
    apiKey: getenv('OPENWRAPPER_API_KEY'),
);
$payment = $client->createPayment(new OpenWrapper\CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 10000,
    currency: 'EGP',
    customer: new OpenWrapper\CustomerDetails(phone: '+201234567890'),
));
```

Or from .NET 8:

```csharp
using OpenWrapper;
using OpenWrapper.Models;

var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = "http://localhost:8080",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
});
var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 10000,
    Currency = "EGP",
    Customer = new CustomerDetails { Phone = "+201234567890" },
});
```

## Building and testing

```bash
# Rust workspace
cargo build --workspace
cargo test --workspace

# TypeScript SDK
cd sdk/typescript && bun install && bun test test/client.test.mjs

# Next.js Web Dashboard
cd apps/web && bun install && bun run lint && bun run test && bun run build

# Monorepo Linting & Formatting (Biome)
bunx @biomejs/biome check .

# PHP SDK (composer install if you have packagist access; otherwise the
# bundled vendor_autoload.php is enough to run the test suite)
cd sdk/php && php tests/run.php

# .NET SDK
cd sdk/dotnet && dotnet test OpenWrapper.sln
```

For the complete cross-language suite, run `bash scripts/ci-full.sh` (or
`scripts/ci-full.ps1` from PowerShell).

## Design documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the shape of the system and why
- [`docs/STATE_MACHINE.md`](docs/STATE_MACHINE.md) — payment states and transitions
- [`docs/IDEMPOTENCY.md`](docs/IDEMPOTENCY.md) — the three idempotency boundaries
- [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md) — the webhook verification pipeline
- [`docs/ERROR_MODEL.md`](docs/ERROR_MODEL.md) — the error taxonomy
- [`docs/DATA_BOUNDARY.md`](docs/DATA_BOUNDARY.md) — what OpenWrapper receives/forwards/stores/logs
- [`docs/SECURITY.md`](docs/SECURITY.md) — the security boundary
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker, TLS, systemd, go-live checklist
- [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) — pinned Rust crate rationale
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — configuration reference
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architectural decisions, in Question → Evidence → Alternatives → Trade-offs → Decision → Consequence form
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — what v0.1.3 does not do, and what's unverified
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — reporting bugs, provider issues, and feedback
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`LICENSE`](LICENSE) — Apache-2.0
