/**
 * Registration Mode Utilities
 * 
 * Utilities for checking program registration mode configuration.
 * Determines whether a program allows individual registration, team registration, or both.
 */

import { supabase } from '../lib/supabase'
import { USE_FAKE_DATA } from '../data/config'

/**
 * Registration mode values
 */
export type RegistrationMode = 'individual_only' | 'team_only' | 'both'

/**
 * Check if a program allows team registration
 * 
 * @param programId - The program ID to check
 * @returns Promise resolving to true if team registration is allowed, false otherwise
 */
export async function canRegisterAsTeam(programId: string): Promise<boolean> {
  if (!programId || programId.trim() === '') {
    return false
  }

  if (USE_FAKE_DATA) {
    // In fake data mode, assume team registration is allowed (backward compatible)
    return true
  }

  try {
    const { data, error } = await (supabase as any)
      .from('programs')
      .select('registration_mode')
      .eq('id', programId)
      .single()

    if (error || !data) {
      // If program not found or error, default to allowing team registration (backward compatible)
      console.warn('[registrationMode] Error fetching program registration mode:', error)
      return true
    }

    const mode = (data as { registration_mode?: RegistrationMode | null })?.registration_mode ?? null

    // Default to 'both' if null (backward compatible)
    if (!mode) {
      return true
    }

    // Team registration allowed if mode is 'team_only' or 'both'
    return mode === 'team_only' || mode === 'both'
  } catch (err) {
    console.error('[registrationMode] Exception checking team registration:', err)
    // Default to allowing team registration on error (backward compatible)
    return true
  }
}

/**
 * Check if a program allows individual registration
 * 
 * @param programId - The program ID to check
 * @returns Promise resolving to true if individual registration is allowed, false otherwise
 */
export async function canRegisterAsIndividual(programId: string): Promise<boolean> {
  if (!programId || programId.trim() === '') {
    return false
  }

  if (USE_FAKE_DATA) {
    // In fake data mode, assume individual registration is allowed (backward compatible)
    return true
  }

  try {
    const { data, error } = await (supabase as any)
      .from('programs')
      .select('registration_mode')
      .eq('id', programId)
      .single()

    if (error || !data) {
      // If program not found or error, default to allowing individual registration (backward compatible)
      console.warn('[registrationMode] Error fetching program registration mode:', error)
      return true
    }

    const mode = (data as { registration_mode?: RegistrationMode | null })?.registration_mode ?? null

    // Default to 'both' if null (backward compatible)
    if (!mode) {
      return true
    }

    // Individual registration allowed if mode is 'individual_only' or 'both'
    return mode === 'individual_only' || mode === 'both'
  } catch (err) {
    console.error('[registrationMode] Exception checking individual registration:', err)
    // Default to allowing individual registration on error (backward compatible)
    return true
  }
}

/**
 * Get the registration mode for a program
 * 
 * @param programId - The program ID
 * @returns Promise resolving to the registration mode, or 'both' if not found/error
 */
export async function getRegistrationMode(programId: string): Promise<RegistrationMode> {
  if (!programId || programId.trim() === '') {
    return 'both'
  }

  if (USE_FAKE_DATA) {
    return 'both'
  }

  try {
    const { data, error } = await (supabase as any)
      .from('programs')
      .select('registration_mode')
      .eq('id', programId)
      .single()

    if (error || !data) {
      console.warn('[registrationMode] Error fetching registration mode:', error)
      return 'both'
    }

    const mode = (data as { registration_mode?: RegistrationMode | null })?.registration_mode ?? null
    return mode || 'both'
  } catch (err) {
    console.error('[registrationMode] Exception getting registration mode:', err)
    return 'both'
  }
}
