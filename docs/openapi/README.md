# 📜 OpenWrapper OpenAPI Specification

This directory contains the official **OpenAPI 3.1.0** specifications for the OpenWrapper Unified Gateway API in both **YAML** and **JSON** formats.

---

## 📁 Available Formats

| File | Format | Description |
| :--- | :--- | :--- |
| [`openapi.yaml`](./openapi.yaml) | YAML (v3.1.0) | Human-readable specification with full documentation and schemas. |
| [`openapi.json`](./openapi.json) | JSON (v3.1.0) | Machine-readable specification for Swagger UI, Postman, Redoc, and SDK generators. |

*(Identical synchronized copies are also maintained at the repository root: [`openapi.yaml`](../../openapi.yaml) and [`openapi.json`](../../openapi.json)).*

---

## 🌐 Endpoints & Protocols Covered

- **Payments REST API**:
  - `POST /v1/payments` (Idempotent payment initiation across Paymob, Fawry, Stripe)
  - `GET /v1/payments/{id}` (Real-time payment record & status inquiry)
- **Webhooks REST API**:
  - `POST /v1/webhooks/{provider}` (Normalized provider signature verification & ingestion)
- **GraphQL API**:
  - `GET /graphql` (GraphiQL interactive explorer & schema playground)
  - `POST /graphql` (Queries, mutations: `createPayment`, `getPayment`, `reconcilePayment`)
- **System Probes**:
  - `GET /v1/health` (Liveness)
  - `GET /v1/ready` (Readiness: DB & AMQP connectivity)
  - `GET /v1/version` (Semantic version)

---

## 🛠️ Usage with Tools

### 1. View with Redocly CLI
```bash
bun x @redocly/cli preview-docs openapi.yaml
```

### 2. Lint and Validate
```bash
bun x @redocly/cli lint openapi.yaml
```

### 3. Import into Postman / Insomnia
Drag and drop [`openapi.json`](./openapi.json) or [`openapi.yaml`](./openapi.yaml) directly into your workspace.
