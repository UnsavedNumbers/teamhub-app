/**
 * Services Layer Index
 *
 * Central re-export point for all data services.
 * Components should import from this file to access services.
 *
 * USAGE:
 * ```typescript
 * import { getEvents, getTeams, getPayments } from '@/data/services'
 * ```
 */

// Event/Calendar Services
export * from './eventsService'

// Team Services
export * from './teamsService'

// Payment Services
export * from './paymentsService'

// Travel Services
export * from './travelService'

// Message/Notification Services
export * from './messagesService'

// Family/Children Services
export * from './familyService'

// Preferences Services
export * from './preferencesService'

// RSVP Services
export * from './rsvpService'

// Fan Services
export * from './fanService'

// Organization Settings Services
export * from './organizationSettingsService'
export * from './organizationService'
export * from './demoOrgService'
export * from './demoCodeService'
export * from './demoSessionService'

// License Tiers Services
export * from './licenseTiersService'

// Ticketing Services
export * from './ticketingService'
export * from './venueService'

// Re-export types from fake data that services use
export type { UserContext, PermissionSet } from '../fake/userContext'
