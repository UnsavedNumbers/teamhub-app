import { supabase } from '../lib/supabase'
import { USE_FAKE_DATA } from '../data/config'

export interface ApiManagerErrorPayload {
  code: string
  message: string
  details?: unknown
}

export interface ApiManagerSuccess<TData> {
  ok: true
  data: TData
  traceId: string
}

export interface ApiManagerFailure {
  ok: false
  error: ApiManagerErrorPayload
  traceId: string
}

export type ApiManagerResponse<TData> = ApiManagerSuccess<TData> | ApiManagerFailure

interface InvokeApiOperationArgs {
  operation: string
  input: Record<string, unknown>
  orgId?: string
  idempotencyKey?: string
}

const DEMO_MODE_BLOCKED_OPERATION_PREFIXES = ['automation.', 'email.', 'push.'] as const

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isDemoBlockedOperation(operation: string): boolean {
  return DEMO_MODE_BLOCKED_OPERATION_PREFIXES.some((prefix) => operation.startsWith(prefix))
}

function isApiManagerSuccess<TData>(value: unknown): value is ApiManagerSuccess<TData> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  return record.ok === true && typeof record.traceId === 'string' && 'data' in record
}

function isApiManagerFailure(value: unknown): value is ApiManagerFailure {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  if (record.ok !== false || typeof record.traceId !== 'string') {
    return false
  }

  if (!record.error || typeof record.error !== 'object' || Array.isArray(record.error)) {
    return false
  }

  const error = record.error as Record<string, unknown>
  return typeof error.code === 'string' && typeof error.message === 'string'
}

export async function invokeApiOperation<TData>(args: InvokeApiOperationArgs): Promise<ApiManagerResponse<TData>> {
  if (isOffline()) {
    return {
      ok: false,
      traceId: 'offline',
      error: {
        code: 'OFFLINE',
        message: 'You appear to be offline. Please reconnect and try again.',
      },
    }
  }

  if (USE_FAKE_DATA && isDemoBlockedOperation(args.operation)) {
    return {
      ok: false,
      traceId: 'demo-mode',
      error: {
        code: 'DEMO_MODE_BLOCKED',
        message: 'This action is unavailable in demo mode. Sign in to a live organization to continue.',
      },
    }
  }

  const { data, error } = await supabase.functions.invoke('api', {
    body: {
      operation: args.operation,
      input: args.input,
      orgId: args.orgId,
      idempotencyKey: args.idempotencyKey,
    },
  })

  if (error) {
    return {
      ok: false,
      traceId: 'unknown',
      error: {
        code: 'EDGE_INVOKE_FAILED',
        message: error.message,
      },
    }
  }

  if (isApiManagerSuccess<TData>(data)) {
    return data
  }

  if (isApiManagerFailure(data)) {
    return data
  }

  return {
    ok: false,
    traceId: 'unknown',
    error: {
      code: 'INVALID_RESPONSE_CONTRACT',
      message: 'Gateway response was not in the expected format.',
    },
  }
}
