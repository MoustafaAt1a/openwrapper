# 📜 OpenWrapper OpenAPI Specification

This directory contains the official **OpenAPI 3.1.0** specifications for the OpenWrapper Unified Gateway API in both **YAML** and **JSON** formats.

---

## 📁 Available Formats

| File | Format | Description |
| :--- | :--- | :--- |
| [`openapi.yaml`](./openapi.yaml) | YAML (v3.1.0) | Human-readable specification with full documentation and schemas. |
| [`openapi.json`](./openapi.json) | JSON (v3.1.0) | Machine-readable specification for Swagger UI, Postman, Redoc, and SDK generators. |


---

## 🌐 Endpoints & Protocols Covered

- **Payments REST API**:
  - `POST /v1/payments` (Idempotent payment initiation across Paymob, Fawry, Stripe, Mock)
  - `GET /v1/payments/{id}` (Real-time payment record & status inquiry)
- **Refunds & Reversals REST API** (v0.2.0):
  - `POST /v1/payments/{payment_id}/refunds` (Idempotent refund creation)
  - `GET /v1/payments/{payment_id}/refunds` (List refunds for a payment)
- **Immutable Events Ledger REST API** (v0.2.0):
  - `GET /v1/events` (Paginated event audit trail)
  - `GET /v1/events/{id}` (Retrieve individual audit event)
- **Merchant Outbound Webhook Endpoints REST API** (v0.2.0):
  - `POST /v1/webhook_endpoints` (Register delivery URL and generate secret)
  - `GET /v1/webhook_endpoints` (List registered endpoints)
  - `DELETE /v1/webhook_endpoints/{id}` (Remove endpoint)
- **Inbound Provider Webhooks REST API**:
  - `POST /v1/webhooks/{provider}` (Normalized provider signature verification & ingestion)
- **GraphQL API**:
  - `GET /api/graphql` (GraphiQL interactive explorer & schema playground)
  - `POST /api/graphql` (Financial ledger queries, viewer profile, telemetry)
- **System Probes**:
  - `GET /v1/health` (Liveness)
  - `GET /v1/ready` (Readiness: DB, cache & AMQP connectivity)
  - `GET /v1/version` (Semantic version: 0.2.0)

---

## 🛠️ Usage with Tools

### 1. View with Redocly CLI
```bash
npx @redocly/cli preview-docs openapi.yaml
```

### 2. Lint and Validate
```bash
npx @redocly/cli lint openapi.yaml
```

### 3. Import into Postman / Insomnia
Drag and drop [`openapi.json`](./openapi.json) or [`openapi.yaml`](./openapi.yaml) directly into your workspace.
