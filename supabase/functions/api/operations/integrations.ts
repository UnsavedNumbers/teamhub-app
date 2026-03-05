import type { OperationDefinition } from "./registry.ts"
import {
  generateGeminiContent,
  geocodeZip,
  getDistanceMatrix,
  getNeighborhoodSummary,
  getPlaceDetails,
  getWeatherForecast,
  searchNearbyPlaces,
} from "../providers/google.ts"
import { sendPush } from "../providers/onesignal.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function readEnv(key: string): string | undefined {
  const deno = (globalThis as { Deno?: { env?: { get?: (name: string) => string | undefined } } }).Deno
  return deno?.env?.get?.(key)
}

const geocodeZipOperation: OperationDefinition = {
  key: "geo.geocodeZip",
  provider: "google",
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
    if (!isRecord(input) || !isNonEmptyString(input.zip)) {
      return { ok: false, message: "zip is required." } as const
    }
    return { ok: true, data: { zip: input.zip.trim() } } as const
  },
  async handler(input, context) {
    const parsed = input as { zip: string }
    const providerResponse = await geocodeZip(parsed.zip, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const neighborhoodSummaryOperation: OperationDefinition = {
  key: "places.getNeighborhoodSummary",
  provider: "google",
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
    if (!isRecord(input) || !isNonEmptyString(input.placeId)) {
      return { ok: false, message: "placeId is required." } as const
    }
    return { ok: true, data: { placeId: input.placeId.trim() } } as const
  },
  async handler(input, context) {
    const parsed = input as { placeId: string }
    const providerResponse = await getNeighborhoodSummary(parsed.placeId, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const distanceMatrixOperation: OperationDefinition = {
  key: "travel.distanceMatrix",
  provider: "google",
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
    if (!isRecord(input) || !isNonEmptyString(input.origins) || !isNonEmptyString(input.destinations)) {
      return { ok: false, message: "origins and destinations are required." } as const
    }

    const mode = isNonEmptyString(input.mode) ? input.mode.trim().toLowerCase() : "driving"
    const units = isNonEmptyString(input.units) ? input.units.trim().toLowerCase() : "imperial"
    const departureTime = isNonEmptyString(input.departureTime) ? input.departureTime.trim() : String(Math.floor(Date.now() / 1000))
    const trafficModel = isNonEmptyString(input.trafficModel) ? input.trafficModel.trim() : "best_guess"

    const isValidMode = ["driving", "walking", "bicycling", "transit"].includes(mode)
    const normalizedMode = (isValidMode ? mode : "driving") as "driving" | "walking" | "bicycling" | "transit"
    const normalizedUnits = (units === "metric" ? "metric" : "imperial") as "imperial" | "metric"

    return {
      ok: true,
      data: {
        origins: input.origins.trim(),
        destinations: input.destinations.trim(),
        departureTime,
        trafficModel,
        mode: normalizedMode,
        units: normalizedUnits,
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as {
      origins: string
      destinations: string
      departureTime: string
      trafficModel: string
      mode: "driving" | "walking" | "bicycling" | "transit"
      units: "imperial" | "metric"
    }

    const providerResponse = await getDistanceMatrix(parsed, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const weatherOperation: OperationDefinition = {
  key: "weather.getForecastByLocationDate",
  provider: "google",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 20000,
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
    if (!isRecord(input) || !isNonEmptyString(input.location) || !isNonEmptyString(input.date)) {
      return { ok: false, message: "location and date are required." } as const
    }

    return {
      ok: true,
      data: {
        location: input.location.trim(),
        date: input.date.trim(),
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as { location: string; date: string }
    const providerResponse = await getWeatherForecast(
      {
        location: parsed.location,
        date: parsed.date,
      },
      {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    )

    const weather = providerResponse.weather as Record<string, unknown>
    const forecastDays = Array.isArray(weather?.forecastDays) ? weather.forecastDays : []
    if (forecastDays.length === 0) {
      return {
        providerResponse,
        weatherSummary: null,
      }
    }

    const eventDate = new Date(parsed.date)
    const eventDateStr = eventDate.toISOString().split("T")[0]

    let targetForecast: Record<string, unknown> | null = null
    for (const forecast of forecastDays) {
      const item = forecast as Record<string, unknown>
      const displayDate = item.displayDate as Record<string, unknown> | undefined
      if (!displayDate) continue
      const year = Number(displayDate.year)
      const month = Number(displayDate.month)
      const day = Number(displayDate.day)
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) continue
      const forecastDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      if (forecastDateStr === eventDateStr) {
        targetForecast = item
        break
      }
    }

    if (!targetForecast) {
      targetForecast = forecastDays[0] as Record<string, unknown>
    }

    const daytime = targetForecast?.daytimeForecast as Record<string, unknown> | undefined
    const maxTemp = targetForecast?.maxTemperature as Record<string, unknown> | undefined
    const feelsLike = targetForecast?.feelsLikeMaxTemperature as Record<string, unknown> | undefined
    const weatherCondition = daytime?.weatherCondition as Record<string, unknown> | undefined
    const descriptionObj = weatherCondition?.description as Record<string, unknown> | undefined
    const wind = daytime?.wind as Record<string, unknown> | undefined
    const windSpeed = wind?.speed as Record<string, unknown> | undefined
    const precipitation = daytime?.precipitation as Record<string, unknown> | undefined
    const probability = precipitation?.probability as Record<string, unknown> | undefined

    const celsiusToFahrenheit = (celsius: number) => Math.round((celsius * 9) / 5 + 32)
    const kmhToMph = (kmh: number) => Math.round(kmh * 0.621371)

    const maxDegrees = Number(maxTemp?.degrees)
    const feelsLikeDegrees = Number(feelsLike?.degrees)
    const relativeHumidity = Number(daytime?.relativeHumidity)
    const windValue = Number(windSpeed?.value)
    const precipPercent = Number(probability?.percent)
    const weatherType = typeof weatherCondition?.type === "string" ? weatherCondition.type : ""
    const descriptionText = typeof descriptionObj?.text === "string" ? descriptionObj.text : ""

    return {
      providerResponse,
      weatherSummary: {
        temperature: Number.isFinite(maxDegrees) ? celsiusToFahrenheit(maxDegrees) : null,
        feelsLike: Number.isFinite(feelsLikeDegrees) ? celsiusToFahrenheit(feelsLikeDegrees) : null,
        condition: weatherType ? weatherType.replace(/_/g, " ") : null,
        description: descriptionText || null,
        humidity: Number.isFinite(relativeHumidity) ? relativeHumidity : null,
        windSpeed: Number.isFinite(windValue) ? kmhToMph(windValue) : null,
        precipitation: Number.isFinite(precipPercent) ? precipPercent : null,
      },
    }
  },
}

const placeDetailsOperation: OperationDefinition = {
  key: "places.getDetails",
  provider: "google",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input) || !isNonEmptyString(input.placeId) || !isNonEmptyString(input.fieldMask)) {
      return { ok: false, message: "placeId and fieldMask are required." } as const
    }

    const expectedInternalToken = readEnv("API_MANAGER_INTERNAL_TOKEN")
    if (!expectedInternalToken) {
      return { ok: false, message: "API manager internal token is not configured." } as const
    }

    if (!isNonEmptyString(input.internalToken) || input.internalToken.trim() !== expectedInternalToken) {
      return { ok: false, message: "internalToken is invalid." } as const
    }

    return {
      ok: true,
      data: {
        placeId: input.placeId.trim(),
        fieldMask: input.fieldMask.trim(),
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as { placeId: string; fieldMask: string }
    const providerResponse = await getPlaceDetails(parsed, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const placesNearbySearchOperation: OperationDefinition = {
  key: "places.searchNearby",
  provider: "google",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input) || !isRecord(input.body) || !isNonEmptyString(input.fieldMask)) {
      return { ok: false, message: "body and fieldMask are required." } as const
    }

    const expectedInternalToken = readEnv("API_MANAGER_INTERNAL_TOKEN")
    if (!expectedInternalToken) {
      return { ok: false, message: "API manager internal token is not configured." } as const
    }

    if (!isNonEmptyString(input.internalToken) || input.internalToken.trim() !== expectedInternalToken) {
      return { ok: false, message: "internalToken is invalid." } as const
    }

    return {
      ok: true,
      data: {
        body: input.body,
        fieldMask: input.fieldMask.trim(),
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as { body: Record<string, unknown>; fieldMask: string }
    const providerResponse = await searchNearbyPlaces(parsed, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const geminiGenerateContentOperation: OperationDefinition = {
  key: "ai.gemini.generateContent",
  provider: "google",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 20000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input) || !isNonEmptyString(input.prompt)) {
      return { ok: false, message: "prompt is required." } as const
    }

    const expectedInternalToken = readEnv("API_MANAGER_INTERNAL_TOKEN")
    if (!expectedInternalToken) {
      return { ok: false, message: "API manager internal token is not configured." } as const
    }

    if (!isNonEmptyString(input.internalToken) || input.internalToken.trim() !== expectedInternalToken) {
      return { ok: false, message: "internalToken is invalid." } as const
    }

    const maxOutputTokens = typeof input.maxOutputTokens === "number" && Number.isFinite(input.maxOutputTokens)
      ? Math.max(1, Math.floor(input.maxOutputTokens))
      : 256
    const temperature = typeof input.temperature === "number" && Number.isFinite(input.temperature)
      ? input.temperature
      : 0.7

    return {
      ok: true,
      data: {
        prompt: input.prompt,
        maxOutputTokens,
        temperature,
        model: isNonEmptyString(input.model) ? input.model.trim() : undefined,
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as {
      prompt: string
      maxOutputTokens: number
      temperature: number
      model?: string
    }
    const providerResponse = await generateGeminiContent(parsed, {
      traceId: context.traceId,
      timeoutMs: context.definition.limits.timeoutMs,
      retries: context.definition.limits.retries,
    })

    return { providerResponse }
  },
}

const oneSignalPushOperation: OperationDefinition = {
  key: "push.onesignal.send",
  provider: "onesignal",
  piiPolicy: "allow",
  limits: {
    timeoutMs: 15000,
    retries: 1,
  },
  idempotent: false,
  authz: {
    requireAuth: false,
    orgScoped: false,
    allowedRoles: ["public", "platform_admin"],
    requiredStaffFlags: [],
    allowPlatformAdmin: true,
  },
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const expectedInternalToken = readEnv("API_MANAGER_INTERNAL_TOKEN")
    if (!expectedInternalToken) {
      return { ok: false, message: "API manager internal token is not configured." } as const
    }

    if (!isNonEmptyString(input.internalToken) || input.internalToken.trim() !== expectedInternalToken) {
      return { ok: false, message: "internalToken is invalid." } as const
    }

    if (!isNonEmptyString(input.targetUserId)) {
      return { ok: false, message: "targetUserId is required." } as const
    }

    if (!isRecord(input.payload)) {
      return { ok: false, message: "payload must be an object." } as const
    }

    return {
      ok: true,
      data: {
        targetUserId: input.targetUserId.trim(),
        payload: input.payload,
      },
    } as const
  },
  async handler(input, context) {
    const parsed = input as {
      targetUserId: string
      payload: Record<string, unknown>
    }

    const result = await sendPush({
      targetUserId: parsed.targetUserId,
      payload: parsed.payload,
      context: {
        traceId: context.traceId,
        timeoutMs: context.definition.limits.timeoutMs,
        retries: context.definition.limits.retries,
      },
    })

    return {
      providerMessageId: result.messageId ?? null,
    }
  },
}

export const integrationOperations: OperationDefinition[] = [
  geocodeZipOperation,
  neighborhoodSummaryOperation,
  distanceMatrixOperation,
  weatherOperation,
  placeDetailsOperation,
  placesNearbySearchOperation,
  geminiGenerateContentOperation,
  oneSignalPushOperation,
]
