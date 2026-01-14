/**
 * localStorage Utilities for Organization Setup Flow
 * 
 * Manages the setupOrganization flag used to track when a user is going
 * through the onboarding flow. This flag survives page refreshes and OAuth
 * redirects.
 * 
 * Flag Schema:
 * - key: 'youthsports_setup_organization'
 * - value: JSON string with { flag: boolean, timestamp: number }
 */

const STORAGE_KEY = 'youthsports_setup_organization'
const EXPIRY_MS = 60 * 60 * 1000 // 1 hour in milliseconds

interface SetupOrganizationData {
    flag: boolean
    timestamp: number
}

/**
 * Check if the stored data is valid and not expired
 */
function isDataValid(data: SetupOrganizationData | null): boolean {
    if (!data || typeof data.flag !== 'boolean' || typeof data.timestamp !== 'number') {
        return false
    }

    const now = Date.now()
    const elapsed = now - data.timestamp

    return elapsed < EXPIRY_MS
}

/**
 * Parse stored JSON safely
 */
function parseStoredData(): SetupOrganizationData | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            return null
        }

        const parsed = JSON.parse(stored) as unknown

        // Type guard to ensure expected shape
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'flag' in parsed &&
            'timestamp' in parsed
        ) {
            return parsed as SetupOrganizationData
        }

        return null
    } catch {
        // Invalid JSON or other error
        return null
    }
}

/**
 * Store the setupOrganization flag in localStorage with current timestamp.
 * Call this when user clicks "Setup an Organization" button.
 */
export function setSetupOrganizationFlag(): void {
    const data: SetupOrganizationData = {
        flag: true,
        timestamp: Date.now(),
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
        // localStorage might be full or unavailable
        console.error('Failed to set setupOrganization flag:', error)
    }
}

/**
 * Get the setupOrganization flag from localStorage.
 * Returns true only if the flag exists and is not expired.
 */
export function getSetupOrganizationFlag(): boolean {
    const data = parseStoredData()

    if (!isDataValid(data)) {
        // Clean up invalid/expired data
        clearSetupOrganizationFlag()
        return false
    }

    return data!.flag === true
}

/**
 * Clear the setupOrganization flag from localStorage.
 * Call this after successful redirect to onboarding.
 */
export function clearSetupOrganizationFlag(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        // localStorage might be unavailable
        console.error('Failed to clear setupOrganization flag:', error)
    }
}

/**
 * Clean up any stale flags that are older than 1 hour.
 * Call this on app initialization or page load.
 */
export function cleanupStaleFlags(): void {
    const data = parseStoredData()

    if (data !== null && !isDataValid(data)) {
        clearSetupOrganizationFlag()
    }
}
