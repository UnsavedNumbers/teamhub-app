/**
 * Preferences Service
 * 
 * Provides CRUD operations for user preferences stored in users.preferences JSONB column.
 * Handles both authenticated (Supabase) and demo (localStorage) modes.
 */

import { USE_FAKE_DATA } from '../config'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database, Json } from '../../lib/supabase.extended.types'
import { getFakeUserPreferences } from '../fake/fakeSettings'

// ============================================================================
// Types
// ============================================================================

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notifications?: {
    email?: boolean
    push?: boolean
    attendance_issues?: boolean
    schedule_changes?: boolean
    payment_issues?: boolean
    registration_activity?: boolean
    system_announcements?: boolean
    frequency?: 'immediate' | 'daily' | 'weekly'
  }
  workflow?: {
    default_landing_page?: string
    default_season_id?: string
    remember_filters?: boolean
    auto_select_org?: boolean
  }
  profile?: {
    phone?: string
    timezone?: string
  }
  advanced?: {
    beta_features?: boolean
    ui_density?: 'comfortable' | 'compact'
  }
  [key: string]: unknown // Allow other preferences
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user preferences from Supabase
 */
export async function getUserPreferences(
  userId: string
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    // Demo mode: return fake preferences
    const fakePrefs = getFakeUserPreferences(userId)
    return { data: fakePrefs || {}, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (error) {
      // PGRST116 = "No rows returned"
      if (error.code === 'PGRST116') {
        return { data: null, error: null } // User doesn't exist, return null
      }
      throw error
    }

    // Parse preferences JSONB (default to empty object)
    const dataAny = data as UserPreferences
    const preferences = (dataAny?.preferences as UserPreferences) || {}
    return { data: preferences, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Update a single user preference
 */
export async function updateUserPreference(
  userId: string,
  key: string,
  value: unknown
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    // Demo mode: no-op (preferences stored in localStorage)
    return { data: null, error: null }
  }

  try {
    // First, get current preferences
    const { data: currentData, error: fetchError } = await getUserPreferences(userId)
    
    if (fetchError) {
      throw fetchError
    }

    // Merge new preference into existing preferences
    const updatedPreferences: UserPreferences = {
      ...(currentData || {}),
      [key]: value,
    }

    type UsersUpdate = Database['public']['Tables']['users']['Update']
    const updateData = { preferences: updatedPreferences as Json } satisfies UsersUpdate
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('preferences')
      .single()

    if (error) throw error

    type UserData = { preferences?: UserPreferences }
    const userData = data as UserData
    const preferences = userData?.preferences || {}
    return { data: preferences, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Update multiple user preferences at once
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    // Demo mode: no-op
    return { data: null, error: null }
  }

  try {
    // Get current preferences
    const { data: currentData, error: fetchError } = await getUserPreferences(userId)
    
    if (fetchError) {
      throw fetchError
    }

    // Merge new preferences
    const updatedPreferences: UserPreferences = {
      ...(currentData || {}),
      ...preferences,
    }

    type UsersUpdate = Database['public']['Tables']['users']['Update']
    const updateData = { preferences: updatedPreferences as Json } satisfies UsersUpdate
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('preferences')
      .single()

    if (error) throw error

    type UserData = { preferences?: UserPreferences }
    const userData = data as UserData
    const prefs = userData?.preferences || {}
    return { data: prefs, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Clear a specific preference (set to null/undefined)
 */
export async function clearUserPreference(
  userId: string,
  key: string
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return { data: null, error: null }
  }

  try {
    const { data: currentData, error: fetchError } = await getUserPreferences(userId)
    
    if (fetchError) {
      throw fetchError
    }

    // Remove key from preferences
    const updatedPreferences = { ...(currentData || {}) }
    delete updatedPreferences[key]

    type UsersUpdate = Database['public']['Tables']['users']['Update']
    const updateData = { preferences: updatedPreferences as Json } satisfies UsersUpdate
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('preferences')
      .single()

    if (error) throw error

    type UserData = { preferences?: UserPreferences }
    const userData = data as UserData
    const prefs = userData?.preferences || {}
    return { data: prefs, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}
