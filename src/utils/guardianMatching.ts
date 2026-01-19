/**
 * Guardian Matching Utilities
 *
 * Client-side utilities for guardian matching, email validation,
 * and form handling during athlete creation.
 */

import type { GuardianMatch, GuardianFormData } from "@/types/family"
import { findGuardianByEmail, normalizeEmail, validateGuardianEmail } from '@/data/services/guardianService'

// ============================================================================
// Email Validation & Normalization (Re-export from service)
// ============================================================================

export { normalizeEmail, validateGuardianEmail }

// ============================================================================
// Guardian Matching Logic
// ============================================================================

/**
 * Check guardian match with debouncing support
 * Returns match result or null if email is invalid
 */
export async function checkGuardianMatch(
    email: string,
    orgId: string
): Promise<GuardianMatch | null> {
    // Validate email first
    if (!email || !validateGuardianEmail(email)) {
        return null
    }

    // Call service to find guardian
    const { data, error } = await findGuardianByEmail(email, orgId)

    if (error) {
        console.error('Error checking guardian match:', error)
        return null
    }

    return data
}

/**
 * Debounce helper for email input
 * Returns a debounced function that delays execution
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null
            func(...args)
        }

        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(later, wait)
    }
}

// ============================================================================
// Form Validation
// ============================================================================

/**
 * Validate guardian form data
 */
export function validateGuardianFormData(
    data: GuardianFormData
): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.email || !data.email.trim()) {
        errors.push('Email is required')
    } else if (!validateGuardianEmail(data.email)) {
        errors.push('Invalid email format')
    }

    if (!data.relationship_type) {
        errors.push('Relationship type is required')
    }

    return {
        isValid: errors.length === 0,
        errors
    }
}

/**
 * Validate array of guardian form data
 */
export function validateGuardians(
    guardians: GuardianFormData[]
): { isValid: boolean; errors: Record<number, string[]> } {
    const errors: Record<number, string[]> = {}

    guardians.forEach((guardian, index) => {
        const validation = validateGuardianFormData(guardian)
        if (!validation.isValid) {
            errors[index] = validation.errors
        }
    })

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    }
}

/**
 * Check for duplicate guardian emails in form
 */
export function findDuplicateEmails(
    guardians: GuardianFormData[]
): number[] {
    const emailMap = new Map<string, number[]>()
    const duplicateIndexes: number[] = []

    guardians.forEach((guardian, index) => {
        if (!guardian.email) return

        const normalized = normalizeEmail(guardian.email)
        const indexes = emailMap.get(normalized) || []
        indexes.push(index)
        emailMap.set(normalized, indexes)
    })

    emailMap.forEach((indexes) => {
        if (indexes.length > 1) {
            duplicateIndexes.push(...indexes)
        }
    })

    return duplicateIndexes
}

// ============================================================================
// UI Helper Functions
// ============================================================================

/**
 * Get match indicator color based on match result
 */
export function getMatchIndicatorColor(match: GuardianMatch | null): string {
    if (!match) return 'gray'
    if (!match.exists) return 'yellow' // Will create invite
    return 'green' // Can link existing user
}

/**
 * Get match indicator text based on match result
 */
export function getMatchIndicatorText(match: GuardianMatch | null): string {
    if (!match) return 'Enter email to check'
    if (!match.exists) return 'New guardian - will send invite'
    if (match.linkedAthletes.length === 0) {
        return 'Existing user - will link'
    }
    return `Linked to ${match.linkedAthletes.length} athlete(s)`
}

/**
 * Get match suggestion action text
 */
export function getMatchActionText(match: GuardianMatch | null): string {
    if (!match) return 'Check Email'
    if (!match.exists) return 'Will Invite'
    if (match.suggestion === 'already_linked') return 'Already Linked'
    return 'Will Link'
}

/**
 * Format athlete names from match for display
 */
export function formatLinkedAthletes(match: GuardianMatch | null): string {
    if (!match || !match.linkedAthletes || match.linkedAthletes.length === 0) {
        return ''
    }

    const names = match.linkedAthletes.map(a => `${a.first_name} ${a.last_name}`)
    
    if (names.length === 1) {
        return names[0]
    } else if (names.length === 2) {
        return names.join(' and ')
    } else {
        return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
    }
}

/**
 * Check if guardian is already linked to a specific athlete
 */
export function isGuardianAlreadyLinked(
    match: GuardianMatch | null,
    athleteId: string | null
): boolean {
    if (!match || !athleteId) return false
    return match.linkedAthletes.some(a => a.id === athleteId)
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Create empty guardian form data
 */
export function createEmptyGuardian(): GuardianFormData {
    return {
        email: '',
        relationship_type: 'parent'
    }
}

/**
 * Create default guardians array with one empty guardian
 */
export function createDefaultGuardians(): GuardianFormData[] {
    return [createEmptyGuardian()]
}
