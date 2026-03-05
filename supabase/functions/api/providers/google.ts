import { fetchWithPolicy } from "../core/http.ts"
import { ApiManagerError } from "../core/errors.ts"

export interface GoogleProviderContext {
  traceId: string
  timeoutMs: number
  retries: number
}

function resolveGeocodingApiKey(): string {
  const key = Deno.env.get("GOOGLE_GEOCODING_API_KEY") ?? Deno.env.get("GOOGLE_PLACES_API_KEY")
  if (!key) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google geocoding API key is not configured.", 500)
  }
  return key
}

function resolvePlacesApiKey(): string {
  const key = Deno.env.get("GOOGLE_PLACES_API_KEY")
  if (!key) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Places API key is not configured.", 500)
  }
  return key
}

function resolveGeminiApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY")
  if (!key) {
    throw new ApiManagerError("PROVIDER_ERROR", "Gemini API key is not configured.", 500)
  }
  return key
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export async function geocodeZip(
  zip: string,
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = resolveGeocodingApiKey()
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  url.searchParams.set("address", zip)
  url.searchParams.set("components", `country:US|postal_code:${zip}`)
  url.searchParams.set("key", apiKey)

  const response = await fetchWithPolicy(
    url.toString(),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google geocode request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function getNeighborhoodSummary(
  placeId: string,
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = resolvePlacesApiKey()
  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`

  const response = await fetchWithPolicy(
    endpoint,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,neighborhoodSummary",
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Places request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function getPlaceDetails(
  args: { placeId: string; fieldMask: string },
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = resolvePlacesApiKey()
  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(args.placeId)}`

  const response = await fetchWithPolicy(
    endpoint,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": args.fieldMask,
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Place Details request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function searchNearbyPlaces(
  args: { body: Record<string, unknown>; fieldMask: string },
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = resolvePlacesApiKey()
  const endpoint = "https://places.googleapis.com/v1/places:searchNearby"

  const response = await fetchWithPolicy(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": args.fieldMask,
      },
      body: JSON.stringify(args.body),
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Nearby Search request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function generateGeminiContent(
  args: {
    prompt: string
    maxOutputTokens: number
    temperature: number
    model?: string
  },
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = resolveGeminiApiKey()
  const model = (args.model && args.model.trim().length > 0) ? args.model.trim() : "gemini-pro"
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`

  const response = await fetchWithPolicy(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: args.prompt }] }],
        generationConfig: {
          maxOutputTokens: args.maxOutputTokens,
          temperature: args.temperature,
        },
      }),
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Gemini generateContent request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function getDistanceMatrix(
  args: {
    origins: string
    destinations: string
    departureTime: string
    trafficModel: string
    units: "imperial" | "metric"
    mode: "driving" | "walking" | "bicycling" | "transit"
  },
  context: GoogleProviderContext,
): Promise<unknown> {
  const apiKey = Deno.env.get("GOOGLE_DISTANCE_MATRIX_API_KEY") ?? Deno.env.get("GOOGLE_PLACES_API_KEY")
  if (!apiKey) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Distance Matrix API key is not configured.", 500)
  }

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
  url.searchParams.set("origins", args.origins)
  url.searchParams.set("destinations", args.destinations)
  url.searchParams.set("departure_time", args.departureTime)
  url.searchParams.set("traffic_model", args.trafficModel)
  url.searchParams.set("units", args.units)
  url.searchParams.set("mode", args.mode)
  url.searchParams.set("key", apiKey)

  const response = await fetchWithPolicy(
    url.toString(),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const raw = await response.text()
  const parsed = raw ? parseJson(raw) : null

  if (!response.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Distance Matrix request failed.", 502, {
      status: response.status,
      response: parsed,
    })
  }

  return parsed
}

export async function getWeatherForecast(
  args: { location: string; date: string },
  context: GoogleProviderContext,
): Promise<{ geocode: unknown; weather: unknown }> {
  const apiKey = Deno.env.get("GOOGLE_WEATHER_API_KEY")
  if (!apiKey) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Weather API key is not configured.", 500)
  }

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(args.location)}&key=${apiKey}`
  const geocodeResponse = await fetchWithPolicy(
    geocodeUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const geocodeRaw = await geocodeResponse.text()
  const geocodeParsed = geocodeRaw ? parseJson(geocodeRaw) : null

  if (!geocodeResponse.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google geocode request for weather failed.", 502, {
      status: geocodeResponse.status,
      response: geocodeParsed,
    })
  }

  const geocode = geocodeParsed as Record<string, unknown>
  const results = Array.isArray(geocode?.results) ? geocode.results : []
  const first = results.length > 0 ? (results[0] as Record<string, unknown>) : null
  const geometry = first?.geometry as Record<string, unknown> | undefined
  const locationObj = geometry?.location as Record<string, unknown> | undefined
  const lat = typeof locationObj?.lat === "number" ? locationObj.lat : null
  const lng = typeof locationObj?.lng === "number" ? locationObj.lng : null

  if (lat === null || lng === null) {
    throw new ApiManagerError("PROVIDER_ERROR", "Location not found for weather lookup.", 404, {
      geocode,
    })
  }

  const weatherUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&days=10`
  const weatherResponse = await fetchWithPolicy(
    weatherUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      timeoutMs: context.timeoutMs,
      retries: context.retries,
      backoffMs: 200,
      traceId: context.traceId,
    },
  )

  const weatherRaw = await weatherResponse.text()
  const weatherParsed = weatherRaw ? parseJson(weatherRaw) : null

  if (!weatherResponse.ok) {
    throw new ApiManagerError("PROVIDER_ERROR", "Google Weather request failed.", 502, {
      status: weatherResponse.status,
      response: weatherParsed,
    })
  }

  return {
    geocode: geocodeParsed,
    weather: weatherParsed,
  }
}
