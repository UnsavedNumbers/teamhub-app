import {
  getProvider,
  type DateRangeInput,
  type ServiceResponse,
  type OrgDashboardKpisDto,
  type CoachTeamKpisDto,
  type CoachSportProfileInsightsDto,
  type AttendanceSummaryDto,
  type TicketingSummaryDto,
  type FacilitiesUtilizationSummaryDto,
} from './provider'

export async function getOrgDashboardKpis(orgId: string): Promise<ServiceResponse<OrgDashboardKpisDto>> {
  return getProvider().getOrgDashboardKpis(orgId)
}

export async function getCoachTeamKpis(
  orgId: string,
  coachUserId: string,
): Promise<ServiceResponse<CoachTeamKpisDto>> {
  return getProvider().getCoachTeamKpis(orgId, coachUserId)
}

export async function getCoachSportProfileInsights(
  orgId: string,
  coachUserId: string,
  sportKey: string,
  filters?: Record<string, unknown>,
): Promise<ServiceResponse<CoachSportProfileInsightsDto>> {
  return getProvider().getCoachSportProfileInsights(orgId, coachUserId, sportKey, filters)
}

export async function getAttendanceSummary(
  orgId: string,
  teamIds?: string[],
  dateRange?: DateRangeInput,
): Promise<ServiceResponse<AttendanceSummaryDto>> {
  return getProvider().getAttendanceSummary(orgId, teamIds, dateRange)
}

export async function getTicketingSummary(
  orgId: string,
  dateRange?: DateRangeInput,
): Promise<ServiceResponse<TicketingSummaryDto>> {
  return getProvider().getTicketingSummary(orgId, dateRange)
}

export async function getFacilitiesUtilization(
  orgId: string,
  dateRange?: DateRangeInput,
): Promise<ServiceResponse<FacilitiesUtilizationSummaryDto>> {
  return getProvider().getFacilitiesUtilization(orgId, dateRange)
}
