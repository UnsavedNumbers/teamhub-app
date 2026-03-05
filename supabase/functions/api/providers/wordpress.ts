import { fetchWithPolicy } from "../core/http.ts"
import { ApiManagerError } from "../core/errors.ts"

export type WordPressAuthMethod = "application_password" | "oauth_token" | "public"

export interface WordPressRequestArgs {
  apiUrl: string
  authMethod: WordPressAuthMethod
  credentials?: string
  endpoint: string
  context: {
    traceId: string
    timeoutMs: number
    retries: number
  }
}

function normalizeBaseUrl(rawApiUrl: string): string {
  const parsed = new URL(rawApiUrl)
  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    throw new ApiManagerError("VALIDATION_ERROR", "WordPress API URL must be http or https.", 400)
  }

  const allowList = Deno.env.get("WORDPRESS_ALLOWED_HOSTS")
  if (allowList) {
    const hosts = allowList
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)

    if (hosts.length > 0 && !hosts.includes(parsed.hostname.toLowerCase())) {
      throw new ApiManagerError("FORBIDDEN", "WordPress host is not allowed.", 403)
    }
  }

  return rawApiUrl.replace(/\/$/, "")
}

function buildAuthHeaders(authMethod: WordPressAuthMethod, credentials?: string): Record<string, string> {
  if (authMethod === "application_password" && credentials) {
    const encoded = btoa(credentials)
    return { Authorization: `Basic ${encoded}` }
  }

  if (authMethod === "oauth_token" && credentials) {
    return { Authorization: `Bearer ${credentials}` }
  }

  return {}
}

export async function requestWordPress(args: WordPressRequestArgs): Promise<unknown> {
  const baseUrl = normalizeBaseUrl(args.apiUrl)
  const targetUrl = `${baseUrl}${args.endpoint.startsWith("/") ? args.endpoint : `/${args.endpoint}`}`

  const response = await fetchWithPolicy(
    targetUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(args.authMethod, args.credentials),
      },
    },
    {
      timeoutMs: args.context.timeoutMs,
      retries: args.context.retries,
      backoffMs: 200,
      traceId: args.context.traceId,
    },
  )

  const rawText = await response.text()

  if (!response.ok) {
    const details = rawText ? tryParseJson(rawText) : null
    throw new ApiManagerError("PROVIDER_ERROR", "WordPress request failed.", 502, {
      status: response.status,
      endpoint: args.endpoint,
      details,
    })
  }

  if (!rawText || rawText.trim().length === 0) {
    return null
  }

  return tryParseJson(rawText)
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
