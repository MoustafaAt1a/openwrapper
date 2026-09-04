import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { graphql } from "graphql"
import { schema } from "../lib/graphql/schema"
import { rootResolver } from "../lib/graphql/resolvers"

describe("GraphQL Analytics Ledger & Telemetry Engine", () => {
  it("executes health query accurately", async () => {
    const query = `
      query CheckHealth {
        health {
          status
          version
          database
          gatewayGrpc
        }
      }
    `
    const result = await graphql({
      schema,
      source: query,
      rootValue: rootResolver,
    })

    assert.equal(result.errors, undefined)
    assert.ok(result.data)
    const health = result.data?.health as { status: string; version: string; database: string }
    assert.equal(health.status, "ok")
    assert.equal(health.version, "0.1.2")
    assert.equal(health.database, "connected")
  })

  it("handles unauthenticated viewer query gracefully returning null", async () => {
    const query = `
      query GetViewer {
        viewer {
          id
          email
        }
      }
    `
    const result = await graphql({
      schema,
      source: query,
      rootValue: rootResolver,
      contextValue: { userId: null },
    })

    assert.equal(result.errors, undefined)
    assert.equal(result.data?.viewer, null)
  })

  it("resolves authenticated viewer profile", async () => {
    const query = `
      query GetViewer {
        viewer {
          id
          email
          name
        }
      }
    `
    const result = await graphql({
      schema,
      source: query,
      rootValue: rootResolver,
      contextValue: {
        userId: "usr_merchant_123",
        userEmail: "merchant@example.com",
        userName: "Acme Merchant",
      },
    })

    assert.equal(result.errors, undefined)
    const viewer = result.data?.viewer as { id: string; email: string; name: string }
    assert.equal(viewer.id, "usr_merchant_123")
    assert.equal(viewer.email, "merchant@example.com")
    assert.equal(viewer.name, "Acme Merchant")
  })
})

