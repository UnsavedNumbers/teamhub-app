/**
 * Event/Game Management Tests
 *
 * Comprehensive test suite for event creation, registration, scheduling,
 * attendance tracking, and game management functionality.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../supabase'
import { eventsService } from '../../data/services/eventsService'
import { gamesService } from '../../data/services/gamesService'
import { registrationService } from '../../data/services/registrationService'

// Mock dependencies
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('../../data/services/eventsService', () => ({
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

vi.mock('../../data/services/gamesService', () => ({
  gamesService: {
    createGame: vi.fn(),
    updateGame: vi.fn(),
    recordScore: vi.fn(),
    getGameStats: vi.fn(),
    scheduleGame: vi.fn(),
  },
}))

vi.mock('../../data/services/registrationService', () => ({
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
          entry_fee: 5000, // $50
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

      test('creates a practice session event', async () => {
        const eventData = {
          organization_id: 'org-1',
          title: 'Weekly Practice',
          event_type: 'practice',
          sport: 'basketball',
          start_date: '2024-01-20T16:00:00Z',
          end_date: '2024-01-20T18:00:00Z',
          location: 'School Gym',
          max_participants: 25,
          is_recurring: true,
          recurrence_pattern: 'weekly',
          recurrence_end_date: '2024-05-20T00:00:00Z',
        }

        const mockCreatedEvent = {
          id: 'event-practice',
          ...eventData,
          status: 'published',
          recurrence_instances: 17, // 17 weeks
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: mockCreatedEvent,
          error: null,
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.data?.event_type).toBe('practice')
        expect(result.data?.is_recurring).toBe(true)
        expect(result.data?.recurrence_instances).toBe(17)
      })

      test('validates event date constraints', async () => {
        const eventData = {
          organization_id: 'org-1',
          title: 'Invalid Event',
          start_date: '2024-01-20T18:00:00Z',
          end_date: '2024-01-20T16:00:00Z', // End before start
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: null,
          error: { message: 'End date must be after start date' },
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('End date must be after start date')
      })

      test('validates registration deadline', async () => {
        const eventData = {
          organization_id: 'org-1',
          title: 'Late Deadline Event',
          start_date: '2024-05-15T09:00:00Z',
          registration_deadline: '2024-05-20T23:59:59Z', // After event start
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: null,
          error: { message: 'Registration deadline must be before event start' },
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Registration deadline must be before event start')
      })

      test('handles event capacity limits', async () => {
        const eventData = {
          organization_id: 'org-1',
          title: 'Large Event',
          max_participants: 1000, // Exceeds limit
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: null,
          error: { message: 'Maximum participants cannot exceed 500' },
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Maximum participants cannot exceed 500')
      })

      test('validates required fields', async () => {
        const eventData = {
          organization_id: 'org-1',
          // Missing required title
          start_date: '2024-05-15T09:00:00Z',
        }

        vi.mocked(eventsService.createEvent).mockResolvedValue({
          data: null,
          error: { message: 'Title is required' },
        })

        const result = await eventsService.createEvent(eventData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Title is required')
      })
    })

    describe('updateEvent', () => {
      test('successfully updates event details', async () => {
        const updateData = {
          title: 'Updated Championship Tournament',
          max_participants: 20,
          entry_fee: 7500, // Increased fee
        }

        const mockUpdatedEvent = {
          id: 'event-123',
          title: 'Updated Championship Tournament',
          max_participants: 20,
          entry_fee: 7500,
          updated_at: '2024-01-16T10:00:00Z',
        }

        vi.mocked(eventsService.updateEvent).mockResolvedValue({
          data: mockUpdatedEvent,
          error: null,
        })

        const result = await eventsService.updateEvent('event-123', updateData)

        expect(result.error).toBeNull()
        expect(result.data?.title).toBe('Updated Championship Tournament')
        expect(result.data?.max_participants).toBe(20)
      })

      test('prevents updates after registration deadline', async () => {
        const updateData = {
          entry_fee: 10000, // Price increase
        }

        vi.mocked(eventsService.updateEvent).mockResolvedValue({
          data: null,
          error: { message: 'Cannot modify event after registration deadline' },
        })

        const result = await eventsService.updateEvent('event-past-deadline', updateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot modify event after registration deadline')
      })

      test('prevents capacity reduction below current registrations', async () => {
        const updateData = {
          max_participants: 10, // Reduce from 16 to 10, but 12 already registered
        }

        vi.mocked(eventsService.updateEvent).mockResolvedValue({
          data: null,
          error: { message: 'Cannot reduce capacity below current registration count (12)' },
        })

        const result = await eventsService.updateEvent('event-123', updateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot reduce capacity below current registration count (12)')
      })

      test('allows updates for draft events', async () => {
        const updateData = {
          description: 'Updated description for draft event',
        }

        const mockUpdatedEvent = {
          id: 'event-draft',
          status: 'draft',
          description: 'Updated description for draft event',
        }

        vi.mocked(eventsService.updateEvent).mockResolvedValue({
          data: mockUpdatedEvent,
          error: null,
        })

        const result = await eventsService.updateEvent('event-draft', updateData)

        expect(result.data?.status).toBe('draft')
        expect(result.data?.description).toBe('Updated description for draft event')
      })
    })

    describe('publishEvent', () => {
      test('successfully publishes a draft event', async () => {
        const mockPublishedEvent = {
          id: 'event-123',
          status: 'published',
          published_at: '2024-01-16T10:00:00Z',
          is_public: true,
        }

        vi.mocked(eventsService.publishEvent).mockResolvedValue({
          data: mockPublishedEvent,
          error: null,
        })

        const result = await eventsService.publishEvent('event-123')

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('published')
        expect(result.data?.published_at).toBeDefined()
      })

      test('validates event completeness before publishing', async () => {
        vi.mocked(eventsService.publishEvent).mockResolvedValue({
          data: null,
          error: { message: 'Event must have a location before publishing' },
        })

        const result = await eventsService.publishEvent('event-incomplete')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Event must have a location before publishing')
      })

      test('prevents publishing cancelled events', async () => {
        vi.mocked(eventsService.publishEvent).mockResolvedValue({
          data: null,
          error: { message: 'Cannot publish a cancelled event' },
        })

        const result = await eventsService.publishEvent('event-cancelled')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot publish a cancelled event')
      })
    })

    describe('cancelEvent', () => {
      test('successfully cancels an event with refunds', async () => {
        const cancellationData = {
          reason: 'Weather conditions',
          process_refunds: true,
          notify_participants: true,
        }

        const mockCancelledEvent = {
          id: 'event-123',
          status: 'cancelled',
          cancellation_reason: 'Weather conditions',
          cancelled_at: '2024-01-16T10:00:00Z',
          refunds_processed: true,
        }

        vi.mocked(eventsService.cancelEvent).mockResolvedValue({
          data: mockCancelledEvent,
          error: null,
        })

        const result = await eventsService.cancelEvent('event-123', cancellationData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('cancelled')
        expect(result.data?.refunds_processed).toBe(true)
      })

      test('handles cancellation without refunds', async () => {
        const cancellationData = {
          reason: 'Venue unavailable',
          process_refunds: false,
        }

        const mockCancelledEvent = {
          id: 'event-123',
          status: 'cancelled',
          cancellation_reason: 'Venue unavailable',
          refunds_processed: false,
        }

        vi.mocked(eventsService.cancelEvent).mockResolvedValue({
          data: mockCancelledEvent,
          error: null,
        })

        const result = await eventsService.cancelEvent('event-123', cancellationData)

        expect(result.data?.refunds_processed).toBe(false)
      })

      test('prevents cancellation of completed events', async () => {
        const cancellationData = {
          reason: 'Too late',
        }

        vi.mocked(eventsService.cancelEvent).mockResolvedValue({
          data: null,
          error: { message: 'Cannot cancel a completed event' },
        })

        const result = await eventsService.cancelEvent('event-completed', cancellationData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot cancel a completed event')
      })
    })

    describe('checkConflicts', () => {
      test('detects scheduling conflicts', async () => {
        const eventData = {
          start_date: '2024-05-15T10:00:00Z',
          end_date: '2024-05-15T12:00:00Z',
          location: 'Field A',
          organization_id: 'org-1',
        }

        const mockConflicts = [
          {
            id: 'event-conflict',
            title: 'Conflicting Practice',
            start_date: '2024-05-15T11:00:00Z',
            end_date: '2024-05-15T13:00:00Z',
            location: 'Field A',
          },
        ]

        vi.mocked(eventsService.checkConflicts).mockResolvedValue({
          data: mockConflicts,
          error: null,
        })

        const result = await eventsService.checkConflicts(eventData)

        expect(result.error).toBeNull()
        expect(result.data).toHaveLength(1)
        expect(result.data?.[0].location).toBe('Field A')
      })

      test('returns no conflicts for valid schedule', async () => {
        const eventData = {
          start_date: '2024-05-15T14:00:00Z',
          end_date: '2024-05-15T16:00:00Z',
          location: 'Field B',
        }

        vi.mocked(eventsService.checkConflicts).mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await eventsService.checkConflicts(eventData)

        expect(result.data).toHaveLength(0)
      })

      test('checks conflicts across multiple locations', async () => {
        const eventData = {
          start_date: '2024-05-15T10:00:00Z',
          end_date: '2024-05-15T12:00:00Z',
          organization_id: 'org-1',
        }

        const mockConflicts = [
          {
            id: 'event-1',
            title: 'Team Practice',
            location: 'Field A',
          },
          {
            id: 'event-2',
            title: 'Tournament',
            location: 'Gym B',
          },
        ]

        vi.mocked(eventsService.checkConflicts).mockResolvedValue({
          data: mockConflicts,
          error: null,
        })

        const result = await eventsService.checkConflicts(eventData)

        expect(result.data).toHaveLength(2)
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
          emergency_contact: {
            name: 'John Doe',
            phone: '555-0123',
            relationship: 'Parent',
          },
          medical_info: {
            allergies: 'None',
            medications: 'None',
          },
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

      test('handles waitlist when event is full', async () => {
        const registrationData = {
          event_id: 'event-full',
          user_id: 'user-2',
        }

        const mockWaitlistRegistration = {
          id: 'reg-waitlist',
          status: 'waitlisted',
          waitlist_position: 3,
          estimated_wait_time: '2 weeks',
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: mockWaitlistRegistration,
          error: null,
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.data?.status).toBe('waitlisted')
        expect(result.data?.waitlist_position).toBe(3)
      })

      test('validates registration deadline', async () => {
        const registrationData = {
          event_id: 'event-expired',
          user_id: 'user-1',
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: null,
          error: { message: 'Registration deadline has passed' },
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Registration deadline has passed')
      })

      test('prevents duplicate registration', async () => {
        const registrationData = {
          event_id: 'event-123',
          user_id: 'user-already-registered',
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: null,
          error: { message: 'User is already registered for this event' },
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('User is already registered for this event')
      })

      test('validates age group requirements', async () => {
        const registrationData = {
          event_id: 'event-u12',
          user_id: 'user-adult', // 25 years old
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: null,
          error: { message: 'Participant does not meet age group requirements (U12)' },
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Participant does not meet age group requirements (U12)')
      })

      test('requires approval for restricted events', async () => {
        const registrationData = {
          event_id: 'event-invite-only',
          user_id: 'user-1',
        }

        const mockPendingRegistration = {
          id: 'reg-pending',
          status: 'pending_approval',
          submitted_at: '2024-01-16T10:00:00Z',
        }

        vi.mocked(registrationService.registerForEvent).mockResolvedValue({
          data: mockPendingRegistration,
          error: null,
        })

        const result = await registrationService.registerForEvent(registrationData)

        expect(result.data?.status).toBe('pending_approval')
      })
    })

    describe('unregisterFromEvent', () => {
      test('successfully unregisters with refund', async () => {
        const unregisterData = {
          registration_id: 'reg-123',
          reason: 'Schedule conflict',
          request_refund: true,
        }

        const mockUnregistration = {
          id: 'reg-123',
          status: 'cancelled',
          cancelled_at: '2024-01-16T10:00:00Z',
          refund_status: 'pending',
          refund_amount: 5000,
        }

        vi.mocked(registrationService.unregisterFromEvent).mockResolvedValue({
          data: mockUnregistration,
          error: null,
        })

        const result = await registrationService.unregisterFromEvent(unregisterData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('cancelled')
        expect(result.data?.refund_status).toBe('pending')
      })

      test('unregisters without refund due to policy', async () => {
        const unregisterData = {
          registration_id: 'reg-123',
          reason: 'Too late for refund',
        }

        const mockUnregistration = {
          id: 'reg-123',
          status: 'cancelled',
          refund_status: 'ineligible',
          cancellation_reason: 'Outside refund window',
        }

        vi.mocked(registrationService.unregisterFromEvent).mockResolvedValue({
          data: mockUnregistration,
          error: null,
        })

        const result = await registrationService.unregisterFromEvent(unregisterData)

        expect(result.data?.refund_status).toBe('ineligible')
        expect(result.data?.cancellation_reason).toBe('Outside refund window')
      })

      test('prevents unregistration of completed events', async () => {
        const unregisterData = {
          registration_id: 'reg-completed',
        }

        vi.mocked(registrationService.unregisterFromEvent).mockResolvedValue({
          data: null,
          error: { message: 'Cannot unregister from a completed event' },
        })

        const result = await registrationService.unregisterFromEvent(unregisterData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot unregister from a completed event')
      })
    })

    describe('checkCapacity', () => {
      test('returns available spots', async () => {
        const mockCapacity = {
          event_id: 'event-123',
          max_participants: 16,
          current_registrations: 12,
          available_spots: 4,
          waitlist_count: 2,
          is_full: false,
        }

        vi.mocked(registrationService.checkCapacity).mockResolvedValue({
          data: mockCapacity,
          error: null,
        })

        const result = await registrationService.checkCapacity('event-123')

        expect(result.data?.available_spots).toBe(4)
        expect(result.data?.is_full).toBe(false)
      })

      test('indicates event is full', async () => {
        const mockCapacity = {
          event_id: 'event-full',
          max_participants: 20,
          current_registrations: 20,
          available_spots: 0,
          waitlist_count: 5,
          is_full: true,
        }

        vi.mocked(registrationService.checkCapacity).mockResolvedValue({
          data: mockCapacity,
          error: null,
        })

        const result = await registrationService.checkCapacity('event-full')

        expect(result.data?.is_full).toBe(true)
        expect(result.data?.available_spots).toBe(0)
      })
    })
  })

  describe('Game Management', () => {
    describe('createGame', () => {
      test('successfully creates a league game', async () => {
        const gameData = {
          event_id: 'event-league',
          home_team_id: 'team-a',
          away_team_id: 'team-b',
          scheduled_date: '2024-05-15T15:00:00Z',
          location: 'Field A',
          game_type: 'league',
          season: 'Spring 2024',
          round: 3,
        }

        const mockCreatedGame = {
          id: 'game-123',
          ...gameData,
          status: 'scheduled',
          created_at: '2024-01-15T10:00:00Z',
        }

        vi.mocked(gamesService.createGame).mockResolvedValue({
          data: mockCreatedGame,
          error: null,
        })

        const result = await gamesService.createGame(gameData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('scheduled')
        expect(result.data?.game_type).toBe('league')
      })

      test('creates tournament bracket game', async () => {
        const gameData = {
          event_id: 'event-tournament',
          home_team_id: 'team-winner1',
          away_team_id: 'team-winner2',
          scheduled_date: '2024-05-15T14:00:00Z',
          game_type: 'tournament',
          bracket_round: 'semifinals',
          bracket_position: 'A1',
        }

        const mockCreatedGame = {
          id: 'game-bracket',
          ...gameData,
          status: 'scheduled',
        }

        vi.mocked(gamesService.createGame).mockResolvedValue({
          data: mockCreatedGame,
          error: null,
        })

        const result = await gamesService.createGame(gameData)

        expect(result.data?.bracket_round).toBe('semifinals')
        expect(result.data?.bracket_position).toBe('A1')
      })

      test('validates team availability', async () => {
        const gameData = {
          home_team_id: 'team-conflict',
          away_team_id: 'team-b',
          scheduled_date: '2024-05-15T15:00:00Z',
        }

        vi.mocked(gamesService.createGame).mockResolvedValue({
          data: null,
          error: { message: 'Home team has a scheduling conflict' },
        })

        const result = await gamesService.createGame(gameData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Home team has a scheduling conflict')
      })
    })

    describe('recordScore', () => {
      test('successfully records game score', async () => {
        const scoreData = {
          game_id: 'game-123',
          home_score: 3,
          away_score: 1,
          overtime: false,
          penalties: false,
          recorded_by: 'referee-1',
          notes: 'Clean game with good sportsmanship',
        }

        const mockRecordedGame = {
          id: 'game-123',
          ...scoreData,
          status: 'completed',
          winner: 'home',
          score_confirmed: false,
          recorded_at: '2024-05-15T17:30:00Z',
        }

        vi.mocked(gamesService.recordScore).mockResolvedValue({
          data: mockRecordedGame,
          error: null,
        })

        const result = await gamesService.recordScore(scoreData)

        expect(result.error).toBeNull()
        expect(result.data?.home_score).toBe(3)
        expect(result.data?.away_score).toBe(1)
        expect(result.data?.winner).toBe('home')
      })

      test('handles tie game', async () => {
        const scoreData = {
          game_id: 'game-tie',
          home_score: 2,
          away_score: 2,
          overtime: true,
        }

        const mockTieGame = {
          id: 'game-tie',
          ...scoreData,
          status: 'completed',
          winner: null,
          is_tie: true,
        }

        vi.mocked(gamesService.recordScore).mockResolvedValue({
          data: mockTieGame,
          error: null,
        })

        const result = await gamesService.recordScore(scoreData)

        expect(result.data?.is_tie).toBe(true)
        expect(result.data?.winner).toBeNull()
      })

      test('records penalty shootout result', async () => {
        const scoreData = {
          game_id: 'game-penalties',
          home_score: 1,
          away_score: 1,
          overtime: true,
          penalties: true,
          penalty_home_score: 4,
          penalty_away_score: 3,
        }

        const mockPenaltyGame = {
          id: 'game-penalties',
          ...scoreData,
          winner: 'home',
          penalty_winner: 'home',
        }

        vi.mocked(gamesService.recordScore).mockResolvedValue({
          data: mockPenaltyGame,
          error: null,
        })

        const result = await gamesService.recordScore(scoreData)

        expect(result.data?.penalties).toBe(true)
        expect(result.data?.penalty_winner).toBe('home')
      })

      test('prevents score recording for unstarted games', async () => {
        const scoreData = {
          game_id: 'game-not-started',
          home_score: 2,
          away_score: 0,
        }

        vi.mocked(gamesService.recordScore).mockResolvedValue({
          data: null,
          error: { message: 'Cannot record score for a game that has not started' },
        })

        const result = await gamesService.recordScore(scoreData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Cannot record score for a game that has not started')
      })

      test('validates score ranges', async () => {
        const scoreData = {
          game_id: 'game-123',
          home_score: -1, // Invalid negative score
          away_score: 0,
        }

        vi.mocked(gamesService.recordScore).mockResolvedValue({
          data: null,
          error: { message: 'Scores cannot be negative' },
        })

        const result = await gamesService.recordScore(scoreData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Scores cannot be negative')
      })
    })

    describe('getGameStats', () => {
      test('retrieves comprehensive game statistics', async () => {
        const mockStats = {
          game_id: 'game-123',
          duration: 90, // minutes
          possession: {
            home: 55,
            away: 45,
          },
          shots: {
            home: 12,
            away: 8,
          },
          shots_on_target: {
            home: 6,
            away: 4,
          },
          corners: {
            home: 7,
            away: 3,
          },
          fouls: {
            home: 8,
            away: 12,
          },
          yellow_cards: {
            home: 1,
            away: 2,
          },
          red_cards: {
            home: 0,
            away: 0,
          },
          substitutions: {
            home: 3,
            away: 3,
          },
        }

        vi.mocked(gamesService.getGameStats).mockResolvedValue({
          data: mockStats,
          error: null,
        })

        const result = await gamesService.getGameStats('game-123')

        expect(result.error).toBeNull()
        expect(result.data?.possession.home).toBe(55)
        expect(result.data?.shots.home).toBe(12)
        expect(result.data?.yellow_cards.away).toBe(2)
      })

      test('returns minimal stats for games without detailed tracking', async () => {
        const mockBasicStats = {
          game_id: 'game-basic',
          duration: 60,
          final_score: {
            home: 3,
            away: 1,
          },
        }

        vi.mocked(gamesService.getGameStats).mockResolvedValue({
          data: mockBasicStats,
          error: null,
        })

        const result = await gamesService.getGameStats('game-basic')

        expect(result.data?.final_score.home).toBe(3)
        expect(result.data?.final_score.away).toBe(1)
      })
    })

    describe('scheduleGame', () => {
      test('successfully reschedules game', async () => {
        const scheduleData = {
          game_id: 'game-123',
          new_date: '2024-05-16T15:00:00Z',
          new_location: 'Field B',
          reason: 'Weather delay',
        }

        const mockRescheduledGame = {
          id: 'game-123',
          scheduled_date: '2024-05-16T15:00:00Z',
          location: 'Field B',
          reschedule_reason: 'Weather delay',
          rescheduled_at: '2024-01-16T10:00:00Z',
        }

        vi.mocked(gamesService.scheduleGame).mockResolvedValue({
          data: mockRescheduledGame,
          error: null,
        })

        const result = await gamesService.scheduleGame(scheduleData)

        expect(result.error).toBeNull()
        expect(result.data?.location).toBe('Field B')
        expect(result.data?.reschedule_reason).toBe('Weather delay')
      })

      test('validates reschedule timing', async () => {
        const scheduleData = {
          game_id: 'game-soon',
          new_date: '2024-01-16T15:00:00Z', // Too soon
        }

        vi.mocked(gamesService.scheduleGame).mockResolvedValue({
          data: null,
          error: { message: 'Games cannot be rescheduled within 24 hours of start time' },
        })

        const result = await gamesService.scheduleGame(scheduleData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Games cannot be rescheduled within 24 hours of start time')
      })
    })
  })

  describe('Event Queries and Filtering', () => {
    describe('getEvents', () => {
      test('retrieves events with filters', async () => {
        const filters = {
          organization_id: 'org-1',
          event_type: 'tournament',
          sport: 'soccer',
          status: 'published',
          start_date: '2024-05-01',
          end_date: '2024-05-31',
        }

        const mockEvents = [
          {
            id: 'event-1',
            title: 'Spring Tournament',
            event_type: 'tournament',
            sport: 'soccer',
            start_date: '2024-05-15T09:00:00Z',
            status: 'published',
          },
          {
            id: 'event-2',
            title: 'Championship',
            event_type: 'tournament',
            sport: 'soccer',
            start_date: '2024-05-20T09:00:00Z',
            status: 'published',
          },
        ]

        vi.mocked(eventsService.getEvents).mockResolvedValue({
          data: mockEvents,
          error: null,
        })

        const result = await eventsService.getEvents(filters)

        expect(result.error).toBeNull()
        expect(result.data).toHaveLength(2)
        expect(result.data?.every(e => e.event_type === 'tournament')).toBe(true)
      })

      test('paginates event results', async () => {
        const pagination = {
          limit: 10,
          offset: 20,
        }

        const mockPage = Array.from({ length: 10 }, (_, i) => ({
          id: `event-${i + 21}`,
          title: `Event ${i + 21}`,
        }))

        vi.mocked(eventsService.getEvents).mockResolvedValue({
          data: mockPage,
          error: null,
        })

        const result = await eventsService.getEvents({}, pagination)

        expect(result.data).toHaveLength(10)
        expect(result.data?.[0].id).toBe('event-21')
      })

      test('searches events by text', async () => {
        const searchQuery = 'championship'

        const mockSearchResults = [
          {
            id: 'event-champ',
            title: 'State Championship',
            description: 'Annual state championship tournament',
          },
        ]

        vi.mocked(eventsService.getEvents).mockResolvedValue({
          data: mockSearchResults,
          error: null,
        })

        const result = await eventsService.getEvents({ search: searchQuery })

        expect(result.data).toHaveLength(1)
        expect(result.data?.[0].title).toBe('State Championship')
      })
    })

    describe('getRegistrations', () => {
      test('retrieves event registrations with details', async () => {
        const mockRegistrations = [
          {
            id: 'reg-1',
            user_id: 'user-1',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            participant_type: 'player',
            status: 'confirmed',
            registered_at: '2024-01-15T10:00:00Z',
            payment_status: 'paid',
          },
          {
            id: 'reg-2',
            user_id: 'user-2',
            user_name: 'Jane Smith',
            user_email: 'jane@example.com',
            participant_type: 'spectator',
            status: 'confirmed',
            registered_at: '2024-01-16T14:30:00Z',
            payment_status: 'paid',
          },
        ]

        vi.mocked(registrationService.getRegistrations).mockResolvedValue({
          data: mockRegistrations,
          error: null,
        })

        const result = await registrationService.getRegistrations('event-123')

        expect(result.error).toBeNull()
        expect(result.data).toHaveLength(2)
        expect(result.data?.[0].payment_status).toBe('paid')
      })

      test('filters registrations by status', async () => {
        const mockPendingRegistrations = [
          {
            id: 'reg-pending',
            status: 'pending_approval',
            user_name: 'Bob Wilson',
          },
        ]

        vi.mocked(registrationService.getRegistrations).mockResolvedValue({
          data: mockPendingRegistrations,
          error: null,
        })

        const result = await registrationService.getRegistrations('event-123', {
          status: 'pending_approval',
        })

        expect(result.data?.every(r => r.status === 'pending_approval')).toBe(true)
      })
    })
  })

  describe('Security and Access Control', () => {
    test('validates event ownership for modifications', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      }

      vi.mocked(eventsService.updateEvent).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: event belongs to different organization' },
      })

      const result = await eventsService.updateEvent('event-other-org', updateData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Access denied: event belongs to different organization')
    })

    test('enforces registration permissions', async () => {
      const registrationData = {
        event_id: 'event-private',
        user_id: 'user-unauthorized',
      }

      vi.mocked(registrationService.registerForEvent).mockResolvedValue({
        data: null,
        error: { message: 'Registration not allowed: event is invite-only' },
      })

      const result = await registrationService.registerForEvent(registrationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Registration not allowed: event is invite-only')
    })

    test('validates game score reporting permissions', async () => {
      const scoreData = {
        game_id: 'game-123',
        home_score: 3,
        away_score: 1,
        recorded_by: 'unauthorized-user',
      }

      vi.mocked(gamesService.recordScore).mockResolvedValue({
        data: null,
        error: { message: 'Only referees or coaches can record game scores' },
      })

      const result = await gamesService.recordScore(scoreData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Only referees or coaches can record game scores')
    })

    test('prevents event deletion with active registrations', async () => {
      vi.mocked(eventsService.deleteEvent).mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete event with active registrations' },
      })

      const result = await eventsService.deleteEvent('event-with-registrations')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Cannot delete event with active registrations')
    })
  })

  describe('Error Handling and Resilience', () => {
    test('handles database connection failures', async () => {
      vi.mocked(eventsService.createEvent).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const result = await eventsService.createEvent({
        title: 'Test Event',
        start_date: '2024-05-15T09:00:00Z',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Database connection failed')
    })

    test('handles concurrent registration conflicts', async () => {
      const registrationData = {
        event_id: 'event-full',
        user_id: 'user-1',
      }

      vi.mocked(registrationService.registerForEvent).mockResolvedValue({
        data: null,
        error: { message: 'Registration failed: event became full during processing' },
      })

      const result = await registrationService.registerForEvent(registrationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Registration failed: event became full during processing')
    })

    test('handles invalid game data gracefully', async () => {
      const invalidGameData = {
        home_team_id: 'invalid-team-id',
        away_team_id: 'team-b',
      }

      vi.mocked(gamesService.createGame).mockResolvedValue({
        data: null,
        error: { message: 'Invalid team ID provided' },
      })

      const result = await gamesService.createGame(invalidGameData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid team ID provided')
    })

    test('handles scheduling conflicts during rescheduling', async () => {
      const scheduleData = {
        game_id: 'game-123',
        new_date: '2024-05-16T15:00:00Z',
      }

      vi.mocked(gamesService.scheduleGame).mockResolvedValue({
        data: null,
        error: { message: 'New schedule conflicts with existing games' },
      })

      const result = await gamesService.scheduleGame(scheduleData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('New schedule conflicts with existing games')
    })
  })
})