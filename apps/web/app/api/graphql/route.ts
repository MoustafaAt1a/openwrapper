import { graphql } from "graphql"
import { NextResponse } from "next/server"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { type GraphQLContext, rootResolver } from "@/lib/graphql/resolvers"
import { schema } from "@/lib/graphql/schema"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
}

const GRAPHIQL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenWrapper GraphQL Ledger Explorer</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
  <style>
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    #graphiql {
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="graphiql">Loading OpenWrapper GraphQL Explorer...</div>
  <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({
      url: '/api/graphql',
    });
    ReactDOM.render(
      React.createElement(GraphiQL, {
        fetcher: fetcher,
        defaultQuery: \`query OpenWrapperHealthAndMetrics {
  health {
    status
    version
    database
    gatewayGrpc
    timestamp
  }
  viewer {
    id
    email
    metrics {
      totalPayments
      settledVolumeMinor
      apiSuccessRate24h
      routingLatencyP50
    }
  }
}\`,
      }),
      document.getElementById('graphiql')
    );
  </script>
</body>
</html>`

export async function GET(request: Request) {
  const accept = request.headers.get("accept") || ""
  if (accept.includes("text/html")) {
    return new NextResponse(GRAPHIQL_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...CORS_HEADERS,
      },
    })
  }

  // Handle GET query parameter queries for lightweight integrations
  const url = new URL(request.url)
  const query = url.searchParams.get("query")
  if (!query) {
    return NextResponse.json(
      { error: "Missing 'query' parameter. Navigate with browser to open GraphiQL IDE." },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  return executeGraphQL(request, query, null, null)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string
      variables?: Record<string, unknown> | null
      operationName?: string | null
    }

    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json(
        { errors: [{ message: "Field 'query' is required and must be a GraphQL query string." }] },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    return await executeGraphQL(request, body.query, body.variables, body.operationName)
  } catch (err) {
    return NextResponse.json(
      { errors: [{ message: `Malformed GraphQL request body: ${(err as Error).message}` }] },
      { status: 400, headers: CORS_HEADERS },
    )
  }
}

async function executeGraphQL(
  request: Request,
  query: string,
  variables?: Record<string, unknown> | null,
  operationName?: string | null,
) {
  const startedAt = performance.now()
  let context: GraphQLContext = {}
  let apiKeyId: number | null = null

  // 1. Try session authentication first
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (session?.user) {
      context = {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name,
      }
    }
  } catch {
    // Non-fatal if session extraction fails
  }

  // 2. Try API key authentication if no session
  if (!context.userId) {
    try {
      const apiKey = await authenticateApiRequest(request)
      if (apiKey) {
        context = {
          userId: apiKey.userId,
        }
        apiKeyId = apiKey.id
      }
    } catch {
      // Non-fatal
    }
  }

  const result = await graphql({
    schema,
    source: query,
    rootValue: rootResolver,
    contextValue: context,
    variableValues: variables ?? undefined,
    operationName: operationName ?? undefined,
  })

  if (context.userId) {
    scheduleApiRequestRecord({
      userId: context.userId,
      apiKeyId,
      method: "POST",
      endpoint: "/api/graphql",
      statusCode: result.errors && result.errors.length > 0 ? 400 : 200,
      startedAt,
    })
  }

  const status = result.errors && !result.data ? 400 : 200
  return NextResponse.json(result, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  })
}
