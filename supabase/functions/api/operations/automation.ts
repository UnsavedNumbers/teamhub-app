import type { OperationDefinition } from "./registry.ts"
import { runScenario } from "../providers/make.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

const demoRequestOperation: OperationDefinition = {
  key: "automation.sendDemoRequest",
  provider: "make",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public"],
    requiredStaffFlags: [],
    allowPlatformAdmin: false,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }
    if (!isString(input.demo_org_id) || !isString(input.email) || !isString(input.review_url)) {
      return {
        ok: false,
        message: "Input is missing required fields: demo_org_id, email, review_url.",
      } as const
    }
    return { ok: true, data: input } as const
  },
  async handler(input, context) {
    const result = await runScenario({
      scenarioKey: "demo.request.created",
      payload: input,
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    return {
      statusCode: result.status,
      providerResponse: result.body,
    }
  },
}

const demoResultOperation: OperationDefinition = {
  key: "automation.sendDemoResult",
  provider: "make",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: true,
  authz: {
    requireAuth: true,
    orgScoped: false,
    allowedRoles: ["platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }
    if (!isString(input.demo_org_id) || !isString(input.email) || !isString(input.type)) {
      return {
        ok: false,
        message: "Input is missing required fields: demo_org_id, email, type.",
      } as const
    }
    return { ok: true, data: input } as const
  },
  async handler(input, context) {
    const result = await runScenario({
      scenarioKey: "demo.result.reviewed",
      payload: input,
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    return {
      statusCode: result.status,
      providerResponse: result.body,
    }
  },
}

const contactSubmissionOperation: OperationDefinition = {
  key: "automation.submitContact",
  provider: "make",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "org_admin", "coach", "staff", "guardian", "athlete", "fan", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    if (!isString(input.surface) || !isString(input.subject_enum) || !isString(input.message)) {
      return {
        ok: false,
        message: "Input is missing required fields: surface, subject_enum, message.",
      } as const
    }

    return { ok: true, data: input } as const
  },
  async handler(input, context) {
    const result = await runScenario({
      scenarioKey: "contact.submission.created",
      payload: input,
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    return {
      statusCode: result.status,
      providerResponse: result.body,
    }
  },
}

export const automationOperations: OperationDefinition[] = [
  demoRequestOperation,
  demoResultOperation,
  contactSubmissionOperation,
]
