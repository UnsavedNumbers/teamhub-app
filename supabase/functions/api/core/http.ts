import { ApiManagerError } from "./errors.ts"

export interface FetchWithPolicyOptions {
  timeoutMs: number
  retries: number
  backoffMs: number
  traceId: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599)
}

export async function fetchWithPolicy(
  input: string,
  init: RequestInit,
  options: FetchWithPolicyOptions,
): Promise<Response> {
  const attempts = Math.max(0, options.retries) + 1

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.headers ?? {}),
          "x-trace-id": options.traceId,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok && attempt < attempts && shouldRetry(response.status)) {
        const jitterMs = Math.floor(Math.random() * 75)
        await sleep(options.backoffMs * attempt + jitterMs)
        continue
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < attempts) {
          const jitterMs = Math.floor(Math.random() * 75)
          await sleep(options.backoffMs * attempt + jitterMs)
          continue
        }
        throw new ApiManagerError(
          "PROVIDER_TIMEOUT",
          "The provider request timed out.",
          504,
        )
      }

      if (attempt < attempts) {
        const jitterMs = Math.floor(Math.random() * 75)
        await sleep(options.backoffMs * attempt + jitterMs)
        continue
      }

      throw new ApiManagerError("PROVIDER_ERROR", "The provider request failed.", 502, {
        message: error instanceof Error ? error.message : "Unknown fetch failure",
      })
    }
  }

  throw new ApiManagerError("PROVIDER_ERROR", "The provider request failed.", 502)
}
