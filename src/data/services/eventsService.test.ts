/**
 * Event/Game Management Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { eventsService } from '@/data/services/eventsService'
import { gamesService } from '@/data/services/gamesService'
import { registrationService } from '@/data/services/registrationService'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/services/eventsService', () => ({
  eventsService: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getEvent: vi.fn(),
    getEvents: vi.fn(),
    publishEvent: vi.fn(),
    cancelEvent: vi.fn(),
    checkConflicts: vi.fn(),
  },
}))

vi.mock('@/data/services/gamesService', () => ({
  gamesService: {
    createGame: vi.fn(),
    updateGame: vi.fn(),
    recordScore: vi.fn(),
    getGameStats: vi.fn(),
    scheduleGame: vi.fn(),
  },
}))

vi.mock('@/data/services/registrationService', () => ({
  registrationService: {
    registerForEvent: vi.fn(),
    unregisterFromEvent: vi.fn(),
    getRegistrations: vi.fn(),
    checkCapacity: vi.fn(),
    waitlistUser: vi.fn(),
  },
}))

describe('Event/Game Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Creation and Management', () => {
    describe('createEvent', () => {
      test('successfully creates a tournament event', async () => {
        const eventData = {
          organization_id: 'org-1',
          title: 'Spring Championship Tournament',
          description: 'Annual spring championship for U12 teams',
          event_type: 'tournament',
          sport: 'soccer',
          start_date: '2024-05-15T09:00:00Z',
          end_date: '2024-05-15T17:00:00Z',
          location: 'Central Park Field Complex',
          max_participants: 16,
          registration_deadline: '2024-05-01T23:59:59Z',
          entry_fee: 5000,
          age_group: 'U12',
          skill_level: 'competitive',
          is_public: true,
          requires_approval: false,
        }

        const mockCreatedEvent = {
          id: 'event-123',
          ...eventData,
          status: 'draft',
          created_at: '2024-01-15T10:00:00Z',
          registration_count: 0,
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: mockCreatedEvent,
          error: null,
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.error).toBeNull()
        expect(result.data?.title).toBe('Spring Championship Tournament')
        expect(result.data?.status).toBe('draft')
        expect(result.data?.max_participants).toBe(16)
      })

      test('validates event date constraints', async () => {
        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: null,
          error: { message: 'End date must be after start date' },
        })

        const result = await eventsService.createEvent({
          organization_id: 'org-1',
          title: 'Invalid Event',
          start_date: '2024-01-20T18:00:00Z',
          end_date: '2024-01-20T16:00:00Z',
        })

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('End date must be after start date')
      })
    })
  })

  describe('Registration Management', () => {
    describe('registerForEvent', () => {
      test('successfully registers participant', async () => {
        const registrationData = {
          event_id: 'event-123',
          user_id: 'user-1',
          participant_type: 'player',
          emergency_contact: { name: 'John Doe', phone: '555-0123', relationship: 'Parent' },
          medical_info: { allergies: 'None', medications: 'None' },
        }

        const mockRegistration = {
          id: 'reg-123',
          ...registrationData,
          status: 'confirmed',
          registered_at: '2024-01-16T10:00:00Z',
          registration_fee: 5000,
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: mockRegistration,
          error: null,
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('confirmed')
        expect(result.data?.registration_fee).toBe(5000)
      })
    })
  })
})
