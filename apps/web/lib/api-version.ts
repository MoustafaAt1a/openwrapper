import { NextResponse } from "next/server"

export const SUPPORTED_API_VERSIONS = ["v1", "v2", "v3"] as const
export type SupportedApiVersion = (typeof SUPPORTED_API_VERSIONS)[number]

export function validateApiVersion(rawVersion: string): {
  valid: boolean
  version?: SupportedApiVersion
  errorResponse?: NextResponse
} {
  const normalized = rawVersion?.toLowerCase().trim()
  if (!normalized || !SUPPORTED_API_VERSIONS.includes(normalized as SupportedApiVersion)) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        {
          error: {
            code: "unsupported_api_version",
            message: `API version '${rawVersion}' is not supported. Supported versions: ${SUPPORTED_API_VERSIONS.join(", ")}.`,
          },
        },
        { status: 400 },
      ),
    }
  }

  return {
    valid: true,
    version: normalized as SupportedApiVersion,
  }
}
