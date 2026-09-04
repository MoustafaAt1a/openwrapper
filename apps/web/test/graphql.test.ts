import { describe, expect, it } from "bun:test"
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

    expect(result.errors).toBeUndefined()
    expect(result.data).toBeDefined()
    const health = result.data?.health as { status: string; version: string; database: string }
    expect(health.status).toBe("ok")
    expect(health.version).toBe("0.1.2")
    expect(health.database).toBe("connected")
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

    expect(result.errors).toBeUndefined()
    expect(result.data?.viewer).toBeNull()
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

    expect(result.errors).toBeUndefined()
    const viewer = result.data?.viewer as { id: string; email: string; name: string }
    expect(viewer.id).toBe("usr_merchant_123")
    expect(viewer.email).toBe("merchant@example.com")
    expect(viewer.name).toBe("Acme Merchant")
  })
})
