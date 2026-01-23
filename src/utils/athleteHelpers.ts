/**
 * Helper functions for athlete data access and display
 * Provides null-safe access to athlete fields
 */

import type { Athlete, Gender } from '../types/family'

/**
 * Get display name for an athlete (preferred name or full name)
 */
export function getDisplayName(athlete: Athlete): string {
    return athlete.preferred_name ?? `${athlete.first_name} ${athlete.last_name}`
}

/**
 * Get gender label for display
 */
export function getGenderLabel(gender: Gender | null): string {
    if (!gender) return 'Not specified'
    return gender.charAt(0).toUpperCase() + gender.slice(1)
}

/**
 * Get athlete initials for avatar
 */
export function getAthleteInitials(firstName: string, lastName: string): string {
    const first = firstName?.trim().charAt(0).toUpperCase() || ''
    const last = lastName?.trim().charAt(0).toUpperCase() || ''
    return first + last || '?'
}

/**
 * Calculate age from birthdate
 */
export function calculateAge(birthdate: string | null): number | null {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

/**
 * Format sports for display
 */
export function formatSports(sports?: Array<{ sport_id: string; sport_name: string; sport_type: 'plays' | 'interested' }>): {
    plays: string[]
    interested: string[]
} {
    if (!sports || sports.length === 0) {
        return { plays: [], interested: [] }
    }

    const plays = sports.filter(s => s.sport_type === 'plays').map(s => s.sport_name)
    const interested = sports.filter(s => s.sport_type === 'interested').map(s => s.sport_name)

    return { plays, interested }
}
