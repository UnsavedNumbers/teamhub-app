import { REGEX_PATTERNS } from '../constants/validation'
import type { HomeLocation } from '../types/location'
import { isGoogleMapsLoaded, loadGoogleMapsScript } from './googleMapsLoader'

type UserWithHomeLocation = {
  home_location?: HomeLocation | null
  home_zipcode?: string | null
} | null | undefined

async function ensureGeocoder(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (isGoogleMapsLoaded() && window.google?.maps?.Geocoder) return true

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) return false

  try {
    await loadGoogleMapsScript(apiKey)
  } catch (err) {
    console.error('Failed to load Google Maps script', err)
    return false
  }

  return !!window.google?.maps?.Geocoder
}

function getComponentValue(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  types: string[]
): string {
  if (!components || components.length === 0) return ''
  const component = components.find((c) => types.some((t) => c.types?.includes(t)))
  return component?.long_name || ''
}

/**
 * Convert a US ZIP code into a HomeLocation via Google Maps Geocoder.
 * Returns null for invalid ZIPs or if geocoding fails.
 */
export async function geocodeZipToHomeLocation(zip: string): Promise<HomeLocation | null> {
  const trimmed = zip.trim()
  if (!trimmed || !REGEX_PATTERNS.ZIP_US.test(trimmed)) {
    return null
  }

  const ready = await ensureGeocoder()
  if (!ready) return null

  return new Promise<HomeLocation | null>((resolve) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode(
      {
        address: trimmed,
        componentRestrictions: { country: 'US', postalCode: trimmed },
      },
      (results, status) => {
        if (status !== 'OK' || !results || results.length === 0) {
          resolve(null)
          return
        }

        const first = results[0]
        const location = first.geometry?.location
        if (!first.place_id || !location) {
          resolve(null)
          return
        }

        const lat = typeof location.lat === 'function' ? location.lat() : location.lat
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng
        if (lat === undefined || lng === undefined) {
          resolve(null)
          return
        }

        const components = first.address_components || []
        const zipCode = getComponentValue(components, ['postal_code']) || trimmed
        const city =
          getComponentValue(components, ['locality', 'postal_town', 'administrative_area_level_3']) ||
          undefined
        const state = getComponentValue(components, ['administrative_area_level_1']) || undefined
        const country = getComponentValue(components, ['country']) || 'United States'

        const homeLocation: HomeLocation = {
          place_id: first.place_id,
          formatted_address: first.formatted_address || '',
          zip_code: zipCode,
          coordinates: {
            lat,
            lng,
          },
          city,
          state,
          country,
        }

        resolve(homeLocation)
      }
    )
  })
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
