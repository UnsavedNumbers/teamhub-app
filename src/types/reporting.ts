/**
 * Reporting Console Types
 * 
 * Type definitions for the organization admin reporting console.
 */

// ============================================================================
// Scope & Filters
// ============================================================================

export interface ReportScope {
  orgId: string
  subOrgId?: string | null
  seasonId?: string | null
  sportId?: string | null
  programId?: string | null
  levelId?: string | null
  teamId?: string | null
  athleteId?: string | null
}

export interface DateRange {
  start: string // ISO date string
  end: string // ISO date string
}

export interface ReportFilters extends ReportScope {
  dateRange?: DateRange
  datePreset?: 'today' | 'this_week' | 'this_month' | 'this_season' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom'
}

// ============================================================================
// Saved Reports
// ============================================================================

export interface SavedReportConfig {
  scope: ReportScope
  filters: ReportFilters
  charts: ChartConfig[]
  columns: string[]
  domain: ReportDomain
}

export interface SavedReport {
  id: string
  org_id: string
  user_id: string
  name: string
  description: string | null
  config: SavedReportConfig
  is_shared: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

export interface CreateSavedReportInput {
  name: string
  description?: string
  config: SavedReportConfig
  is_shared?: boolean
}

export interface UpdateSavedReportInput {
  name?: string
  description?: string
  config?: SavedReportConfig
  is_shared?: boolean
}

// ============================================================================
// Scheduled Reports
// ============================================================================

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week?: number // 0-6 (Sunday-Saturday) for weekly
  day_of_month?: number // 1-31 for monthly
  time?: string // HH:mm format
}

export interface ScheduledReport {
  id: string
  org_id: string
  user_id: string
  name: string
  report_config: SavedReportConfig
  schedule: ScheduleConfig
  recipients: string[]
  format: 'csv' | 'xlsx' | 'pdf'
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateScheduledReportInput {
  name: string
  report_config: SavedReportConfig
  schedule: ScheduleConfig
  recipients: string[]
  format: 'csv' | 'xlsx' | 'pdf'
}

export interface UpdateScheduledReportInput {
  name?: string
  report_config?: SavedReportConfig
  schedule?: ScheduleConfig
  recipients?: string[]
  format?: 'csv' | 'xlsx' | 'pdf'
  is_active?: boolean
}

// ============================================================================
// Export History
// ============================================================================

export interface ExportHistory {
  id: string
  org_id: string
  user_id: string
  report_config: SavedReportConfig
  format: 'csv' | 'xlsx' | 'pdf'
  file_url: string | null
  file_size_bytes: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

// ============================================================================
// Report Domains
// ============================================================================

export type ReportDomain =
  | 'participation'
  | 'payments'
  | 'scheduling'
  | 'travel'
  | 'uniforms'
  | 'communications'
  | 'operations'
  | 'ticketing'
  | 'registration'
  | 'video'
  | 'events'
  | 'errors'
  | 'overview'
  | 'participation'
  | 'scheduling'
  | 'travel'
  | 'payments'
  | 'uniforms'
  | 'communications'
  | 'operations'
  | 'sub_org_rollups'

// ============================================================================
// Chart Configuration
// ============================================================================

export type ChartType =
  | 'line'
  | 'bar'
  | 'stacked_bar'
  | 'area'
  | 'pie'
  | 'heatmap'
  | 'treemap'
  | 'funnel'
  | 'sankey'

export interface ChartConfig {
  id: string
  type: ChartType
  title: string
  metric: string
  dimensions?: string[]
  filters?: Record<string, unknown>
}

// ============================================================================
// Metrics & Data
// ============================================================================

export interface MetricValue {
  value: number
  label: string
  trend?: number // Percentage change
  previousValue?: number
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
  label?: string
}

export interface TimeSeriesData {
  series: Array<{
    name: string
    data: TimeSeriesDataPoint[]
  }>
}

export interface BarChartDataPoint {
  category: string
  value: number
  series?: string
  breakdown?: Record<string, number>
}

export interface BarChartData {
  data: BarChartDataPoint[]
}

export interface HeatmapDataPoint {
  x: string
  y: string
  value: number
}

export interface HeatmapData {
  data: HeatmapDataPoint[]
  xLabels: string[]
  yLabels: string[]
}

// ============================================================================
// Organization Health Metrics
// ============================================================================

export interface OrgHealthMetrics {
  totalSubOrgs: number
  activeSubOrgs: number
  inactiveSubOrgs: number
  teamsPerSubOrg: Array<{ subOrgId: string; subOrgName: string; teamCount: number }>
  athletesPerSubOrg: Array<{ subOrgId: string; subOrgName: string; athleteCount: number }>
  growthOverTime: TimeSeriesDataPoint[]
}

// ============================================================================
// Participation Metrics
// ============================================================================

export interface ParticipationMetrics {
  activeAthletesByTeam: Array<{ teamId: string; teamName: string; count: number }>
  rosterChurn: {
    adds: number
    removes: number
    netChange: number
  }
  multiTeamAthletes: number
  guardiansCoverage: {
    total: number
    missing: number
    unverified: number
  }
}

// ============================================================================
// Scheduling Metrics
// ============================================================================

export interface SchedulingMetrics {
  eventsByType: Array<{ type: string; count: number }>
  rsvpRates: Array<{ teamId: string; teamName: string; rate: number }>
  attendanceRates: Array<{ teamId: string; teamName: string; rate: number }>
  noResponseList: Array<{ eventId: string; eventName: string; athleteId: string; athleteName: string }>
  conflicts: Array<{ teamId: string; teamName: string; conflictCount: number }>
}

// ============================================================================
// Travel Metrics
// ============================================================================

export interface TravelMetrics {
  tripsPerMonth: Array<{ month: string; count: number }>
  overlappingTravel: Array<{ teamId: string; teamName: string; overlapCount: number }>
  missingDetails: Array<{ tripId: string; tripName: string; missingFields: string[] }>
}

// ============================================================================
// Payment Metrics
// ============================================================================

export interface PaymentMetrics {
  feesCreated: number
  feesCollected: number
  outstandingBalance: number
  agingBuckets: {
    '0-7': number
    '8-30': number
    '31-60': number
    '60+': number
  }
  partialPayments: number
  offlinePayments: number
  collectionVelocity: number // Average days to pay
}

// ============================================================================
// Uniform Metrics
// ============================================================================

export interface UniformMetrics {
  sizeCompletionRate: number
  missingSizes: Array<{ teamId: string; teamName: string; missingCount: number }>
  ordersByItem: Array<{ item: string; count: number }>
  deadlineCompliance: number
}

// ============================================================================
// Communication Metrics
// ============================================================================

export interface CommunicationMetrics {
  announcementsVolume: number
  announcementsByTeam: Array<{ teamId: string; teamName: string; count: number }>
  huddlesVolume: number
  huddlesByTeam: Array<{ teamId: string; teamName: string; count: number }>
  engagementRate?: number
  flaggedMessages?: number
}

// ============================================================================
// Operations Metrics
// ============================================================================

export interface OperationsMetrics {
  adminActivity: {
    creates: number
    updates: number
    deletes: number
  }
  permissionBlocks: number
  notificationDeliveryStats?: {
    sent: number
    delivered: number
    failed: number
  }
}

// ============================================================================
// Revenue Metrics
// ============================================================================

export interface RevenueMetrics {
  totalRevenue: number
  revenueOverTime: TimeSeriesDataPoint[]
  revenueBySeason: Array<{ seasonId: string; seasonName: string; revenue: number }>
  revenueByTeam: Array<{ teamId: string; teamName: string; revenue: number }>
  paymentsCompleted: number
  paymentsFailed: number
  outstandingBalances: number
  paymentPlansOnTrack: number
  paymentPlansOverdue: number
  averagePaymentAmount: number
  refundsOverTime: TimeSeriesDataPoint[]
}

// ============================================================================
// Ticketing Metrics
// ============================================================================

export interface TicketingMetrics {
  ticketsSoldOverTime: TimeSeriesDataPoint[]
  ticketRevenueByEvent: Array<{ eventId: string; eventName: string; revenue: number }>
  checkInRateByEvent: Array<{ eventId: string; eventName: string; scanned: number; notScanned: number }>
  walkUpVsPreSale: { walkUp: number; preSale: number }
  totalTicketRevenue: number
  topEventsByAttendance: Array<{ eventId: string; eventName: string; attendance: number }>
}

// ============================================================================
// Registration Metrics
// ============================================================================

export interface RegistrationMetrics {
  registrationsOverTime: TimeSeriesDataPoint[]
  registrationCompletionRate: number
  dropOffPoints: Array<{ step: string; count: number }>
  registrationsByProgram: Array<{ programId: string; programName: string; count: number }>
  incompleteRegistrations: number
  waiversSigned: number
  waiversPending: number
}

// ============================================================================
// Video Metrics
// ============================================================================

export interface VideoMetrics {
  videoViewsOverTime: TimeSeriesDataPoint[]
  mostWatchedVideos: Array<{ videoId: string; videoName: string; views: number }>
  videosWithZeroViews: Array<{ videoId: string; videoName: string }>
  viewsByTeam: Array<{ teamId: string; teamName: string; views: number }>
}

// ============================================================================
// Events Metrics
// ============================================================================

export interface EventsMetrics {
  upcomingEventsCount: number
  eventsCancelledOverTime: TimeSeriesDataPoint[]
  rsvpRateByEvent: Array<{ eventId: string; eventName: string; rsvpRate: number }>
}

// ============================================================================
// Errors Metrics
// ============================================================================

export interface ErrorsMetrics {
  paymentFailuresOverTime: TimeSeriesDataPoint[]
  paymentFailureReasons: Array<{ reason: string; count: number }>
  errorTypesBreakdown: Array<{ type: string; count: number }>
  failedCheckIns: number
}

// ============================================================================
// Drilldown
// ============================================================================

export interface DrilldownPath {
  level: 'org' | 'sub_org' | 'sport' | 'program' | 'level' | 'team' | 'athlete'
  id: string
  name: string
}

// ============================================================================
// Compare Mode
// ============================================================================

export interface CompareConfig {
  type: 'team' | 'sub_org' | 'season' | 'period'
  items: Array<{
    id: string
    label: string
  }>
}
