import { supabase } from '@/lib/supabase'
import { USE_FAKE_DATA, DEMO_ORG_A_ID } from '@/data/config'
import { isInDemoSession } from '@/utils/demoMode'
import { getTeamsForOrg, getSeasonsForOrg, getTeamById, getTeamIdsForCoach, getChildTeamMemberships } from '@/data/fake/fakeTeams'
import { getAllEvents, getUpcomingEvents, getRSVPsForEvent } from '@/data/fake/fakeEvents'
import { getTotalOutstandingForOrg } from '@/data/fake/fakePayments'
import { fakeAthleteSportProfiles } from '@/data/fake/fakeAthleteSportProfiles'
import { getFakeTicketOrdersWithRelations } from '@/data/fake/ticketingFakeService'
import { getFacilitiesForOrg, getReservationsForOrg, getResourcesForOrg } from '@/data/fake/fakeFacilities'

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

export interface DateRangeInput {
  start?: string | Date | null
  end?: string | Date | null
}

export interface OrgDashboardKpisDto {
  orgId: string
  totalTeams: number
  totalAthletes: number
  activeSeasons: number
  outstandingBalanceCents: number
  upcomingEvents: number
  pendingUniformOrders: number
}

export interface CoachTeamKpisDto {
  orgId: string
  coachUserId: string
  teamCount: number
  athleteCount: number
  upcomingEvents: number
  attendanceRate: number
  avgProfileCompleteness: number
}

export interface PositionDistributionDto {
  position: string
  count: number
}

export interface CoachSportProfileInsightsDto {
  orgId: string
  coachUserId: string
  sportKey: string
  totalProfiles: number
  avgCompleteness: number
  leftHandedCount: number
  rightHandedCount: number
  unknownHandedCount: number
  positionDistribution: PositionDistributionDto[]
}

export interface AttendanceByTeamDto {
  teamId: string
  teamName: string
  totalResponses: number
  goingCount: number
  lateCount: number
  notGoingCount: number
}

export interface AttendanceSummaryDto {
  orgId: string
  dateStart: string
  dateEnd: string
  totalResponses: number
  goingCount: number
  lateCount: number
  notGoingCount: number
  responseRate: number
  byTeam: AttendanceByTeamDto[]
}

export interface TicketingRevenueByEventDto {
  ticketed_event_id: string
  event_title: string
  gross_cents: number
  platform_fee_cents: number
  org_revenue_cents: number
  order_count: number
  ticket_count: number
}

export interface TicketingMonthlyRevenueDto {
  month: string
  gross_cents: number
  platform_fee_cents: number
  org_revenue_cents: number
  order_count: number
  ticket_count: number
}

export interface TicketingSummaryDto {
  orgId: string
  dateStart: string
  dateEnd: string
  ordersCount: number
  paidOrdersCount: number
  refundedOrdersCount: number
  grossCents: number
  feesCents: number
  platformFeeCents: number
  orgRevenueCents: number
  ticketCount: number
  byEvent: TicketingRevenueByEventDto[]
  byMonth: TicketingMonthlyRevenueDto[]
}

export interface ResourceUtilizationDto {
  resourceId: string
  facilityId: string
  resourceName: string
  reservationCount: number
  reservedHours: number
  utilizationPct: number
}

export interface FacilityUtilizationDto {
  facilityId: string
  facilityName: string
  resourceCount: number
  reservationCount: number
  reservedHours: number
  utilizationPct: number
}

export interface FacilitiesUtilizationSummaryDto {
  orgId: string
  dateStart: string
  dateEnd: string
  totalResources: number
  reservedResources: number
  totalReservationHours: number
  avgUtilizationPct: number
  byResource: ResourceUtilizationDto[]
  byFacility: FacilityUtilizationDto[]
}

export interface Provider {
  getOrgDashboardKpis(orgId: string): Promise<ServiceResponse<OrgDashboardKpisDto>>
  getCoachTeamKpis(orgId: string, coachUserId: string): Promise<ServiceResponse<CoachTeamKpisDto>>
  getCoachSportProfileInsights(
    orgId: string,
    coachUserId: string,
    sportKey: string,
    filters?: Record<string, unknown>,
  ): Promise<ServiceResponse<CoachSportProfileInsightsDto>>
  getAttendanceSummary(
    orgId: string,
    teamIds?: string[],
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<AttendanceSummaryDto>>
  getTicketingSummary(orgId: string, dateRange?: DateRangeInput): Promise<ServiceResponse<TicketingSummaryDto>>
  getFacilitiesUtilization(
    orgId: string,
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<FacilitiesUtilizationSummaryDto>>
}

function toError(value: unknown, fallback: string): Error {
  if (value instanceof Error) return value
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = String((value as { message?: unknown }).message ?? fallback)
    return new Error(message)
  }
  return new Error(fallback)
}

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function rangeWithDefaults(range?: DateRangeInput, defaultDays = 30): { start: string; end: string } {
  const now = new Date()
  const end = toIso(range?.end) ?? now.toISOString()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - defaultDays)
  const start = toIso(range?.start) ?? defaultStart.toISOString()
  return { start, end }
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function normalizeTicketingByEvent(value: unknown): TicketingRevenueByEventDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    ticketed_event_id: String(row?.ticketed_event_id ?? ''),
    event_title: String(row?.event_title ?? 'Untitled Event'),
    gross_cents: toNumber(row?.gross_cents),
    platform_fee_cents: toNumber(row?.platform_fee_cents),
    org_revenue_cents: toNumber(row?.org_revenue_cents),
    order_count: toNumber(row?.order_count),
    ticket_count: toNumber(row?.ticket_count),
  }))
}

function normalizeTicketingByMonth(value: unknown): TicketingMonthlyRevenueDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    month: String(row?.month ?? ''),
    gross_cents: toNumber(row?.gross_cents),
    platform_fee_cents: toNumber(row?.platform_fee_cents),
    org_revenue_cents: toNumber(row?.org_revenue_cents),
    order_count: toNumber(row?.order_count),
    ticket_count: toNumber(row?.ticket_count),
  }))
}

function normalizeAttendanceByTeam(value: unknown): AttendanceByTeamDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    teamId: String(row?.team_id ?? ''),
    teamName: String(row?.team_name ?? 'Team'),
    totalResponses: toNumber(row?.total_responses),
    goingCount: toNumber(row?.going_count),
    lateCount: toNumber(row?.late_count),
    notGoingCount: toNumber(row?.not_going_count),
  }))
}

function normalizePositionDistribution(value: unknown): PositionDistributionDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    position: String(row?.position ?? 'Unspecified'),
    count: toNumber(row?.count),
  }))
}

function normalizeResourceUtilization(value: unknown): ResourceUtilizationDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    resourceId: String(row?.resource_id ?? ''),
    facilityId: String(row?.facility_id ?? ''),
    resourceName: String(row?.resource_name ?? 'Resource'),
    reservationCount: toNumber(row?.reservation_count),
    reservedHours: toNumber(row?.reserved_hours),
    utilizationPct: toNumber(row?.utilization_pct),
  }))
}

function normalizeFacilityUtilization(value: unknown): FacilityUtilizationDto[] {
  if (!Array.isArray(value)) return []
  return value.map((row: any) => ({
    facilityId: String(row?.facility_id ?? ''),
    facilityName: String(row?.facility_name ?? 'Facility'),
    resourceCount: toNumber(row?.resource_count),
    reservationCount: toNumber(row?.reservation_count),
    reservedHours: toNumber(row?.reserved_hours),
    utilizationPct: toNumber(row?.utilization_pct),
  }))
}

class RealSupabaseProvider implements Provider {
  async getOrgDashboardKpis(orgId: string): Promise<ServiceResponse<OrgDashboardKpisDto>> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_org_dashboard_kpis', { org_id: orgId })
      if (error) return { data: null, error: toError(error, 'Failed to fetch org dashboard KPIs') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          totalTeams: toNumber(payload.total_teams),
          totalAthletes: toNumber(payload.total_athletes),
          activeSeasons: toNumber(payload.active_seasons),
          outstandingBalanceCents: toNumber(payload.outstanding_balance_cents),
          upcomingEvents: toNumber(payload.upcoming_events),
          pendingUniformOrders: toNumber(payload.pending_uniform_orders),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch org dashboard KPIs') }
    }
  }

  async getCoachTeamKpis(orgId: string, coachUserId: string): Promise<ServiceResponse<CoachTeamKpisDto>> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_coach_team_kpis', {
        org_id: orgId,
        coach_user_id: coachUserId,
      })
      if (error) return { data: null, error: toError(error, 'Failed to fetch coach KPIs') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          coachUserId,
          teamCount: toNumber(payload.team_count),
          athleteCount: toNumber(payload.athlete_count),
          upcomingEvents: toNumber(payload.upcoming_events),
          attendanceRate: toNumber(payload.attendance_rate),
          avgProfileCompleteness: toNumber(payload.avg_profile_completeness),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch coach KPIs') }
    }
  }

  async getCoachSportProfileInsights(
    orgId: string,
    coachUserId: string,
    sportKey: string,
    filters: Record<string, unknown> = {},
  ): Promise<ServiceResponse<CoachSportProfileInsightsDto>> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_coach_sport_profile_insights', {
        org_id: orgId,
        coach_user_id: coachUserId,
        sport_key: sportKey,
        filters,
      })
      if (error) return { data: null, error: toError(error, 'Failed to fetch sport profile insights') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          coachUserId,
          sportKey,
          totalProfiles: toNumber(payload.total_profiles),
          avgCompleteness: toNumber(payload.avg_completeness),
          leftHandedCount: toNumber(payload.left_handed_count),
          rightHandedCount: toNumber(payload.right_handed_count),
          unknownHandedCount: toNumber(payload.unknown_handed_count),
          positionDistribution: normalizePositionDistribution(payload.position_distribution),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch sport profile insights') }
    }
  }

  async getAttendanceSummary(
    orgId: string,
    teamIds: string[] = [],
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<AttendanceSummaryDto>> {
    try {
      const range = rangeWithDefaults(dateRange, 30)
      const { data, error } = await (supabase.rpc as any)('get_attendance_summary', {
        org_id: orgId,
        team_ids: teamIds.length ? teamIds : null,
        date_range: { start: range.start, end: range.end },
      })
      if (error) return { data: null, error: toError(error, 'Failed to fetch attendance summary') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          dateStart: String(payload.date_start ?? range.start),
          dateEnd: String(payload.date_end ?? range.end),
          totalResponses: toNumber(payload.total_responses),
          goingCount: toNumber(payload.going_count),
          lateCount: toNumber(payload.late_count),
          notGoingCount: toNumber(payload.not_going_count),
          responseRate: toNumber(payload.response_rate),
          byTeam: normalizeAttendanceByTeam(payload.by_team),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch attendance summary') }
    }
  }

  async getTicketingSummary(orgId: string, dateRange?: DateRangeInput): Promise<ServiceResponse<TicketingSummaryDto>> {
    try {
      const range = rangeWithDefaults(dateRange, 180)
      const { data, error } = await (supabase.rpc as any)('get_ticketing_summary', {
        org_id: orgId,
        date_range: { start: range.start, end: range.end },
      })
      if (error) return { data: null, error: toError(error, 'Failed to fetch ticketing summary') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          dateStart: String(payload.date_start ?? range.start),
          dateEnd: String(payload.date_end ?? range.end),
          ordersCount: toNumber(payload.orders_count),
          paidOrdersCount: toNumber(payload.paid_orders_count),
          refundedOrdersCount: toNumber(payload.refunded_orders_count),
          grossCents: toNumber(payload.gross_cents),
          feesCents: toNumber(payload.fees_cents),
          platformFeeCents: toNumber(payload.platform_fee_cents),
          orgRevenueCents: toNumber(payload.org_revenue_cents),
          ticketCount: toNumber(payload.ticket_count),
          byEvent: normalizeTicketingByEvent(payload.by_event),
          byMonth: normalizeTicketingByMonth(payload.by_month),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch ticketing summary') }
    }
  }

  async getFacilitiesUtilization(
    orgId: string,
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<FacilitiesUtilizationSummaryDto>> {
    try {
      const range = rangeWithDefaults(dateRange, 30)
      const { data, error } = await (supabase.rpc as any)('get_facilities_utilization', {
        org_id: orgId,
        date_range: { start: range.start, end: range.end },
      })
      if (error) return { data: null, error: toError(error, 'Failed to fetch facilities utilization') }
      const payload = (data ?? {}) as Record<string, unknown>
      return {
        data: {
          orgId,
          dateStart: String(payload.date_start ?? range.start),
          dateEnd: String(payload.date_end ?? range.end),
          totalResources: toNumber(payload.total_resources),
          reservedResources: toNumber(payload.reserved_resources),
          totalReservationHours: toNumber(payload.total_reservation_hours),
          avgUtilizationPct: toNumber(payload.avg_utilization_pct),
          byResource: normalizeResourceUtilization(payload.by_resource),
          byFacility: normalizeFacilityUtilization(payload.by_facility),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err, 'Failed to fetch facilities utilization') }
    }
  }
}

function inDateRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

class DemoProvider implements Provider {
  async getOrgDashboardKpis(orgId: string): Promise<ServiceResponse<OrgDashboardKpisDto>> {
    const requestedOrgId = orgId || DEMO_ORG_A_ID
    const requestedOrgTeams = getTeamsForOrg(requestedOrgId)
    const requestedOrgSeasons = getSeasonsForOrg(requestedOrgId)

    // Demo sessions can carry non-seeded org ids; in that case use canonical seeded org data.
    const effectiveOrgId =
      requestedOrgTeams.length > 0 || requestedOrgSeasons.length > 0
        ? requestedOrgId
        : DEMO_ORG_A_ID

    const teams = getTeamsForOrg(effectiveOrgId)
    const teamMemberships = getChildTeamMemberships().filter((membership) =>
      teams.some((team) => team.id === membership.teamId),
    )
    const uniqueAthleteCount = new Set(teamMemberships.map((membership) => membership.childId)).size
    const activeSeasonCount = getSeasonsForOrg(effectiveOrgId).filter((season) => season.is_active).length
    const upcomingCount = getUpcomingEvents(100).filter(
      (event) => !event.is_cancelled && new Date(event.start_time) > new Date(),
    ).length

    return {
      data: {
        orgId: effectiveOrgId,
        totalTeams: teams.length,
        totalAthletes: uniqueAthleteCount,
        activeSeasons: activeSeasonCount,
        outstandingBalanceCents: getTotalOutstandingForOrg(effectiveOrgId),
        upcomingEvents: upcomingCount,
        pendingUniformOrders: 0,
      },
      error: null,
    }
  }

  async getCoachTeamKpis(orgId: string, coachUserId: string): Promise<ServiceResponse<CoachTeamKpisDto>> {
    const effectiveOrgId = orgId || DEMO_ORG_A_ID
    const teamIds = getTeamIdsForCoach(coachUserId)
    const memberships = getChildTeamMemberships().filter((membership) => teamIds.includes(membership.teamId))
    const uniqueAthletes = new Set(memberships.map((membership) => membership.childId))
    const upcomingEvents = getUpcomingEvents(200).filter((event) => (event.team_id ? teamIds.includes(event.team_id) : false)).length

    const rsvpSummary = getUpcomingEvents(30)
      .filter((event) => (event.team_id ? teamIds.includes(event.team_id) : false))
      .flatMap((event) => getRSVPsForEvent(event.id))
    const totalResponses = rsvpSummary.length
    const positiveResponses = rsvpSummary.filter((rsvp) => rsvp.status === 'going' || rsvp.status === 'late').length
    const attendanceRate = totalResponses > 0 ? Number(((positiveResponses / totalResponses) * 100).toFixed(2)) : 0

    const profileAthletes = new Set(memberships.map((membership) => membership.childId))
    const profileRows = fakeAthleteSportProfiles.filter((profile) => profileAthletes.has(profile.athlete_id))
    const avgProfileCompleteness =
      profileRows.length > 0
        ? Number((profileRows.reduce((sum, row) => sum + Number(row.completeness_score || 0), 0) / profileRows.length).toFixed(2))
        : 0

    return {
      data: {
        orgId: effectiveOrgId,
        coachUserId,
        teamCount: teamIds.length,
        athleteCount: uniqueAthletes.size,
        upcomingEvents,
        attendanceRate,
        avgProfileCompleteness,
      },
      error: null,
    }
  }

  async getCoachSportProfileInsights(
    orgId: string,
    coachUserId: string,
    sportKey: string,
  ): Promise<ServiceResponse<CoachSportProfileInsightsDto>> {
    const effectiveOrgId = orgId || DEMO_ORG_A_ID
    const teamIds = getTeamIdsForCoach(coachUserId)
    const memberships = getChildTeamMemberships().filter((membership) => teamIds.includes(membership.teamId))
    const athleteScope = new Set(memberships.map((membership) => membership.childId))
    const profiles = fakeAthleteSportProfiles.filter(
      (profile) =>
        profile.org_id === effectiveOrgId &&
        athleteScope.has(profile.athlete_id) &&
        (!sportKey || profile.sport_code.toLowerCase() === sportKey.toLowerCase()),
    )

    const handLabel = (profile: any): string => {
      const source =
        profile?.profile_data?.shooting_hand ??
        profile?.profile_data?.throwing_hand ??
        profile?.profile_data?.preferred_foot ??
        profile?.profile_data?.playing_hand ??
        'unknown'
      return String(source).trim().toLowerCase()
    }

    const toHandBucket = (value: string): 'left' | 'right' | 'unknown' => {
      if (['left', 'left-handed', 'left handed', 'l'].includes(value)) return 'left'
      if (['right', 'right-handed', 'right handed', 'r'].includes(value)) return 'right'
      return 'unknown'
    }

    const positionMap = new Map<string, number>()
    let left = 0
    let right = 0
    let unknown = 0
    let completenessTotal = 0
    for (const profile of profiles) {
      const hand = toHandBucket(handLabel(profile))
      if (hand === 'left') left += 1
      else if (hand === 'right') right += 1
      else unknown += 1

      const position = String((profile as any)?.profile_data?.position ?? 'Unspecified')
      positionMap.set(position, (positionMap.get(position) ?? 0) + 1)
      completenessTotal += Number(profile.completeness_score || 0)
    }

    const positionDistribution = Array.from(positionMap.entries())
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position))

    return {
      data: {
        orgId: effectiveOrgId,
        coachUserId,
        sportKey,
        totalProfiles: profiles.length,
        avgCompleteness: profiles.length > 0 ? Number((completenessTotal / profiles.length).toFixed(2)) : 0,
        leftHandedCount: left,
        rightHandedCount: right,
        unknownHandedCount: unknown,
        positionDistribution,
      },
      error: null,
    }
  }

  async getAttendanceSummary(
    orgId: string,
    teamIds: string[] = [],
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<AttendanceSummaryDto>> {
    const effectiveOrgId = orgId || DEMO_ORG_A_ID
    const range = rangeWithDefaults(dateRange, 30)
    const start = new Date(range.start)
    const end = new Date(range.end)

    const scopedEvents = getAllEvents()
      .filter((event) => event.team?.org_id === effectiveOrgId || !event.team?.org_id)
      .filter((event) => (teamIds.length ? (event.team_id ? teamIds.includes(event.team_id) : false) : true))
      .filter((event) => inDateRange(event.start_time, start, end))

    const byTeamMap = new Map<string, AttendanceByTeamDto>()
    let goingCount = 0
    let lateCount = 0
    let notGoingCount = 0

    for (const event of scopedEvents) {
      if (!event.team_id) continue
      const team = getTeamById(event.team_id)
      const teamId = event.team_id
      const teamName = team?.name ?? event.team?.name ?? 'Team'
      const row =
        byTeamMap.get(teamId) ??
        {
          teamId,
          teamName,
          totalResponses: 0,
          goingCount: 0,
          lateCount: 0,
          notGoingCount: 0,
        }

      for (const rsvp of getRSVPsForEvent(event.id)) {
        row.totalResponses += 1
        if (rsvp.status === 'going') {
          row.goingCount += 1
          goingCount += 1
        } else if (rsvp.status === 'late') {
          row.lateCount += 1
          lateCount += 1
        } else {
          row.notGoingCount += 1
          notGoingCount += 1
        }
      }

      byTeamMap.set(teamId, row)
    }

    const totalResponses = goingCount + lateCount + notGoingCount
    const responseRate = totalResponses > 0 ? Number((((goingCount + lateCount) / totalResponses) * 100).toFixed(2)) : 0

    return {
      data: {
        orgId: effectiveOrgId,
        dateStart: range.start,
        dateEnd: range.end,
        totalResponses,
        goingCount,
        lateCount,
        notGoingCount,
        responseRate,
        byTeam: Array.from(byTeamMap.values()).sort((a, b) => a.teamName.localeCompare(b.teamName)),
      },
      error: null,
    }
  }

  async getTicketingSummary(orgId: string, dateRange?: DateRangeInput): Promise<ServiceResponse<TicketingSummaryDto>> {
    const effectiveOrgId = orgId || DEMO_ORG_A_ID
    const range = rangeWithDefaults(dateRange, 180)
    const start = new Date(range.start)
    const end = new Date(range.end)

    const orders = getFakeTicketOrdersWithRelations(effectiveOrgId).filter((order) =>
      inDateRange(order.processed_at ?? order.created_at, start, end),
    )
    const paidOrders = orders.filter((order) => order.status === 'paid')
    const refundedOrders = orders.filter((order) => order.status === 'refunded')

    const eventMap = new Map<string, TicketingRevenueByEventDto>()
    const monthMap = new Map<string, TicketingMonthlyRevenueDto>()
    let grossCents = 0
    let feesCents = 0
    let platformFeeCents = 0
    let orgRevenueCents = 0
    let ticketCount = 0

    for (const order of paidOrders) {
      const gross = Number(order.total_cents || 0)
      const fees = Number(order.fees_cents || 0)
      const platform = Number(order.platform_fee_cents || 0)
      const revenue = Number(order.org_revenue_cents ?? gross - platform)
      const thisTicketCount = Number(order.ticket_count || 0)
      const eventId = String(order.ticketed_event_id)
      const eventTitle = String((order as any)?.event?.title ?? 'Untitled Event')
      const sourceDate = new Date(order.processed_at ?? order.created_at)
      const month = `${sourceDate.getUTCFullYear()}-${String(sourceDate.getUTCMonth() + 1).padStart(2, '0')}`

      grossCents += gross
      feesCents += fees
      platformFeeCents += platform
      orgRevenueCents += revenue
      ticketCount += thisTicketCount

      const eventRow =
        eventMap.get(eventId) ??
        {
          ticketed_event_id: eventId,
          event_title: eventTitle,
          gross_cents: 0,
          platform_fee_cents: 0,
          org_revenue_cents: 0,
          order_count: 0,
          ticket_count: 0,
        }
      eventRow.gross_cents += gross
      eventRow.platform_fee_cents += platform
      eventRow.org_revenue_cents += revenue
      eventRow.order_count += 1
      eventRow.ticket_count += thisTicketCount
      eventMap.set(eventId, eventRow)

      const monthRow =
        monthMap.get(month) ??
        {
          month,
          gross_cents: 0,
          platform_fee_cents: 0,
          org_revenue_cents: 0,
          order_count: 0,
          ticket_count: 0,
        }
      monthRow.gross_cents += gross
      monthRow.platform_fee_cents += platform
      monthRow.org_revenue_cents += revenue
      monthRow.order_count += 1
      monthRow.ticket_count += thisTicketCount
      monthMap.set(month, monthRow)
    }

    return {
      data: {
        orgId: effectiveOrgId,
        dateStart: range.start,
        dateEnd: range.end,
        ordersCount: orders.length,
        paidOrdersCount: paidOrders.length,
        refundedOrdersCount: refundedOrders.length,
        grossCents,
        feesCents,
        platformFeeCents,
        orgRevenueCents,
        ticketCount,
        byEvent: Array.from(eventMap.values()).sort((a, b) => b.org_revenue_cents - a.org_revenue_cents),
        byMonth: Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month)),
      },
      error: null,
    }
  }

  async getFacilitiesUtilization(
    orgId: string,
    dateRange?: DateRangeInput,
  ): Promise<ServiceResponse<FacilitiesUtilizationSummaryDto>> {
    const effectiveOrgId = orgId || DEMO_ORG_A_ID
    const range = rangeWithDefaults(dateRange, 30)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const windowHours = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0)

    const resources = getResourcesForOrg(effectiveOrgId).filter((resource) => resource.reservable !== false)
    const reservations = getReservationsForOrg(effectiveOrgId, range.start, range.end)
    const facilities = getFacilitiesForOrg(effectiveOrgId)

    const byResource = resources.map((resource) => {
      const resourceReservations = reservations.filter((reservation) => reservation.resource_id === resource.id)
      const reservedHours = resourceReservations.reduce((sum, reservation) => {
        const rs = new Date(reservation.start_at).getTime()
        const re = new Date(reservation.end_at).getTime()
        return sum + Math.max((re - rs) / (1000 * 60 * 60), 0)
      }, 0)
      return {
        resourceId: resource.id,
        facilityId: resource.facility_id,
        resourceName: resource.name,
        reservationCount: resourceReservations.length,
        reservedHours: Number(reservedHours.toFixed(2)),
        utilizationPct: windowHours > 0 ? Number(((reservedHours / windowHours) * 100).toFixed(2)) : 0,
      }
    })

    const byFacility = facilities.map((facility) => {
      const facilityResources = byResource.filter((resource) => resource.facilityId === facility.id)
      const reservedHours = facilityResources.reduce((sum, resource) => sum + resource.reservedHours, 0)
      const resourceCount = facilityResources.length
      return {
        facilityId: facility.id,
        facilityName: facility.name,
        resourceCount,
        reservationCount: facilityResources.reduce((sum, resource) => sum + resource.reservationCount, 0),
        reservedHours: Number(reservedHours.toFixed(2)),
        utilizationPct:
          windowHours > 0 && resourceCount > 0
            ? Number(((reservedHours / (windowHours * resourceCount)) * 100).toFixed(2))
            : 0,
      }
    })

    const totalReservationHours = Number(byResource.reduce((sum, resource) => sum + resource.reservedHours, 0).toFixed(2))
    const totalResources = byResource.length
    const reservedResources = byResource.filter((resource) => resource.reservedHours > 0).length
    const avgUtilizationPct =
      totalResources > 0 && windowHours > 0
        ? Number(((totalReservationHours / (windowHours * totalResources)) * 100).toFixed(2))
        : 0

    return {
      data: {
        orgId: effectiveOrgId,
        dateStart: range.start,
        dateEnd: range.end,
        totalResources,
        reservedResources,
        totalReservationHours,
        avgUtilizationPct,
        byResource: byResource.sort((a, b) => b.reservedHours - a.reservedHours),
        byFacility: byFacility.sort((a, b) => b.reservedHours - a.reservedHours),
      },
      error: null,
    }
  }
}

const realSupabaseProvider: Provider = new RealSupabaseProvider()
const demoProvider: Provider = new DemoProvider()

export function getProvider(): Provider {
  return USE_FAKE_DATA || isInDemoSession() ? demoProvider : realSupabaseProvider
}
