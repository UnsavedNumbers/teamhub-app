import { fetchWithPolicy } from "../core/http.ts"
import { ApiManagerError } from "../core/errors.ts"

export interface MakeRunScenarioArgs {
  scenarioKey: string
  payload: Record<string, unknown>
  context: {
    traceId: string
    timeoutMs: number
    retries: number
  }
}

function readScenarioMap(): Record<string, string> {
  const json = Deno.env.get("MAKE_SCENARIO_URLS_JSON")
  const fromJson: Record<string, string> = {}

  if (json) {
    try {
      const parsed = JSON.parse(json)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" && value.startsWith("http")) {
            fromJson[key] = value
          }
        }
      }
    } catch {
      // Ignore malformed JSON and continue with explicit env mapping.
    }
  }

  const fromEnv: Record<string, string | undefined> = {
    "demo.request.created": Deno.env.get("MAKE_SCENARIO_DEMO_REQUEST_URL"),
    "demo.result.reviewed": Deno.env.get("MAKE_SCENARIO_DEMO_RESULT_URL"),
    "contact.submission.created": Deno.env.get("MAKE_SCENARIO_CONTACT_SUBMISSION_URL"),
  }

  for (const [key, value] of Object.entries(fromEnv)) {
    if (typeof value === "string" && value.startsWith("http")) {
      fromJson[key] = value
    }
  }

  return fromJson
}

export async function runScenario(args: MakeRunScenarioArgs): Promise<{ status: number; body: unknown }> {
  const scenarioMap = readScenarioMap()
  const targetUrl = scenarioMap[args.scenarioKey]

  if (!targetUrl) {
    throw new ApiManagerError(
      "PROVIDER_ERROR",
      `Make scenario key is not configured: ${args.scenarioKey}`,
      500,
    )
  }

  const response = await fetchWithPolicy(
    targetUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...args.payload,
        _meta: {
          trace_id: args.context.traceId,
          scenario_key: args.scenarioKey,
        },
      }),
    },
    {
      timeoutMs: args.context.timeoutMs,
      retries: args.context.retries,
      backoffMs: 200,
      traceId: args.context.traceId,
    },
  )

  const rawText = await response.text()
  const parsedBody = rawText.length > 0 ? tryParseJson(rawText) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Make scenario request failed.", 502, {
      status: response.status,
      scenarioKey: args.scenarioKey,
    })
  }

  return {
    status: response.status,
    body: parsedBody,
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
