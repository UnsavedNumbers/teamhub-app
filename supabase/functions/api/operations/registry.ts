import { automationOperations } from "./automation.ts"
import { aiOperations } from "./ai.ts"
import { emailOperations } from "./email.ts"
import { wordpressOperations } from "./wordpress.ts"
import { integrationOperations } from "./integrations.ts"
import type { AuthorizationContext, AuthorizationRequirements } from "../core/authz.ts"

export type PiiPolicy = "deny" | "allow"

export interface OperationLimits {
  timeoutMs: number
  retries: number
}

export interface OperationDefinition {
  key: string
  provider: "make" | "huggingface" | "resend" | "wordpress" | "google" | "onesignal"
  piiPolicy: PiiPolicy
  limits: OperationLimits
  idempotent: boolean
  authz: AuthorizationRequirements
  validateInput: (input: unknown) =>
    | { ok: true; data: Record<string, unknown> | unknown }
    | { ok: false; message: string; details?: unknown }
  handler: (
    input: Record<string, unknown> | unknown,
    context: {
      traceId: string
      authorization: AuthorizationContext
      definition: OperationDefinition
    },
  ) => Promise<unknown>
}

// Phase 1 migration inventory (initial operations)
// 1) src/services/demoRequestWebhookService.ts -> automation.sendDemoRequest
// 2) src/services/demoResultWebhookService.ts -> automation.sendDemoResult
// 3) src/services/contactService.ts -> automation.submitContact
// 4) initial HF validation path -> ai.summarizeAnnouncement

const allDefinitions = [
  ...automationOperations,
  ...aiOperations,
  ...emailOperations,
  ...wordpressOperations,
  ...integrationOperations,
]

const operationMap = new Map<string, OperationDefinition>(
  allDefinitions.map((definition) => [definition.key, definition]),
)

export function getOperationDefinition(operationKey: string): OperationDefinition | null {
  return operationMap.get(operationKey) ?? null
}
