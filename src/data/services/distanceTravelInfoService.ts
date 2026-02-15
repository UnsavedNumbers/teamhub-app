
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { DistanceTravelRequest, DistanceTravelResponse } from '../../types/distanceTravel'

export async function getDistanceAndTravelInfo(
    params: DistanceTravelRequest
): Promise<{ data: DistanceTravelResponse | null; error: Error | null }> {
    console.groupCollapsed(`%cgetDistanceAndTravelInfo`, 'color: #666; font-weight: bold;');
    debug.data('DistanceTravelInfoService.getDistanceAndTravelInfo', 'Request', { origin: params.origin, destinations: params.destinations })
    debug.perf.start('distanceTravelInfoService.getDistanceAndTravelInfo')

    try {
        const { data, error } = await supabase.functions.invoke('distance-travel-info', {
            body: params,
        })

        if (error) {
            debug.perf.end('distanceTravelInfoService.getDistanceAndTravelInfo')
            debug.error('DistanceTravelInfoService.getDistanceAndTravelInfo', 'Edge function error', { error, origin: params.origin, destinations: params.destinations })
            console.groupEnd()
            console.error('Distance travel service error:', error)
            // Map Edge Function HTTP errors to Error object
            // If error is an object with context (like what Supabase returns), handle it.
            // Supabase .invoke() returns { data, error } where error is post-network failure.
            // Use the error message if available.
            return {
                data: null,
                error: error instanceof Error ? error : new Error(error.message || String(error))
            }
        }

        // Check if the data itself contains an error structure if the status was 200 but logic failed?
        // My Edge Function returns 400/500 for request level errors, which Supabase treats as `error`.
        // So `data` should be the response.

        debug.perf.end('distanceTravelInfoService.getDistanceAndTravelInfo')
        debug.data('DistanceTravelInfoService.getDistanceAndTravelInfo', 'Response', { origin: params.origin, destinations: params.destinations, hasData: !!data })
        console.groupEnd()
        return { data: data as DistanceTravelResponse, error: null }
    } catch (err) {
        debug.perf.end('distanceTravelInfoService.getDistanceAndTravelInfo')
        debug.error('DistanceTravelInfoService.getDistanceAndTravelInfo', 'Unexpected error', { error: err, origin: params.origin, destinations: params.destinations })
        console.groupEnd()
        console.error('Unexpected error in distanceTravelInfoService:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown client error')
        }
    }
}
