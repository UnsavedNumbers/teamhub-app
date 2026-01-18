/**
 * Domain Model: Event
 * 
 * Clean domain model for calendar events, separate from Supabase row types.
 * All nullability is handled at the boundary (service layer).
 */

export interface Event {
  id: string
  title: string
  type: EventType
  startTime: string
  endTime: string
  arrivalTime: string | null
  isCancelled: boolean
  cancelledAt: string | null
  cancelledByUserId: string | null
  cancellationReason: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  
  // Relations
  teamId: string
  teamName: string
  seasonId: string | null
  seasonName: string | null
  organizationId: string
  
  // Location
  location: EventLocation | null
  
  // RSVP Configuration
  rsvpConfig: RSVPConfig
  
  // Recurring pattern
  recurringPattern: RecurringPattern | null
  
  // Additional fields
  description: string | null
  notes: string | null
  requiresTravel: boolean
  overnight: boolean
  hotelName: string | null
  hotelAddress: string | null
  uniformNotes: string | null
  equipmentNotes: string | null
  weatherDependent: boolean
}

export type EventType = 
  | 'practice'
  | 'game'
  | 'tournament'
  | 'tryout'
  | 'meeting'
  | 'travel'
  | 'pickup_dropoff'
  | 'social'
  | 'blackout'

export interface EventLocation {
  id: string
  venueName: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  mapsUrl: string | null
  isVirtual: boolean
  isTbd: boolean
}

export interface RSVPConfig {
  enabled: boolean
  type: 'general' | 'athlete' | null
}

export interface RecurringPattern {
  id: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek: number[] | null
  endDate: string | null
  occurrenceCount: number | null
  exceptionDates: string[]
}
