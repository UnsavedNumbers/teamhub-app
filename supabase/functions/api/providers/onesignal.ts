import { fetchWithPolicy } from "../core/http.ts"
import { ApiManagerError } from "../core/errors.ts"

export interface OneSignalSendArgs {
  targetUserId: string
  payload: Record<string, unknown>
  context: {
    traceId: string
    timeoutMs: number
    retries: number
  }
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) {
    throw new ApiManagerError("PROVIDER_ERROR", `${name} is not configured.`, 500)
  }
  return value
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export async function sendPush(args: OneSignalSendArgs): Promise<{ messageId?: string }> {
  const appId = requireEnv("ONESIGNAL_APP_ID")
  const restApiKey = requireEnv("ONESIGNAL_REST_API_KEY")

  const title = typeof args.payload.title === "string" ? args.payload.title.trim() : ""
  const body = typeof args.payload.body === "string" ? args.payload.body.trim() : ""
  const linkUrl = typeof args.payload.link_url === "string" ? args.payload.link_url : undefined

  if (!title || !body) {
    throw new ApiManagerError("VALIDATION_ERROR", "Push payload must include title and body.", 400)
  }

  const requestBody: Record<string, unknown> = {
    app_id: appId,
    include_aliases: {
      external_id: [args.targetUserId],
    },
    target_channel: "push",
    headings: { en: title },
    contents: { en: body },
    data: args.payload,
  }

  if (linkUrl) {
    requestBody.url = linkUrl
  }

  const response = await fetchWithPolicy(
    "https://onesignal.com/api/v1/notifications",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${restApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    {
      timeoutMs: args.context.timeoutMs,
      retries: args.context.retries,
      backoffMs: 200,
      traceId: args.context.traceId,
    },
  )

  const rawText = await response.text()
  const parsed = rawText ? parseJson(rawText) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "OneSignal push request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  const messageId =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof parsed.id === "string"
      ? parsed.id
      : undefined

  return { messageId }
}
