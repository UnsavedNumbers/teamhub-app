/**
 * Fake Admin Settings Data Module
 *
 * Provides fake user preferences and settings for demo mode.
 */

import { DEMO_USER_IDS } from '../config'
import type { UserPreferences } from '../services/preferencesService'

// ============================================================================
// Fake Admin Settings
// ============================================================================

export const fakeOrgAdminSettings: Record<string, UserPreferences> = {
  // Coach Carla's preferences
  [DEMO_USER_IDS.COACH_CARLA]: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      attendance_issues: true,
      schedule_changes: true,
      payment_issues: true,
      registration_activity: false,
      system_announcements: true,
      frequency: 'immediate',
    },
    workflow: {
      default_landing_page: '/admin/events',
      default_season_id: '',
      remember_filters: true,
      auto_select_org: true,
    },
    profile: {
      phone: '(555) 234-5678',
      timezone: 'America/New_York',
    },
    advanced: {
      beta_features: false,
      ui_density: 'comfortable',
    },
  },

  // Admin Amy's preferences
  [DEMO_USER_IDS.ADMIN_AMY]: {
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      attendance_issues: true,
      schedule_changes: true,
      payment_issues: true,
      registration_activity: true,
      system_announcements: true,
      frequency: 'daily',
    },
    workflow: {
      default_landing_page: '/admin',
      default_season_id: '',
      remember_filters: true,
      auto_select_org: true,
    },
    profile: {
      phone: '(555) 123-4567',
      timezone: 'America/Los_Angeles',
    },
    advanced: {
      beta_features: true,
      ui_density: 'compact',
    },
  },

  // Parent Paul's preferences
  [DEMO_USER_IDS.PARENT_PAUL]: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      attendance_issues: true,
      schedule_changes: true,
      payment_issues: true,
      registration_activity: false,
      system_announcements: false,
      frequency: 'immediate',
    },
    workflow: {
      default_landing_page: '/admin/families',
      default_season_id: '',
      remember_filters: false,
      auto_select_org: true,
    },
    profile: {
      phone: '(555) 345-6789',
      timezone: 'America/Chicago',
    },
    advanced: {
      beta_features: false,
      ui_density: 'comfortable',
    },
  },

  // Platform Admin's preferences
  [DEMO_USER_IDS.PLATFORM_ADMIN]: {
    theme: 'dark',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      attendance_issues: true,
      schedule_changes: true,
      payment_issues: true,
      registration_activity: true,
      system_announcements: true,
      frequency: 'immediate',
    },
    workflow: {
      default_landing_page: '/platform-admin',
      default_season_id: '',
      remember_filters: true,
      auto_select_org: false,
    },
    profile: {
      phone: '(555) 000-0001',
      timezone: 'America/New_York',
    },
    advanced: {
      beta_features: true,
      ui_density: 'compact',
    },
  },
}

// Helper function to get user preferences by ID
export function getFakeUserPreferences(userId: string): UserPreferences | null {
  return fakeOrgAdminSettings[userId] || null
}
