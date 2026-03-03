import type { Athlete } from '../../../types/family'
import type { AthleteSportWithDetails } from '../../../data/services/athleteSportsService'
import type { AthleteTeamMembershipDisplay } from '../../../data/services/teamsService'
import type { PendingGuardianInvite, Guardian } from '../../../types/family'
import type { AttendanceStatus } from '../../../types/attendance'

export type TeamDetailPrimaryTab = 'overview' | 'schedule' | 'attendance' | 'payments' | 'staff' | 'settings' | 'media'
export type AthleteWorkspaceTab = 'summary' | 'profile' | 'sports' | 'teams' | 'guardians' | 'medical' | 'media'
export type TeamRosterStatusFilter = 'active' | 'inactive' | 'pending' | 'all'
export type TeamRosterSort = 'name' | 'jersey' | 'status' | 'attendance_risk'

export interface TeamDetailSummary {
  id: string
  name: string
  orgId: string | null
  sport?: { name: string; id?: string | null } | null
  program?: { name: string; id?: string | null } | null
  level?: { name: string; id?: string | null } | null
  minRosterSize?: number | null
  maxRosterSize?: number | null
  inviteCode?: string | null
}

export interface TeamSeasonSummary {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

export interface TeamRosterMemberSummary {
  membershipId: string
  athleteId: string
  firstName: string
  lastName: string
  fullName: string
  preferredName: string | null
  jerseyNumber: string | null
  fallbackJerseyNumber: string | null
  displayJerseyNumber: string | null
  position: string | null
  status: 'active' | 'inactive' | 'pending'
  role: string | null
  registrationStatus: string | null
  birthdate: string | null
  hasProfilePhoto: boolean
  profilePhotoUpdatedAt: string | null
  email: string | null
  phone: string | null
  hasGuardian: boolean | null
  profileCompletionScore: number
  badges: string[]
}

export interface TeamDetailStats {
  totalAthletes: number
  activeAthletes: number
  pendingAthletes: number
  inactiveAthletes: number
  vacancies: number
}

export interface AthleteAttendanceSummary {
  totalRecordedEvents: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number | null
  latestStatus: AttendanceStatus | null
}

export interface AthleteUpcomingEvent {
  id: string
  title: string
  type: string | null
  startTime: string
  locationName: string | null
  attendanceStatus: AttendanceStatus | null
}

export interface AthletePaymentSummary {
  assignmentCount: number
  paidCount: number
  overdueCount: number
  outstandingBalanceCents: number
}

export interface TeamAthleteWorkspaceData {
  athlete: Athlete | null
  sports: AthleteSportWithDetails[]
  guardians: Guardian[]
  pendingInvites: PendingGuardianInvite[]
  teamMemberships: AthleteTeamMembershipDisplay[]
  attendanceSummary: AthleteAttendanceSummary
  upcomingEvents: AthleteUpcomingEvent[]
  paymentSummary: AthletePaymentSummary | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export interface TeamDetailPermissions {
  isCoach: boolean
  isOrgAdmin: boolean
  canEditRosterFields: boolean
  canEditProfileBasics: boolean
  canEditUniversalFields: boolean
  canEditSports: boolean
  canViewOtherTeams: boolean
  canViewOtherSports: boolean
  canViewGuardians: boolean
  canManageGuardians: boolean
  canViewMedical: boolean
  canManageMedical: boolean
  canViewPayments: boolean
  canManageCoaches: boolean
  canManageSettings: boolean
  canViewMedia: boolean
}

