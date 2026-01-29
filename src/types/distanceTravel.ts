export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit'
export type TrafficModel = 'best_guess' | 'optimistic' | 'pessimistic'
export type UnitSystem = 'miles' | 'kilometers'

export type OriginInput =
    | { type: 'address'; value: string }
    | { type: 'city_state'; city: string; state: string }
    | { type: 'zip'; zip: string }
    | { type: 'place_id'; place_id: string }

export type DestinationInput =
    | { label?: string; address: string }
    | { label?: string; city: string; state: string }
    | { label?: string; place_id: string }

export interface DistanceTravelRequest {
    origin: OriginInput
    origin_label?: string
    destinations: DestinationInput[]
    travel_mode?: TravelMode
    departure_time?: 'now' | string
    traffic_model?: TrafficModel
    units?: UnitSystem
}

export type TravelWarning =
    | 'toll_road'
    | 'ferry'
    | 'limited_access'
    | 'traffic_congestion'
    | string

export interface DistanceTravelResult {
    destination_label: string | null
    origin_label: string | null
    distance: { value: number; unit: 'miles' | 'kilometers' }
    duration: { value: number; unit: 'minutes' }
    duration_in_traffic?: { value: number; unit: 'minutes' }
    travel_mode: TravelMode
    route_summary: string
    map_link: string
    warnings: TravelWarning[]
}

export interface DistanceTravelError {
    destination_label: string | null
    destination_reference: string
    error_code: string
    error_message: string
}

export function isDistanceTravelError(result: DistanceTravelResult | DistanceTravelError): result is DistanceTravelError {
    return 'error_code' in result
}

export interface DistanceTravelResponse {
    origin_label: string | null
    results: Array<DistanceTravelResult | DistanceTravelError>
}

// Error codes for the service
export const DistanceTravelErrorCodes = {
    INVALID_ORIGIN: 'INVALID_ORIGIN',
    INVALID_REQUEST: 'INVALID_REQUEST',
    INVALID_DESTINATION: 'INVALID_DESTINATION',
    ZERO_RESULTS: 'ZERO_RESULTS',
    REQUEST_DENIED: 'REQUEST_DENIED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED', // 429
    OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
    REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE', // 400
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type DistanceTravelErrorCode = typeof DistanceTravelErrorCodes[keyof typeof DistanceTravelErrorCodes]
