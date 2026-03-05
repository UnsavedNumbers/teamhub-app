import type { OperationDefinition } from "./registry.ts"
import { sendEmail } from "../providers/resend.ts"

interface SendEmailInput {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  internalToken: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeRecipients(value: unknown): string[] | null {
  if (isNonEmptyString(value)) {
    return [value.trim()]
  }

  if (Array.isArray(value)) {
    const recipients = value
      .filter((item): item is string => isNonEmptyString(item))
      .map((item) => item.trim())

    return recipients.length > 0 ? recipients : null
  }

  return null
}

function readEnv(key: string): string | undefined {
  const deno = (globalThis as { Deno?: { env?: { get?: (name: string) => string | undefined } } }).Deno
  return deno?.env?.get?.(key)
}

const sendEmailOperation: OperationDefinition = {
  key: "email.resend.send",
  provider: "resend",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 20000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const recipients = normalizeRecipients(input.to)
    if (!recipients) {
      return { ok: false, message: "to must be a non-empty email or array of emails." } as const
    }

    if (!isNonEmptyString(input.from) || !isNonEmptyString(input.subject)) {
      return { ok: false, message: "from and subject are required." } as const
    }

    const expectedInternalToken = readEnv("API_MANAGER_INTERNAL_TOKEN")
    if (!expectedInternalToken) {
      return { ok: false, message: "API manager internal token is not configured." } as const
    }

    if (!isNonEmptyString(input.internalToken) || input.internalToken.trim() !== expectedInternalToken) {
      return { ok: false, message: "internalToken is invalid." } as const
    }

    if (!isNonEmptyString(input.html) && !isNonEmptyString(input.text)) {
      return { ok: false, message: "Either html or text must be provided." } as const
    }

    const normalized: SendEmailInput = {
      to: recipients.length === 1 ? recipients[0] : recipients,
      from: input.from.trim(),
      subject: input.subject.trim(),
      html: isNonEmptyString(input.html) ? input.html : undefined,
      text: isNonEmptyString(input.text) ? input.text : undefined,
      replyTo: isNonEmptyString(input.replyTo) ? input.replyTo.trim() : undefined,
      internalToken: input.internalToken.trim(),
    }

    return { ok: true, data: normalized } as const
  },
  async handler(input, context) {
    const parsed = input as SendEmailInput
    const result = await sendEmail({
      to: parsed.to,
      from: parsed.from,
      subject: parsed.subject,
      html: parsed.html,
      text: parsed.text,
      replyTo: parsed.replyTo,
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    return {
      providerMessageId: result.id,
    }
  },
}

export const emailOperations: OperationDefinition[] = [sendEmailOperation]
