/**
 * Location Domain Types
 * 
 * Types and utilities for Google Places API integration and structured address handling.
 */

/**
 * Structured address data parsed from Google Places API
 */
export interface StructuredAddress {
  place_id: string
  formatted_address: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  latitude: number
  longitude: number
}

/**
 * Props for LocationAutocomplete component
 */
export interface LocationAutocompleteProps {
  value: string // Current input value
  onChange: (address: StructuredAddress) => void
  onInputChange?: (value: string) => void // For controlled input
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  helper?: string
  disabled?: boolean
  countryRestrictions?: string[] // ISO country codes (e.g., ['us', 'ca'])
  types?: string[] // place types: 'establishment', 'address', etc.
  fields?: string[] // place details fields to fetch
}

/**
 * Type guard to check if a value is a Google Places PlaceResult
 */
export function isPlaceResult(place: unknown): place is google.maps.places.PlaceResult {
  return (
    typeof place === 'object' &&
    place !== null &&
    'place_id' in place &&
    'address_components' in place
  )
}

/**
 * Type guard to check if a PlaceResult has address components
 */
export function hasAddressComponents(place: google.maps.places.PlaceResult): boolean {
  return Array.isArray(place.address_components) && place.address_components.length > 0
}

/**
 * Type guard to check if a value has geometry with location
 */
export function hasGeometry(place: google.maps.places.PlaceResult): boolean {
  return (
    place.geometry !== undefined &&
    place.geometry !== null &&
    place.geometry.location !== undefined &&
    place.geometry.location !== null
  )
}

/**
 * Parse Google Maps address components into StructuredAddress
 * 
 * Handles missing components gracefully with fallback strategies.
 * 
 * @param components - Google Maps address_components array
 * @param formattedAddress - Fallback formatted address if parsing fails
 * @param geometry - Geometry object containing lat/lng
 * @returns StructuredAddress
 * @throws Error if required data is missing
 */
export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  formattedAddress: string,
  geometry: google.maps.places.PlaceGeometry | undefined
): StructuredAddress {
  if (!components || components.length === 0) {
    // Fallback: use formatted address as address_line1 if no components
    const lat = geometry?.location?.lat() ?? 0
    const lng = geometry?.location?.lng() ?? 0
    
    return {
      place_id: '', // Will be set by caller
      formatted_address: formattedAddress,
      address_line1: formattedAddress,
      address_line2: undefined,
      city: '',
      state: '',
      postal_code: '',
      country: '',
      latitude: lat,
      longitude: lng,
    }
  }

  const getComponent = (types: string[]): string => {
    const component = components.find(c => 
      c.types && types.some(t => c.types.includes(t))
    )
    return component?.long_name || ''
  }

  const streetNumber = getComponent(['street_number'])
  const route = getComponent(['route'])
  const premise = getComponent(['premise'])
  
  // Build address_line1: street_number + route, or premise as fallback
  const addressLine1 = `${streetNumber} ${route}`.trim() || premise || formattedAddress || ''

  if (!addressLine1) {
    console.warn('Could not parse address_line1 from components, using formatted address')
  }

  // Extract coordinates
  const lat = geometry?.location?.lat() ?? 0
  const lng = geometry?.location?.lng() ?? 0

  if (lat === 0 && lng === 0) {
    console.warn('Could not extract latitude/longitude from geometry')
  }

  return {
    place_id: '', // Will be set by caller from place.place_id
    formatted_address: formattedAddress,
    address_line1: addressLine1,
    address_line2: getComponent(['subpremise']) || undefined, // Explicit undefined for optional
    city: getComponent(['locality', 'administrative_area_level_2']) || '',
    state: getComponent(['administrative_area_level_1']) || '',
    postal_code: getComponent(['postal_code']) || '',
    country: getComponent(['country']) || '',
    latitude: lat,
    longitude: lng,
  }
}

/**
 * Safely parse a Google Places PlaceResult into StructuredAddress
 * 
 * @param place - Google Places PlaceResult
 * @returns StructuredAddress or null if parsing fails
 */
export function parsePlace(place: unknown): StructuredAddress | null {
  if (!isPlaceResult(place)) {
    return null
  }

  if (!place.place_id) {
    console.warn('Place result missing place_id')
    return null
  }

  // Fetch place details if address_components are missing
  if (!hasAddressComponents(place)) {
    console.warn('Place result missing address_components')
    // Caller should fetch details before calling this
    return null
  }

  const formattedAddress = place.formatted_address || ''
  const address = parseAddressComponents(
    place.address_components,
    formattedAddress,
    place.geometry
  )

  // Set place_id from the place
  address.place_id = place.place_id

  return address
}

/**
 * Validate that a StructuredAddress has minimum required fields
 */
export function validateStructuredAddress(address: StructuredAddress): boolean {
  return !!(
    address.place_id &&
    address.address_line1 &&
    (address.latitude !== 0 || address.longitude !== 0)
  )
}
