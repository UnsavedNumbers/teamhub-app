// Typed Route Parameter Hooks
// Provides type-safe parameter extraction for consistent :id usage across routes

import { useParams } from 'react-router-dom'

/**
 * Extract team ID from route parameters
 * Route: /admin/teams/:id
 */
export function useTeamParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Team ID is required in route parameters')
  }
  return { teamId: id }
}

/**
 * Extract fee ID from route parameters
 * Route: /admin/payments/fees/:id
 */
export function useFeeParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Fee ID is required in route parameters')
  }
  return { feeId: id }
}

/**
 * Extract fee assignment ID from route parameters
 * Route: /admin/payments/assignments/:id
 */
export function useFeeAssignmentParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Fee Assignment ID is required in route parameters')
  }
  return { assignmentId: id }
}

/**
 * Extract event ID from route parameters
 * Route: /admin/events/:id
 */
export function useEventParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Event ID is required in route parameters')
  }
  return { eventId: id }
}

/**
 * Extract family/guardian ID from route parameters
 * Route: /admin/guardians/:id (or /admin/families/:id for backward compatibility)
 */
export function useFamilyParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Family/Guardian ID is required in route parameters')
  }
  return { familyId: id }
}

/**
 * Extract guardian ID from route parameters (alias for useFamilyParams)
 * Route: /admin/guardians/:id
 */
export function useGuardianParams() {
  return useFamilyParams()
}

/**
 * Extract athlete ID from route parameters
 * Route: /admin/athletes/:id (if needed)
 */
export function useAthleteParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Athlete ID is required in route parameters')
  }
  return { athleteId: id }
}

/**
 * Extract travel plan ID from route parameters
 * Route: /admin/travel/:id
 */
export function useTravelPlanParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Travel Plan ID is required in route parameters')
  }
  return { travelPlanId: id }
}

/**
 * Extract tryout ID from route parameters
 * Route: /admin/tryouts/:id
 */
export function useTryoutParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Tryout ID is required in route parameters')
  }
  return { tryoutId: id }
}

/**
 * Extract uniform order ID from route parameters
 * Route: /admin/uniforms/:id
 */
export function useUniformOrderParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Uniform Order ID is required in route parameters')
  }
  return { uniformOrderId: id }
}

/**
 * Extract sport ID from route parameters
 * Route: /admin/sports/:id
 */
export function useSportParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Sport ID is required in route parameters')
  }
  return { sportId: id }
}

/**
 * Extract message ID from route parameters
 * Route: /admin/messages/:id
 */
export function useMessageParams() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    throw new Error('Message ID is required in route parameters')
  }
  return { messageId: id }
}
