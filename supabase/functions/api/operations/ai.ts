import type { OperationDefinition } from "./registry.ts"
import { infer } from "../providers/huggingface.ts"

interface SummarizeInput {
  announcement: string
  maxLength?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeSummaryOutput(output: unknown): string {
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (first && typeof first === "object" && "summary_text" in first) {
      const candidate = (first as { summary_text?: unknown }).summary_text
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim()
      }
    }
  }

  if (typeof output === "string" && output.trim().length > 0) {
    return output.trim()
  }

  return ""
}

const summarizeAnnouncement: OperationDefinition = {
  key: "ai.summarizeAnnouncement",
  provider: "huggingface",
  piiPolicy: "deny",
  limits: {
    timeoutMs: 20000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: true,
    orgScoped: true,
    allowedRoles: ["org_admin", "coach", "staff", "platform_admin"],
    requiredStaffFlags: ["can_use_ai_tools"],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const announcement = input.announcement
    if (typeof announcement !== "string" || announcement.trim().length < 20) {
      return {
        ok: false,
        message: "announcement is required and must be at least 20 characters.",
      } as const
    }

    const maxLengthRaw = input.maxLength
    if (maxLengthRaw !== undefined && (typeof maxLengthRaw !== "number" || maxLengthRaw < 40 || maxLengthRaw > 240)) {
      return {
        ok: false,
        message: "maxLength must be between 40 and 240 when provided.",
      } as const
    }

    const normalized: SummarizeInput = {
      announcement: announcement.trim(),
      maxLength: typeof maxLengthRaw === "number" ? Math.floor(maxLengthRaw) : 120,
    }

    return { ok: true, data: normalized } as const
  },
  async handler(input, context) {
    const parsedInput = input as SummarizeInput

    const inferenceResult = await infer({
      model: "facebook/bart-large-cnn",
      input: parsedInput.announcement,
      params: {
        max_length: parsedInput.maxLength ?? 120,
        min_length: 40,
        do_sample: false,
      },
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    const summary = normalizeSummaryOutput(inferenceResult.output)

    return {
      summary,
      model: "facebook/bart-large-cnn",
      providerOutput: inferenceResult.output,
    }
  },
}

export const aiOperations: OperationDefinition[] = [summarizeAnnouncement]
