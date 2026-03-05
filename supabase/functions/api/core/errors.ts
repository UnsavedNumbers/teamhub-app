export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "ORG_SCOPE_REQUIRED"
  | "OP_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "METHOD_NOT_ALLOWED"
  | "INVALID_JSON"
  | "SERVER_ERROR"

export class ApiManagerError extends Error {
  code: ApiErrorCode
  status: number
  details?: unknown

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiManagerError"
    this.code = code
    this.status = status
    this.details = details
  }
}

export function isApiManagerError(value: unknown): value is ApiManagerError {
  return value instanceof ApiManagerError
}

export function toApiManagerError(error: unknown): ApiManagerError {
  if (isApiManagerError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new ApiManagerError("SERVER_ERROR", "The request failed due to a server error.", 500, {
      cause: error.message,
    })
  }

  return new ApiManagerError("SERVER_ERROR", "The request failed due to a server error.", 500)
}

export function sanitizeErrorForClient(error: ApiManagerError): {
  code: ApiErrorCode
  message: string
  details?: unknown
} {
  if (error.status >= 500) {
    return {
      code: error.code,
      message: "The server could not complete your request. Please try again.",
    }
  }

  return {
    code: error.code,
    message: error.message,
    details: error.details,
  }
}
