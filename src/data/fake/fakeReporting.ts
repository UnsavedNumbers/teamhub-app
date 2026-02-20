/**
 * Fake Reporting Data Service
 *
 * Provides comprehensive fake data for all reporting console features.
 * Generates realistic mock metrics, charts, and tables for demo org admins.
 */

import { FAKE_DATA_DELAY_MS } from '../config'
import { DEMO_ORG_A_ID } from '../config'
import type {
  ReportFilters,
  OrgHealthMetrics,
  ParticipationMetrics,
  SchedulingMetrics,
  TravelMetrics,
  PaymentMetrics,
  UniformMetrics,
  CommunicationMetrics,
  OperationsMetrics,
  RevenueMetrics,
  TicketingMetrics,
  RegistrationMetrics,
  VideoMetrics,
  EventsMetrics,
  ErrorsMetrics,
  SavedReport,
  ScheduledReport,
  ExportHistory,
  CreateSavedReportInput,
  UpdateSavedReportInput,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  TimeSeriesDataPoint,
} from '../../types/reporting'
async function simulateDelay(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Helper Functions
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}


function generateTimeSeries(
  days: number,
  startValue: number,
  trend: 'up' | 'down' | 'stable' = 'stable',
  variance: number = 0.1
): TimeSeriesDataPoint[] {
  const points: TimeSeriesDataPoint[] = []
  const now = new Date()
  let value = startValue

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Apply trend
    switch (trend) {
      case 'up':
        value += randomFloat(-variance * startValue, variance * startValue * 2)
        break
      case 'down':
        value += randomFloat(-variance * startValue * 2, variance * startValue)
        break
      case 'stable':
        value += randomFloat(-variance * startValue, variance * startValue)
        break
    }

    value = Math.max(0, value) // Ensure non-negative

    points.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    })
  }

  return points
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// Mock Data Constants
// ============================================================================

const DEMO_SUB_ORGS = [
  { id: 'sub-org-1', name: 'North District' },
  { id: 'sub-org-2', name: 'South District' },
  { id: 'sub-org-3', name: 'East District' },
  { id: 'sub-org-4', name: 'West District' },
]

const DEMO_TEAMS = [
  { id: 'team-1', name: 'U12 Soccer A', sportId: 'sport-1', programId: 'program-1', levelId: 'level-1' },
  { id: 'team-2', name: 'U12 Soccer B', sportId: 'sport-1', programId: 'program-1', levelId: 'level-1' },
  { id: 'team-3', name: 'U14 Soccer', sportId: 'sport-1', programId: 'program-1', levelId: 'level-2' },
  { id: 'team-4', name: 'U10 Basketball', sportId: 'sport-2', programId: 'program-2', levelId: 'level-3' },
  { id: 'team-5', name: 'U12 Basketball', sportId: 'sport-2', programId: 'program-2', levelId: 'level-1' },
]

const DEMO_ATHLETES = [
  { id: 'athlete-1', name: 'Emma Johnson' },
  { id: 'athlete-2', name: 'Liam Smith' },
  { id: 'athlete-3', name: 'Olivia Brown' },
  { id: 'athlete-4', name: 'Noah Davis' },
  { id: 'athlete-5', name: 'Sophia Wilson' },
  { id: 'athlete-6', name: 'Mason Martinez' },
  { id: 'athlete-7', name: 'Ava Anderson' },
  { id: 'athlete-8', name: 'Aiden Taylor' },
]

const EVENT_TYPES = ['practice', 'game', 'tournament', 'travel', 'meeting', 'tryout']

// ============================================================================
// Organization Health Metrics
// ============================================================================

export async function getFakeOrgHealthMetrics(
  filters: ReportFilters
): Promise<{ data: OrgHealthMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const subOrgs = filters.subOrgId
    ? DEMO_SUB_ORGS.filter((s) => s.id === filters.subOrgId)
    : DEMO_SUB_ORGS

  const teamsPerSubOrg = subOrgs.map((subOrg) => ({
    subOrgId: subOrg.id,
    subOrgName: subOrg.name,
    teamCount: randomInt(3, 12),
  }))

  const athletesPerSubOrg = subOrgs.map((subOrg) => ({
    subOrgId: subOrg.id,
    subOrgName: subOrg.name,
    athleteCount: randomInt(50, 200),
  }))

  const growthOverTime = generateTimeSeries(90, 100, 'up', 0.15)

  return {
    data: {
      totalSubOrgs: subOrgs.length,
      activeSubOrgs: Math.max(1, subOrgs.length - randomInt(0, 1)),
      inactiveSubOrgs: randomInt(0, 1),
      teamsPerSubOrg,
      athletesPerSubOrg,
      growthOverTime,
    },
    error: null,
  }
}

// ============================================================================
// Participation Metrics
// ============================================================================

export async function getFakeParticipationMetrics(
  filters: ReportFilters
): Promise<{ data: ParticipationMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const teams = filters.teamId
    ? DEMO_TEAMS.filter((t) => t.id === filters.teamId)
    : filters.sportId
      ? DEMO_TEAMS.filter((t) => t.sportId === filters.sportId)
      : DEMO_TEAMS

  const activeAthletesByTeam = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    count: randomInt(12, 25),
  }))

  const adds = randomInt(20, 50)
  const removes = randomInt(5, 15)

  return {
    data: {
      activeAthletesByTeam,
      rosterChurn: {
        adds,
        removes,
        netChange: adds - removes,
      },
      multiTeamAthletes: randomInt(5, 15),
      guardiansCoverage: {
        total: randomInt(100, 200),
        missing: randomInt(2, 8),
        unverified: randomInt(0, 5),
      },
    },
    error: null,
  }
}

// ============================================================================
// Scheduling Metrics
// ============================================================================

export async function getFakeSchedulingMetrics(
  filters: ReportFilters
): Promise<{ data: SchedulingMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const eventsByType = EVENT_TYPES.map((type) => ({
    type,
    count: randomInt(5, 30),
  }))

  const teams = filters.teamId
    ? DEMO_TEAMS.filter((t) => t.id === filters.teamId)
    : DEMO_TEAMS.slice(0, 3)

  const rsvpRates = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    rate: randomFloat(65, 95),
  }))

  const attendanceRates = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    rate: randomFloat(75, 98),
  }))

  const noResponseList = Array.from({ length: randomInt(3, 8) }, (_, i) => ({
    eventId: `event-${i + 1}`,
    eventName: `Practice ${i + 1}`,
    athleteId: randomChoice(DEMO_ATHLETES).id,
    athleteName: randomChoice(DEMO_ATHLETES).name,
  }))

  const conflicts = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    conflictCount: randomInt(0, 3),
  }))

  return {
    data: {
      eventsByType,
      rsvpRates,
      attendanceRates,
      noResponseList,
      conflicts,
    },
    error: null,
  }
}

// ============================================================================
// Travel Metrics
// ============================================================================

export async function getFakeTravelMetrics(
  filters: ReportFilters
): Promise<{ data: TravelMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  const tripsPerMonth = months.map((month) => ({
    month,
    count: randomInt(0, 5),
  }))

  const teams = filters.teamId
    ? DEMO_TEAMS.filter((t) => t.id === filters.teamId)
    : DEMO_TEAMS.slice(0, 3)

  const overlappingTravel = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    overlapCount: randomInt(0, 2),
  }))

  const missingDetails = Array.from({ length: randomInt(2, 5) }, (_, i) => ({
    tripId: `trip-${i + 1}`,
    tripName: `Tournament ${i + 1}`,
    missingFields: randomChoice([
      ['hotel_name'],
      ['hotel_address'],
      ['itinerary_file_path'],
      ['hotel_name', 'hotel_phone'],
    ]),
  }))

  return {
    data: {
      tripsPerMonth,
      overlappingTravel,
      missingDetails,
    },
    error: null,
  }
}

// ============================================================================
// Payment Metrics
// ============================================================================

export async function getFakePaymentMetrics(
  _filters: ReportFilters
): Promise<{ data: PaymentMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const feesCreated = randomInt(50, 150)
  const feesCollected = randomInt(30000, 80000) * 100 // in cents
  const outstandingBalance = randomInt(5000, 20000) * 100

  return {
    data: {
      feesCreated,
      feesCollected,
      outstandingBalance,
      agingBuckets: {
        '0-7': randomInt(5, 15),
        '8-30': randomInt(10, 25),
        '31-60': randomInt(5, 15),
        '60+': randomInt(2, 8),
      },
      partialPayments: randomInt(3, 10),
      offlinePayments: randomInt(1000, 5000) * 100,
      collectionVelocity: randomFloat(5, 25),
    },
    error: null,
  }
}

// ============================================================================
// Uniform Metrics
// ============================================================================

export async function getFakeUniformMetrics(
  filters: ReportFilters
): Promise<{ data: UniformMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const teams = filters.teamId
    ? DEMO_TEAMS.filter((t) => t.id === filters.teamId)
    : DEMO_TEAMS.slice(0, 3)

  const missingSizes = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    missingCount: randomInt(0, 5),
  }))

  const uniformItems = ['Jersey', 'Shorts', 'Socks', 'Warm-up Jacket', 'Backpack']
  const ordersByItem = uniformItems.map((item) => ({
    item,
    count: randomInt(20, 50),
  }))

  return {
    data: {
      sizeCompletionRate: randomFloat(85, 98),
      missingSizes,
      ordersByItem,
      deadlineCompliance: randomFloat(90, 100),
    },
    error: null,
  }
}

// ============================================================================
// Communication Metrics
// ============================================================================

export async function getFakeCommunicationMetrics(
  filters: ReportFilters
): Promise<{ data: CommunicationMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const teams = filters.teamId
    ? DEMO_TEAMS.filter((t) => t.id === filters.teamId)
    : DEMO_TEAMS.slice(0, 3)

  const announcementsByTeam = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    count: randomInt(5, 20),
  }))

  const huddlesByTeam = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    count: randomInt(20, 60),
  }))

  return {
    data: {
      announcementsVolume: randomInt(30, 80),
      announcementsByTeam,
      huddlesVolume: randomInt(100, 300),
      huddlesByTeam,
      engagementRate: randomFloat(60, 90),
      flaggedMessages: randomInt(0, 3),
    },
    error: null,
  }
}

// ============================================================================
// Operations Metrics
// ============================================================================

export async function getFakeOperationsMetrics(
  _filters: ReportFilters
): Promise<{ data: OperationsMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  return {
    data: {
      adminActivity: {
        creates: randomInt(50, 150),
        updates: randomInt(100, 300),
        deletes: randomInt(5, 20),
      },
      permissionBlocks: randomInt(0, 5),
      notificationDeliveryStats: {
        sent: randomInt(500, 1500),
        delivered: randomInt(480, 1450),
        failed: randomInt(0, 20),
      },
    },
    error: null,
  }
}

// ============================================================================
// Revenue Metrics
// ============================================================================

export async function getFakeRevenueMetrics(
  _filters: ReportFilters
): Promise<{ data: RevenueMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const revenueOverTime = generateTimeSeries(30, 50000, 'up', 0.15)
  const refundsOverTime = generateTimeSeries(30, 500, 'stable', 0.2)

  return {
    data: {
      totalRevenue: randomInt(500000, 2000000),
      revenueOverTime,
      revenueBySeason: [
        { seasonId: 'season-1', seasonName: 'Fall 2024', revenue: randomInt(200000, 800000) },
        { seasonId: 'season-2', seasonName: 'Spring 2024', revenue: randomInt(150000, 600000) },
      ],
      revenueByTeam: DEMO_TEAMS.slice(0, 5).map((team) => ({
        teamId: team.id,
        teamName: team.name,
        revenue: randomInt(10000, 50000),
      })),
      paymentsCompleted: randomInt(800, 1200),
      paymentsFailed: randomInt(5, 30),
      outstandingBalances: randomInt(50000, 200000),
      paymentPlansOnTrack: randomInt(200, 400),
      paymentPlansOverdue: randomInt(10, 50),
      averagePaymentAmount: randomInt(200, 500),
      refundsOverTime,
    },
    error: null,
  }
}

// ============================================================================
// Ticketing Metrics
// ============================================================================

export async function getFakeTicketingMetrics(
  _filters: ReportFilters
): Promise<{ data: TicketingMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const ticketsSoldOverTime = generateTimeSeries(30, 100, 'up', 0.2)

  return {
    data: {
      ticketsSoldOverTime,
      ticketRevenueByEvent: [
        { eventId: 'event-1', eventName: 'Championship Game', revenue: randomInt(5000, 20000) },
        { eventId: 'event-2', eventName: 'Semi-Finals', revenue: randomInt(3000, 15000) },
        { eventId: 'event-3', eventName: 'Quarter-Finals', revenue: randomInt(2000, 10000) },
      ],
      checkInRateByEvent: [
        { eventId: 'event-1', eventName: 'Championship Game', scanned: 450, notScanned: 50 },
        { eventId: 'event-2', eventName: 'Semi-Finals', scanned: 320, notScanned: 30 },
        { eventId: 'event-3', eventName: 'Quarter-Finals', scanned: 280, notScanned: 20 },
      ],
      walkUpVsPreSale: {
        walkUp: randomInt(100, 300),
        preSale: randomInt(500, 1000),
      },
      totalTicketRevenue: randomInt(50000, 200000),
      topEventsByAttendance: [
        { eventId: 'event-1', eventName: 'Championship Game', attendance: 500 },
        { eventId: 'event-2', eventName: 'Semi-Finals', attendance: 350 },
        { eventId: 'event-3', eventName: 'Quarter-Finals', attendance: 300 },
      ],
    },
    error: null,
  }
}

// ============================================================================
// Registration Metrics
// ============================================================================

export async function getFakeRegistrationMetrics(
  _filters: ReportFilters
): Promise<{ data: RegistrationMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const registrationsOverTime = generateTimeSeries(30, 50, 'up', 0.15)

  return {
    data: {
      registrationsOverTime,
      registrationCompletionRate: randomFloat(75, 95),
      dropOffPoints: [
        { step: 'Personal Info', count: randomInt(5, 15) },
        { step: 'Medical Info', count: randomInt(10, 25) },
        { step: 'Payment', count: randomInt(20, 40) },
        { step: 'Waiver', count: randomInt(3, 10) },
      ],
      registrationsByProgram: [
        { programId: 'program-1', programName: 'Soccer', count: randomInt(100, 300) },
        { programId: 'program-2', programName: 'Basketball', count: randomInt(80, 250) },
      ],
      incompleteRegistrations: randomInt(30, 80),
      waiversSigned: randomInt(400, 600),
      waiversPending: randomInt(20, 50),
    },
    error: null,
  }
}

// ============================================================================
// Video Metrics
// ============================================================================

export async function getFakeVideoMetrics(
  _filters: ReportFilters
): Promise<{ data: VideoMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const videoViewsOverTime = generateTimeSeries(30, 500, 'up', 0.2)

  return {
    data: {
      videoViewsOverTime,
      mostWatchedVideos: [
        { videoId: 'video-1', videoName: 'Championship Highlights', views: randomInt(5000, 15000) },
        { videoId: 'video-2', videoName: 'Semi-Finals Recap', views: randomInt(3000, 10000) },
        { videoId: 'video-3', videoName: 'Training Session', views: randomInt(1000, 5000) },
      ],
      videosWithZeroViews: [
        { videoId: 'video-4', videoName: 'Old Practice Video' },
        { videoId: 'video-5', videoName: 'Test Upload' },
      ],
      viewsByTeam: DEMO_TEAMS.slice(0, 5).map((team) => ({
        teamId: team.id,
        teamName: team.name,
        views: randomInt(500, 3000),
      })),
    },
    error: null,
  }
}

// ============================================================================
// Events Metrics
// ============================================================================

export async function getFakeEventsMetrics(
  _filters: ReportFilters
): Promise<{ data: EventsMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const eventsCancelledOverTime = generateTimeSeries(30, 2, 'stable', 0.3)

  return {
    data: {
      upcomingEventsCount: randomInt(10, 50),
      eventsCancelledOverTime,
      rsvpRateByEvent: [
        { eventId: 'event-1', eventName: 'Practice', rsvpRate: randomFloat(80, 95) },
        { eventId: 'event-2', eventName: 'Game', rsvpRate: randomFloat(85, 98) },
        { eventId: 'event-3', eventName: 'Tournament', rsvpRate: randomFloat(90, 100) },
      ],
    },
    error: null,
  }
}

// ============================================================================
// Errors Metrics
// ============================================================================

export async function getFakeErrorsMetrics(
  _filters: ReportFilters
): Promise<{ data: ErrorsMetrics | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const paymentFailuresOverTime = generateTimeSeries(30, 5, 'stable', 0.3)

  return {
    data: {
      paymentFailuresOverTime,
      paymentFailureReasons: [
        { reason: 'Insufficient Funds', count: randomInt(10, 30) },
        { reason: 'Card Declined', count: randomInt(5, 20) },
        { reason: 'Expired Card', count: randomInt(2, 10) },
        { reason: 'Network Error', count: randomInt(1, 5) },
      ],
      errorTypesBreakdown: [
        { type: 'Payment', count: randomInt(20, 60) },
        { type: 'Check-in', count: randomInt(5, 15) },
        { type: 'Registration', count: randomInt(3, 10) },
        { type: 'Other', count: randomInt(1, 5) },
      ],
      failedCheckIns: randomInt(5, 25),
    },
    error: null,
  }
}

// ============================================================================
// Saved Reports CRUD (Fake)
// ============================================================================

const fakeSavedReports: SavedReport[] = [
  {
    id: 'report-1',
    org_id: DEMO_ORG_A_ID,
    user_id: 'user-1',
    name: 'Monthly Participation Report',
    description: 'Overview of athlete participation across all teams',
    config: {
      scope: {
        orgId: DEMO_ORG_A_ID,
        subOrgId: null,
        seasonId: null,
        sportId: null,
        programId: null,
        levelId: null,
        teamId: null,
        athleteId: null,
      },
      filters: {
        orgId: DEMO_ORG_A_ID,
        datePreset: 'this_month',
      },
      charts: [],
      columns: [],
      domain: 'participation',
    },
    is_shared: false,
    share_token: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'report-2',
    org_id: DEMO_ORG_A_ID,
    user_id: 'user-1',
    name: 'Payment Status Dashboard',
    description: 'Current payment status and outstanding balances',
    config: {
      scope: {
        orgId: DEMO_ORG_A_ID,
        subOrgId: null,
        seasonId: null,
        sportId: null,
        programId: null,
        levelId: null,
        teamId: null,
        athleteId: null,
      },
      filters: {
        orgId: DEMO_ORG_A_ID,
        datePreset: 'last_30_days',
      },
      charts: [],
      columns: [],
      domain: 'payments',
    },
    is_shared: true,
    share_token: 'sr_share_abc123',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export async function getFakeSavedReports(
  orgId: string,
  userId: string
): Promise<{ data: SavedReport[]; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)
  return {
    data: fakeSavedReports.filter((r) => r.org_id === orgId && r.user_id === userId),
    error: null,
  }
}

export async function getFakeSavedReportById(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)
  const report = fakeSavedReports.find((r) => r.id === reportId && r.org_id === orgId)
  if (!report) {
    return { data: null, error: new Error('Report not found') }
  }
  if (report.user_id !== userId && !report.is_shared) {
    return { data: null, error: new Error('You do not have permission to access this report') }
  }
  return { data: report, error: null }
}

export async function getFakeSavedReportByToken(
  shareToken: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)
  const report = fakeSavedReports.find((r) => r.share_token === shareToken && r.is_shared)
  if (!report) {
    return { data: null, error: new Error('Report not found') }
  }
  return { data: report, error: null }
}

export async function createFakeSavedReport(
  input: CreateSavedReportInput,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const report: SavedReport = {
    id: generateUUID(),
    org_id: orgId,
    user_id: userId,
    name: input.name,
    description: input.description || null,
    config: input.config,
    is_shared: input.is_shared || false,
    share_token: input.is_shared ? `sr_share_${Math.random().toString(36).substring(2, 15)}` : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  fakeSavedReports.push(report)
  return { data: report, error: null }
}

export async function updateFakeSavedReport(
  reportId: string,
  input: UpdateSavedReportInput,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const index = fakeSavedReports.findIndex((r) => r.id === reportId && r.org_id === orgId && r.user_id === userId)
  if (index === -1) {
    return { data: null, error: new Error('Report not found') }
  }

  const report = fakeSavedReports[index]
  fakeSavedReports[index] = {
    ...report,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description || null }),
    ...(input.config !== undefined && { config: input.config }),
    ...(input.is_shared !== undefined && {
      is_shared: input.is_shared,
      share_token: input.is_shared
        ? report.share_token || `sr_share_${Math.random().toString(36).substring(2, 15)}`
        : null,
    }),
    updated_at: new Date().toISOString(),
  }

  return { data: fakeSavedReports[index], error: null }
}

export async function deleteFakeSavedReport(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const index = fakeSavedReports.findIndex((r) => r.id === reportId && r.org_id === orgId && r.user_id === userId)
  if (index === -1) {
    return { error: new Error('Report not found') }
  }

  fakeSavedReports.splice(index, 1)
  return { error: null }
}

// ============================================================================
// Scheduled Reports CRUD (Fake)
// ============================================================================

const fakeScheduledReports: ScheduledReport[] = [
  {
    id: 'scheduled-1',
    org_id: DEMO_ORG_A_ID,
    user_id: 'user-1',
    name: 'Weekly Participation Summary',
    report_config: {
      scope: { orgId: DEMO_ORG_A_ID },
      filters: { orgId: DEMO_ORG_A_ID, datePreset: 'this_week' },
      charts: [],
      columns: [],
      domain: 'participation',
    },
    schedule: {
      frequency: 'weekly',
      day_of_week: 1,
      time: '09:00',
    },
    recipients: ['admin@example.com'],
    format: 'pdf',
    is_active: true,
    last_run_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    next_run_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export async function getFakeScheduledReports(
  orgId: string,
  _userId: string
): Promise<{ data: ScheduledReport[]; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)
  return {
    data: fakeScheduledReports.filter((r) => r.org_id === orgId),
    error: null,
  }
}

export async function createFakeScheduledReport(
  input: CreateScheduledReportInput,
  orgId: string,
  userId: string
): Promise<{ data: ScheduledReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const now = new Date()
  const nextRun = new Date(now)
  nextRun.setDate(nextRun.getDate() + 1)

  const report: ScheduledReport = {
    id: generateUUID(),
    org_id: orgId,
    user_id: userId,
    name: input.name,
    report_config: input.report_config,
    schedule: input.schedule,
    recipients: input.recipients,
    format: input.format,
    is_active: true,
    last_run_at: null,
    next_run_at: nextRun.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  fakeScheduledReports.push(report)
  return { data: report, error: null }
}

export async function updateFakeScheduledReport(
  reportId: string,
  input: UpdateScheduledReportInput,
  orgId: string,
  userId: string
): Promise<{ data: ScheduledReport | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const index = fakeScheduledReports.findIndex((r) => r.id === reportId && r.org_id === orgId && r.user_id === userId)
  if (index === -1) {
    return { data: null, error: new Error('Scheduled report not found') }
  }

  const report = fakeScheduledReports[index]
  fakeScheduledReports[index] = {
    ...report,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.report_config !== undefined && { report_config: input.report_config }),
    ...(input.schedule !== undefined && { schedule: input.schedule }),
    ...(input.recipients !== undefined && { recipients: input.recipients }),
    ...(input.format !== undefined && { format: input.format }),
    ...(input.is_active !== undefined && { is_active: input.is_active }),
    updated_at: new Date().toISOString(),
  }

  return { data: fakeScheduledReports[index], error: null }
}

export async function deleteFakeScheduledReport(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const index = fakeScheduledReports.findIndex((r) => r.id === reportId && r.org_id === orgId && r.user_id === userId)
  if (index === -1) {
    return { error: new Error('Scheduled report not found') }
  }

  fakeScheduledReports.splice(index, 1)
  return { error: null }
}

// ============================================================================
// Export History CRUD (Fake)
// ============================================================================

const fakeExportHistory: ExportHistory[] = [
  {
    id: 'export-1',
    org_id: DEMO_ORG_A_ID,
    user_id: 'user-1',
    report_config: {
      scope: { orgId: DEMO_ORG_A_ID },
      filters: { orgId: DEMO_ORG_A_ID },
      charts: [],
      columns: [],
      domain: 'participation',
    },
    format: 'csv',
    file_url: 'https://example.com/exports/export-1.csv',
    file_size_bytes: 45678,
    status: 'completed',
    error_message: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'export-2',
    org_id: DEMO_ORG_A_ID,
    user_id: 'user-1',
    report_config: {
      scope: { orgId: DEMO_ORG_A_ID },
      filters: { orgId: DEMO_ORG_A_ID },
      charts: [],
      columns: [],
      domain: 'payments',
    },
    format: 'xlsx',
    file_url: null,
    file_size_bytes: null,
    status: 'processing',
    error_message: null,
    created_at: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
  },
]

export async function getFakeExportHistory(
  orgId: string,
  _userId: string,
  limit: number = 50
): Promise<{ data: ExportHistory[]; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)
  return {
    data: fakeExportHistory.filter((e) => e.org_id === orgId).slice(0, limit),
    error: null,
  }
}

export async function createFakeExportHistory(
  reportConfig: unknown,
  format: 'csv' | 'xlsx' | 'pdf',
  orgId: string,
  userId: string
): Promise<{ data: ExportHistory | null; error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const exportRecord: ExportHistory = {
    id: generateUUID(),
    org_id: orgId,
    user_id: userId,
    report_config: reportConfig as any,
    format,
    file_url: null,
    file_size_bytes: null,
    status: 'processing',
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }

  fakeExportHistory.unshift(exportRecord)

  // Simulate completion after delay
  setTimeout(() => {
    const index = fakeExportHistory.findIndex((e) => e.id === exportRecord.id)
    if (index !== -1) {
      fakeExportHistory[index] = {
        ...fakeExportHistory[index],
        status: 'completed',
        file_url: `https://example.com/exports/${exportRecord.id}.${format}`,
        file_size_bytes: randomInt(10000, 100000),
        completed_at: new Date().toISOString(),
      }
    }
  }, 2000)

  return { data: exportRecord, error: null }
}

export async function updateFakeExportHistory(
  historyId: string,
  updates: Partial<ExportHistory>
): Promise<{ error: Error | null }> {
  await simulateDelay(FAKE_DATA_DELAY_MS)

  const index = fakeExportHistory.findIndex((e) => e.id === historyId)
  if (index === -1) {
    return { error: new Error('Export history not found') }
  }

  fakeExportHistory[index] = {
    ...fakeExportHistory[index],
    ...updates,
  }

  return { error: null }
}
