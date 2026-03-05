export interface AuditLogEvent {
  traceId: string
  operationKey: string
  provider: string
  orgId: string | null
  userId: string | null
  durationMs: number
  outcome: "ok" | "error"
  errorCode?: string
}

export function emitConsoleAudit(event: AuditLogEvent): void {
  const payload = {
    traceId: event.traceId,
    operation: event.operationKey,
    provider: event.provider,
    orgId: event.orgId,
    userId: event.userId,
    durationMs: event.durationMs,
    outcome: event.outcome,
    errorCode: event.errorCode ?? null,
  }

  if (event.outcome === "error") {
    console.error("[api-manager]", payload)
    return
  }

  console.log("[api-manager]", payload)
}

export async function persistAuditEvent(
  supabase: {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  },
  event: AuditLogEvent,
): Promise<void> {
  const { error } = await supabase.from("api_gateway_audit").insert({
    trace_id: event.traceId,
    operation_key: event.operationKey,
    provider: event.provider,
    org_id: event.orgId,
    user_id: event.userId,
    duration_ms: event.durationMs,
    outcome: event.outcome,
    error_code: event.errorCode ?? null,
  })

  if (error) {
    console.error("[api-manager] failed to persist audit event", {
      traceId: event.traceId,
      operation: event.operationKey,
      message: error.message,
    })
  }
}
