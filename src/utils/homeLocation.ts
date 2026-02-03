import { REGEX_PATTERNS } from '../constants/validation'
import type { HomeLocation } from '../types/location'

type UserWithHomeLocation = {
  home_location?: HomeLocation | null
  home_zipcode?: string | null
} | null | undefined

type GeocoderAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

type GeocodeResult = {
  place_id: string
  formatted_address: string
  geometry?: { location?: { lat: number; lng: number } }
  address_components?: GeocoderAddressComponent[]
}

type GeocodeResponse = {
  status: string
  results: GeocodeResult[]
}

function getComponentValue(components: GeocoderAddressComponent[] | undefined, types: string[]): string {
  if (!components || components.length === 0) return ''
  const component = components.find((c) => types.some((t) => c.types?.includes(t)))
  return component?.long_name || ''
}

/**
 * Convert a US ZIP code into a HomeLocation via Google Geocoding API (REST).
 * Returns null for invalid ZIPs or if geocoding fails.
 */
export async function geocodeZipToHomeLocation(zip: string): Promise<HomeLocation | null> {
  const trimmed = zip.trim()
  if (!trimmed || !REGEX_PATTERNS.ZIP_US.test(trimmed)) {
    return null
  }

  const apiKey = import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', trimmed)
  url.searchParams.set('components', `country:US|postal_code:${trimmed}`)
  url.searchParams.set('key', apiKey)

  try {
    const resp = await fetch(url.toString())
    if (!resp.ok) return null

    const data = (await resp.json()) as GeocodeResponse
    if (data.status !== 'OK' || !data.results?.length) {
      return null
    }

    const first = data.results[0]
    if (!first.place_id || !first.geometry?.location) {
      return null
    }

    const { lat, lng } = first.geometry.location
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return null
    }

    const components = first.address_components || []
    const zipCode = getComponentValue(components, ['postal_code']) || trimmed
    const city =
      getComponentValue(components, ['locality', 'postal_town', 'administrative_area_level_3']) || undefined
    const state = getComponentValue(components, ['administrative_area_level_1']) || undefined
    const country = getComponentValue(components, ['country']) || 'United States'

    const homeLocation: HomeLocation = {
      place_id: first.place_id,
      formatted_address: first.formatted_address || '',
      zip_code: zipCode,
      coordinates: { lat, lng },
      city,
      state,
      country,
    }

    return homeLocation
  } catch (err) {
    console.error('Geocoding failed', err)
    return null
  }
}

/**
 * Display-safe ZIP value from user profile.
 */
export function getDisplayZipCode(user: UserWithHomeLocation): string | null {
  if (!user) return null
  return user.home_location?.zip_code || user.home_zipcode || null
}

/**
 * Display-safe location string for UI (City, ZIP) or ZIP only.
 */
export function getDisplayLocation(user: UserWithHomeLocation): string | null {
  const zip = getDisplayZipCode(user)
  if (!zip) return null
  const city = user?.home_location?.city?.trim()
  return city ? `${city}, ${zip}` : zip
}
