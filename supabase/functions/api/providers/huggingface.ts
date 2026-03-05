import { ApiManagerError } from "../core/errors.ts"
import { fetchWithPolicy } from "../core/http.ts"

export interface HuggingFaceInferArgs {
  model: string
  input: string
  params?: Record<string, unknown>
  context: {
    traceId: string
    timeoutMs: number
    retries: number
  }
}

function getAllowedModels(): Set<string> {
  const fromEnv = Deno.env.get("HF_ALLOWED_MODELS")
  const defaults = ["facebook/bart-large-cnn"]
  const values = fromEnv
    ? fromEnv
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : defaults

  return new Set(values)
}

export async function infer(args: HuggingFaceInferArgs): Promise<{ output: unknown }> {
  const token = Deno.env.get("HF_API_TOKEN")
  if (!token) {
    throw new ApiManagerError("PROVIDER_ERROR", "Hugging Face token is not configured.", 500)
  }

  const allowedModels = getAllowedModels()
  if (!allowedModels.has(args.model)) {
    throw new ApiManagerError("FORBIDDEN", "Requested model is not allowed.", 403)
  }

  const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(args.model)}`

  const response = await fetchWithPolicy(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: args.input,
        parameters: args.params ?? {},
      }),
    },
    {
      timeoutMs: args.context.timeoutMs,
      retries: args.context.retries,
      backoffMs: 300,
      traceId: args.context.traceId,
    },
  )

  const rawBody = await response.text()
  const parsedBody = rawBody.length > 0 ? tryParseJson(rawBody) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Hugging Face request failed.", 502, {
      status: response.status,
    })
  }

  return { output: parsedBody }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
