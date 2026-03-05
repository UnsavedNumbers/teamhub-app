import { ApiManagerError } from "./errors.ts"

export interface IdempotencyReservation {
  state: "new" | "replay" | "in_flight"
  rowId?: string
  responseJson?: unknown
}

export async function reserveIdempotency(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
        }
      }
      insert: (row: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }>
        }
      }
    }
  },
  args: {
    operationKey: string
    orgId: string | null
    userId: string | null
    idempotencyKey: string
    traceId: string
  },
): Promise<IdempotencyReservation> {
  const scopedOrg = args.orgId ?? "global"
  const scopedUser = args.userId ?? "anonymous"

  const existingLookup = await supabase
    .from("api_gateway_idempotency")
    .select("id, status, response_json")
    .eq("operation_key", args.operationKey)
    .eq("org_id", scopedOrg)
    .eq("user_id", scopedUser)
    .eq("idempotency_key", args.idempotencyKey)
    .maybeSingle()

  if (existingLookup.error) {
    throw new ApiManagerError("SERVER_ERROR", "Failed to read idempotency state.", 500)
  }

  if (existingLookup.data) {
    const status = String(existingLookup.data.status ?? "")
    if (status === "completed") {
      return {
        state: "replay",
        responseJson: existingLookup.data.response_json,
      }
    }

    return { state: "in_flight" }
  }

  const inserted = await supabase
    .from("api_gateway_idempotency")
    .insert({
      operation_key: args.operationKey,
      org_id: scopedOrg,
      user_id: scopedUser,
      idempotency_key: args.idempotencyKey,
      trace_id: args.traceId,
      status: "processing",
    })
    .select("id")
    .single()

  if (inserted.error || !inserted.data?.id) {
    throw new ApiManagerError("SERVER_ERROR", "Failed to reserve idempotency key.", 500)
  }

  return { state: "new", rowId: inserted.data.id }
}

export async function finalizeIdempotency(
  supabase: {
    from: (table: string) => {
      update: (row: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
      }
    }
  },
  rowId: string,
  payload: { status: "completed" | "failed"; responseJson?: unknown; errorCode?: string },
): Promise<void> {
  const { error } = await supabase
    .from("api_gateway_idempotency")
    .update({
      status: payload.status,
      response_json: payload.responseJson ?? null,
      error_code: payload.errorCode ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", rowId)

  if (error) {
    console.error("[api-manager] failed to finalize idempotency", {
      rowId,
      message: error.message,
    })
  }
}
