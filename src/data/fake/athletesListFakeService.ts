/**
 * Fake Athletes List Service
 * 
 * Mock implementation for demo/testing purposes.
 * Simulates the real athletesListService with fake data and delays.
 */

import type { OperationResult } from '../services/athletesListService'

// Simulate network delay
const FAKE_DELAY = 500 // ms

/**
 * Simulate deleting a single athlete
 */
export async function deleteAthlete(athleteId: string): Promise<OperationResult<void>> {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (!athleteId) {
                resolve({ success: false, error: 'Athlete ID is required' })
                return
            }

            console.log(`[FakeAthletesListService] Simulated delete for athlete ${athleteId}`)
            resolve({ success: true })
        }, FAKE_DELAY)
    })
}

/**
 * Simulate deleting multiple athletes
 */
export async function deleteAthletes(athleteIds: string[]): Promise<OperationResult<{ deletedCount: number }>> {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (!athleteIds || athleteIds.length === 0) {
                resolve({ success: false, error: 'No athletes selected' })
                return
            }

            console.log(`[FakeAthletesListService] Simulated bulk delete for ${athleteIds.length} athletes`)
            resolve({ success: true, data: { deletedCount: athleteIds.length } })
        }, FAKE_DELAY)
    })
}
