// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { resolveAuthContext } from "./core/auth.ts"
import { enforceRateLimitHook, resolveAuthorizationContext } from "./core/authz.ts"
import { emitConsoleAudit, persistAuditEvent } from "./core/audit.ts"
import { finalizeIdempotency, reserveIdempotency } from "./core/idempotency.ts"
import {
  ApiManagerError,
  sanitizeErrorForClient,
  toApiManagerError,
} from "./core/errors.ts"
import { getOperationDefinition } from "./operations/registry.ts"

interface GatewayRequest {
  operation: string
  input: unknown
  orgId?: string
  idempotencyKey?: string
}

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  })
}

function createTraceId(): string {
  return crypto.randomUUID()
}

function parseGatewayRequest(raw: unknown): GatewayRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiManagerError("VALIDATION_ERROR", "Request body must be an object.", 400)
  }

  const operation = (raw as Record<string, unknown>).operation
  const input = (raw as Record<string, unknown>).input
  const orgId = (raw as Record<string, unknown>).orgId
  const idempotencyKey = (raw as Record<string, unknown>).idempotencyKey

  if (typeof operation !== "string" || operation.trim().length === 0) {
    throw new ApiManagerError("VALIDATION_ERROR", "operation is required.", 400)
  }

  if (input === undefined) {
    throw new ApiManagerError("VALIDATION_ERROR", "input is required.", 400)
  }

  if (orgId !== undefined && (typeof orgId !== "string" || orgId.trim().length === 0)) {
    throw new ApiManagerError("VALIDATION_ERROR", "orgId must be a non-empty string when provided.", 400)
  }

  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== "string" || idempotencyKey.trim().length < 8 || idempotencyKey.trim().length > 128)
  ) {
    throw new ApiManagerError(
      "VALIDATION_ERROR",
      "idempotencyKey must be a string between 8 and 128 characters.",
      400,
    )
  }

  return {
    operation: operation.trim(),
    input,
    orgId: typeof orgId === "string" ? orgId.trim() : undefined,
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey.trim() : undefined,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  const traceId = createTraceId()
  const startedAt = Date.now()
  let operationKey = "unknown"
  let provider = "unknown"
  let orgId: string | null = null
  let userId: string | null = null

  try {
    if (req.method !== "POST") {
      throw new ApiManagerError("METHOD_NOT_ALLOWED", "Method not allowed.", 405)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ApiManagerError("SERVER_ERROR", "Server is missing required configuration.", 500)
    }

    const authorizationHeader = req.headers.get("Authorization")

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authorizationHeader ?? "",
          "x-trace-id": traceId,
        },
      },
    })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new ApiManagerError("INVALID_JSON", "The request body is not valid JSON.", 400)
    }

    const parsedRequest = parseGatewayRequest(body)
    operationKey = parsedRequest.operation

    const definition = getOperationDefinition(parsedRequest.operation)
    if (!definition) {
      throw new ApiManagerError("OP_NOT_FOUND", "The requested operation is not registered.", 404)
    }
    provider = definition.provider

    const authContext = await resolveAuthContext(
      supabase,
      authorizationHeader,
      !definition.authz.requireAuth,
    )

    const authorization = await resolveAuthorizationContext(
      supabase as any,
      authContext,
      definition.authz,
      parsedRequest.orgId ?? null,
    )

    orgId = authorization.orgId
    userId = authorization.userId

    await enforceRateLimitHook(supabase as any, {
      userId,
      orgId,
      operationKey,
    })

    const validation = definition.validateInput(parsedRequest.input)
    if (!validation.ok) {
      throw new ApiManagerError("VALIDATION_ERROR", validation.message, 400, validation.details)
    }

    let idempotencyRowId: string | null = null
    if (definition.idempotent && parsedRequest.idempotencyKey) {
      const reservation = await reserveIdempotency(supabase as any, {
        operationKey,
        orgId,
        userId,
        idempotencyKey: parsedRequest.idempotencyKey,
        traceId,
      })

      if (reservation.state === "replay") {
        return json(req, reservation.responseJson, 200)
      }

      if (reservation.state === "in_flight") {
        throw new ApiManagerError(
          "IDEMPOTENCY_CONFLICT",
          "A request with this idempotency key is already in progress.",
          409,
        )
      }

      idempotencyRowId = reservation.rowId ?? null
    }

    const data = await definition.handler(validation.data, {
      traceId,
      authorization,
      definition,
    })

    const responseBody = {
      ok: true as const,
      data,
      traceId,
    }

    if (idempotencyRowId) {
      await finalizeIdempotency(supabase as any, idempotencyRowId, {
        status: "completed",
        responseJson: responseBody,
      })
    }

    const durationMs = Date.now() - startedAt
    const auditEvent = {
      traceId,
      operationKey,
      provider,
      orgId,
      userId,
      durationMs,
      outcome: "ok" as const,
    }
    emitConsoleAudit(auditEvent)
    await persistAuditEvent(supabase as any, auditEvent)

    return json(req, responseBody, 200)
  } catch (error) {
    const apiError = toApiManagerError(error)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      const durationMs = Date.now() - startedAt
      const auditEvent = {
        traceId,
        operationKey,
        provider,
        orgId,
        userId,
        durationMs,
        outcome: "error" as const,
        errorCode: apiError.code,
      }
      emitConsoleAudit(auditEvent)
      await persistAuditEvent(supabase as any, auditEvent)
    }

    return json(
      req,
      {
        ok: false,
        error: sanitizeErrorForClient(apiError),
        traceId,
      },
      apiError.status,
    )
  }
})
