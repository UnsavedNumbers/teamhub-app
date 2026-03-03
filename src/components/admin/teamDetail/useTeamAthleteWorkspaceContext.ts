import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAthleteById } from '../../../data/services/familyService'
import { getAthleteSports } from '../../../data/services/athleteSportsService'
import { getAthleteGuardians, getAthleteInvites } from '../../../data/services/guardianService'
import { getAthleteTeamMemberships } from '../../../data/services/teamsService'
import { getFeeAssignmentsForTeam } from '../../../data/services/paymentsService'
import { supabase } from '../../../lib/supabase'
import type { TeamAthleteWorkspaceData, TeamDetailPermissions } from './types'

const EMPTY_ATTENDANCE = {
  totalRecordedEvents: 0,
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  attendanceRate: null,
  latestStatus: null,
} as const

interface PaymentAssignmentSummary {
  athlete_id: string
  amount_due_cents: number | null
  amount_paid_cents: number | null
  due_date: string | null
}

interface UseTeamAthleteWorkspaceContextArgs {
  athleteId: string | null
  teamId: string | null | undefined
  seasonId: string | null | undefined
  orgId: string | null | undefined
  permissions: TeamDetailPermissions
}

export function useTeamAthleteWorkspaceContext({
  athleteId,
  teamId,
  seasonId,
  orgId,
  permissions,
}: UseTeamAthleteWorkspaceContextArgs): TeamAthleteWorkspaceData {
  const { context, isReady } = useUserContext()
  const isMountedRef = useRef(true)
  const [state, setState] = useState<TeamAthleteWorkspaceData>({
    athlete: null,
    sports: [],
    guardians: [],
    pendingInvites: [],
    teamMemberships: [],
    attendanceSummary: EMPTY_ATTENDANCE,
    upcomingEvents: [],
    paymentSummary: null,
    loading: false,
    error: null,
    refresh: async () => {},
  })

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!athleteId || !teamId || !orgId || !isReady) {
      if (isMountedRef.current) {
        setState((previous) => ({
          ...previous,
          athlete: null,
          sports: [],
          guardians: [],
          pendingInvites: [],
          teamMemberships: [],
          attendanceSummary: EMPTY_ATTENDANCE,
          upcomingEvents: [],
          paymentSummary: null,
          loading: false,
          error: null,
        }))
      }
      return
    }

    setState((previous) => ({ ...previous, loading: true, error: null }))

    try {
      const athletePromise = getAthleteById(context, athleteId)
      const sportsPromise = getAthleteSports(athleteId, orgId)
      const teamsPromise = getAthleteTeamMemberships(context, athleteId)
      const guardiansPromise = permissions.canViewGuardians ? getAthleteGuardians(athleteId, orgId) : Promise.resolve({ data: [], error: null })
      const invitesPromise = permissions.canViewGuardians ? getAthleteInvites(athleteId, orgId) : Promise.resolve({ data: [], error: null })
      const paymentsPromise = permissions.canViewPayments
        ? getFeeAssignmentsForTeam(context, teamId, seasonId ?? null)
        : Promise.resolve({ data: [], error: null })
      const nowIso = new Date().toISOString()
      const attendanceWindowStartIso = new Date(Date.now() - (1000 * 60 * 60 * 24 * 120)).toISOString()
      const upcomingEventsPromise = supabase
        .from('events')
        .select(`
          id,
          title,
          type,
          start_time,
          event_location:event_locations(venue_name)
        `)
        .eq('team_id', teamId)
        .eq('is_cancelled', false)
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(6)
      const attendanceEventsPromise = supabase
        .from('events')
        .select('id, start_time')
        .eq('team_id', teamId)
        .eq('is_cancelled', false)
        .gte('start_time', attendanceWindowStartIso)
        .lte('start_time', nowIso)
        .order('start_time', { ascending: false })
        .limit(12)

      const [
        athleteResult,
        sportsResult,
        teamsResult,
        guardiansResult,
        invitesResult,
        paymentsResult,
        upcomingEventsResult,
        attendanceEventsResult,
      ] = await Promise.all([
        athletePromise,
        sportsPromise,
        teamsPromise,
        guardiansPromise,
        invitesPromise,
        paymentsPromise,
        upcomingEventsPromise,
        attendanceEventsPromise,
      ])

      const events = (upcomingEventsResult.data ?? []) as Array<{
        id: string
        title: string | null
        type: string | null
        start_time: string
        event_location: { venue_name?: string | null } | null
      }>
      if (upcomingEventsResult.error) {
        throw upcomingEventsResult.error
      }
      if (attendanceEventsResult.error) {
        throw attendanceEventsResult.error
      }

      const attendanceEventIds = ((attendanceEventsResult.data ?? []) as Array<{ id: string }>).map((event) => event.id)
      const eventIds = Array.from(new Set([...events.map((event) => event.id), ...attendanceEventIds]))
      const attendanceResult = eventIds.length > 0
        ? await supabase
            .from('event_attendance')
            .select('event_id, status, created_at')
            .eq('child_id', athleteId)
            .in('event_id', eventIds)
        : { data: [], error: null }

      if (attendanceResult.error) {
        throw attendanceResult.error
      }

      const attendanceRows = (attendanceResult.data ?? []) as Array<{
        event_id: string
        status: 'present' | 'absent' | 'late' | 'excused'
        created_at: string | null
      }>
      const attendanceByEvent = new Map(attendanceRows.map((row) => [row.event_id, row.status]))

      const presentCount = attendanceRows.filter((row) => row.status === 'present').length
      const absentCount = attendanceRows.filter((row) => row.status === 'absent').length
      const lateCount = attendanceRows.filter((row) => row.status === 'late').length
      const excusedCount = attendanceRows.filter((row) => row.status === 'excused').length
      const totalRecordedEvents = attendanceRows.length
      const attendanceRate = totalRecordedEvents > 0
        ? Math.round((((presentCount + lateCount + excusedCount) / totalRecordedEvents) * 100) * 10) / 10
        : null
      const latestStatus = attendanceRows[0]?.status ?? null

      const paymentAssignments = (paymentsResult.data ?? []) as PaymentAssignmentSummary[]
      const athletePayments = paymentAssignments.filter((assignment) => assignment.athlete_id === athleteId)
      const outstandingBalanceCents = athletePayments.reduce((sum: number, assignment) => {
        const amountDue = assignment.amount_due_cents ?? 0
        const amountPaid = assignment.amount_paid_cents ?? 0
        return sum + Math.max(0, amountDue - amountPaid)
      }, 0)
      const paidCount = athletePayments.filter((assignment) => (assignment.amount_due_cents ?? 0) <= (assignment.amount_paid_cents ?? 0)).length
      const overdueCount = athletePayments.filter((assignment) => {
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
        return Boolean(dueDate && dueDate < new Date() && (assignment.amount_due_cents ?? 0) > (assignment.amount_paid_cents ?? 0))
      }).length

      if (!isMountedRef.current) return

      setState((previous) => ({
        ...previous,
        athlete: athleteResult.data,
        sports: sportsResult.data ?? [],
        guardians: guardiansResult.data ?? [],
        pendingInvites: invitesResult.data ?? [],
        teamMemberships: teamsResult.data ?? [],
        attendanceSummary: {
          totalRecordedEvents,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate,
          latestStatus,
        },
        upcomingEvents: events.map((event) => ({
          id: event.id,
          title: event.title || 'Untitled event',
          type: event.type,
          startTime: event.start_time,
          locationName: event.event_location?.venue_name ?? null,
          attendanceStatus: attendanceByEvent.get(event.id) ?? null,
        })),
        paymentSummary: permissions.canViewPayments
          ? {
              assignmentCount: athletePayments.length,
              paidCount,
              overdueCount,
              outstandingBalanceCents,
            }
          : null,
        loading: false,
        error:
          athleteResult.error?.message ??
          sportsResult.error?.message ??
          teamsResult.error?.message ??
          guardiansResult.error?.message ??
          invitesResult.error?.message ??
          paymentsResult.error?.message ??
          null,
      }))
    } catch (err) {
      if (isMountedRef.current) {
        setState((previous) => ({
          ...previous,
          athlete: null,
          sports: [],
          guardians: [],
          pendingInvites: [],
          teamMemberships: [],
          attendanceSummary: EMPTY_ATTENDANCE,
          upcomingEvents: [],
          paymentSummary: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load athlete workspace',
        }))
      }
    }
  }, [athleteId, context, isReady, orgId, permissions.canViewGuardians, permissions.canViewPayments, seasonId, teamId])

  useEffect(() => {
    void load()
  }, [load])

  return {
    ...state,
    refresh: load,
  }
}

