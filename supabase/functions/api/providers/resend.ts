import { fetchWithPolicy } from "../core/http.ts"
import { ApiManagerError } from "../core/errors.ts"

export interface ResendSendEmailArgs {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  context: {
    traceId: string
    timeoutMs: number
    retries: number
  }
}

export async function sendEmail(args: ResendSendEmailArgs): Promise<{ id: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    throw new ApiManagerError("PROVIDER_ERROR", "Resend API key is not configured.", 500)
  }

  const response = await fetchWithPolicy(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.to,
        from: args.from,
        subject: args.subject,
        html: args.html,
        text: args.text,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    },
    {
      timeoutMs: args.context.timeoutMs,
      retries: args.context.retries,
      backoffMs: 200,
      traceId: args.context.traceId,
    },
  )

  const rawText = await response.text()
  const parsed = rawText ? tryParseJson(rawText) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Resend email request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof parsed.id !== "string") {
    throw new ApiManagerError("PROVIDER_ERROR", "Resend response was invalid.", 502)
  }

  return {
    id: parsed.id,
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
