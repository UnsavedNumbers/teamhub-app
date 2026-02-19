import { SPORT_NAMES, type SportCode } from '@/types/sports'
import type { DemoGeneratedData, DemoOrganization } from '@/types/demoManagement'
import { SPORT_PROFILES } from './sportProfiles'

interface GeneratedProgram {
  id: string
  org_id: string
  sport_id: string
  name: string
  description: string | null
  gender_category: 'coed'
  created_at: string
  updated_at: string
  deleted_at: null
}

interface GeneratedLevel {
  id: string
  org_id: string
  program_id: string
  name: string
  level_type: 'age_based'
  description: string | null
  age_min: number | null
  age_max: number | null
  grade_min: null
  grade_max: null
  skill_min: null
  skill_max: null
  created_at: string
  updated_at: string
  deleted_at: null
}

interface GeneratedTeam {
  id: string
  org_id: string
  program_id: string
  level_id: string
  sport_id: string
  name: string
  max_roster_size: number
  is_active: true
  created_at: string
  updated_at: string
  age_group: string
  gender: 'coed'
  skill_level: 'recreational'
}

interface GeneratedAthlete {
  id: string
  org_id: string
  team_id: string
  family_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  jersey_number: string
}

interface GeneratedGuardian {
  id: string
  org_id: string
  family_id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
}

interface GeneratedEvent {
  id: string
  team_id: string
  season_id: string
  title: string
  type: 'practice' | 'game'
  start_time: string
  end_time: string
  arrival_time: string
  timezone: string
  location: string
  notes: string | null
  uniform_notes: string | null
  equipment_notes: string | null
  weather_dependent: boolean
  external_link: null
  is_cancelled: false
  cancellation_reason: null
  cancelled_at: null
  cancelled_by_user_id: null
  created_by_user_id: null
  created_at: string
  updated_at: string
  team: { id: string; name: string; org_id: string }
  season: { id: string; name: string }
}

interface GeneratedAttendance {
  id: string
  event_id: string
  athlete_id: string
  status: 'going' | 'unknown'
  responded_at: string | null
  responded_by_user_id: string | null
  note: null
  created_at: string
  updated_at: string
  child: { id: string; first_name: string; last_name: string }
}

interface GeneratedPayment {
  id: string
  org_id: string
  fee_assignment_id: string
  amount_cents: number
  currency: 'usd'
  status: 'succeeded'
  stripe_payment_intent_id: string | null
  payment_method: 'card'
  paid_at: string
  refunded_at: null
  notes: null
  created_at: string
  updated_at: string
}

interface GeneratedAnnouncement {
  id: string
  org_id: string
  title: string
  body: string
  created_at: string
}

const FIRST_NAMES = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Casey', 'Riley', 'Parker', 'Avery', 'Quinn', 'Jamie']
const LAST_NAMES = ['Rivera', 'Johnson', 'Lee', 'Davis', 'Patel', 'Garcia', 'Brown', 'Kim', 'Anderson', 'Miller']

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed)
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) & 0xffffffff) / 0x100000000
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function sportCodeToSlug(code: SportCode): string {
  return code.replace(/_/g, '-')
}

function yearNow(): number {
  return new Date().getUTCFullYear()
}

function nowIso(): string {
  return new Date().toISOString()
}

export function generateOrg(demoOrg: DemoOrganization): Record<string, unknown> {
  return {
    id: demoOrg.id,
    name: demoOrg.name,
    slug: slugify(demoOrg.name),
    org_type: demoOrg.org_type ?? 'club',
    status: demoOrg.status === 'active' ? 'active' : 'trial',
    logo_url: null,
    primary_color: 'var(--org-btn-primary-bg, #137fec)',
    secondary_color: '#1e293b',
    timezone: demoOrg.timezone,
    address_line1: null,
    address_line2: null,
    city: demoOrg.city,
    state: demoOrg.state,
    postal_code: null,
    country: demoOrg.country,
    phone: null,
    email: null,
    website: null,
    created_at: demoOrg.created_at,
    updated_at: demoOrg.updated_at,
  }
}

export function generatePrograms(demoOrgId: string, sports: SportCode[]): GeneratedProgram[] {
  const timestamp = nowIso()
  return sports.flatMap((sportCode) => {
    const profile = SPORT_PROFILES[sportCode]
    return profile.programNames.map((programName, index) => ({
      id: `demo-program-${demoOrgId}-${sportCode}-${index + 1}`,
      org_id: demoOrgId,
      sport_id: `demo-sport-${demoOrgId}-${sportCode}`,
      name: programName,
      description: `${SPORT_NAMES[sportCode]} ${programName}`,
      gender_category: 'coed',
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    }))
  })
}

export function generateSeasons(demoOrgId: string, _programs: GeneratedProgram[]): Array<Record<string, unknown>> {
  const year = yearNow()
  const timestamp = nowIso()
  return [
    {
      id: `demo-season-${demoOrgId}-${year}`,
      org_id: demoOrgId,
      name: `Spring ${year}`,
      start_date: `${year}-03-01`,
      end_date: `${year}-06-30`,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]
}

export function generateLevels(demoOrgId: string, programs: GeneratedProgram[]): GeneratedLevel[] {
  const timestamp = nowIso()
  return programs.flatMap((program) => {
    const sportCode = (program.id.split('-').slice(-2, -1)[0] ?? 'soccer') as SportCode
    const profile = SPORT_PROFILES[sportCode]

    return profile.levels.slice(0, 2).map((levelName, index) => {
      const ageBase = 8 + index * 2
      return {
        id: `demo-level-${program.id}-${index + 1}`,
        org_id: demoOrgId,
        program_id: program.id,
        name: levelName,
        level_type: 'age_based',
        description: `${program.name} ${levelName}`,
        age_min: ageBase,
        age_max: ageBase + 2,
        grade_min: null,
        grade_max: null,
        skill_min: null,
        skill_max: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }
    })
  })
}

export function generateTeams(demoOrgId: string, programs: GeneratedProgram[], levels: GeneratedLevel[]): GeneratedTeam[] {
  const timestamp = nowIso()

  return levels.map((level, index) => {
    const program = programs.find((entry) => entry.id === level.program_id)
    const sportCode = (program?.id.split('-').slice(-2, -1)[0] ?? 'soccer') as SportCode
    return {
      id: `demo-team-${demoOrgId}-${index + 1}`,
      org_id: demoOrgId,
      program_id: level.program_id,
      level_id: level.id,
      sport_id: `demo-sport-${demoOrgId}-${sportCode}`,
      name: `${level.name} ${SPORT_NAMES[sportCode]} Squad`,
      max_roster_size: SPORT_PROFILES[sportCode].rosterMax,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
      age_group: level.name,
      gender: 'coed',
      skill_level: 'recreational',
    }
  })
}

export function generateAthletes(demoOrgId: string, teams: GeneratedTeam[], seed: string): GeneratedAthlete[] {
  const random = createRng(seed)
  const year = yearNow()
  const athletes: GeneratedAthlete[] = []
  let athleteNumber = 1

  teams.forEach((team) => {
    const rosterSize = Math.max(6, Math.min(team.max_roster_size, 10 + Math.floor(random() * 3)))
    for (let index = 0; index < rosterSize; index += 1) {
      const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]
      const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]
      const familyId = `demo-family-${demoOrgId}-${athleteNumber}`
      athletes.push({
        id: `demo-athlete-${demoOrgId}-${athleteNumber}`,
        org_id: demoOrgId,
        team_id: team.id,
        family_id: familyId,
        first_name: first,
        last_name: last,
        date_of_birth: `${year - 11}-${String((index % 12) + 1).padStart(2, '0')}-15`,
        jersey_number: String((index % 99) + 1),
      })
      athleteNumber += 1
    }
  })

  return athletes
}

export function generateGuardians(demoOrgId: string, athletes: GeneratedAthlete[]): GeneratedGuardian[] {
  return athletes.map((athlete, index) => ({
    id: `demo-guardian-${demoOrgId}-${index + 1}`,
    org_id: demoOrgId,
    family_id: athlete.family_id,
    user_id: `demo-guardian-user-${demoOrgId}-${index + 1}`,
    first_name: `${athlete.first_name} Parent`,
    last_name: athlete.last_name,
    email: `guardian${index + 1}@${slugify(athlete.last_name)}.demo`,
  }))
}

export function generateEvents(
  demoOrgId: string,
  teams: GeneratedTeam[],
  seasonId: string,
  timezone: string,
): GeneratedEvent[] {
  const timestamp = nowIso()
  const baseDate = new Date()
  baseDate.setUTCHours(0, 0, 0, 0)

  return teams.flatMap((team, index) => {
    const practiceDate = new Date(baseDate)
    practiceDate.setUTCDate(baseDate.getUTCDate() + index + 1)

    const gameDate = new Date(practiceDate)
    gameDate.setUTCDate(practiceDate.getUTCDate() + 2)

    const practiceStart = new Date(practiceDate)
    practiceStart.setUTCHours(22, 0, 0, 0)

    const gameStart = new Date(gameDate)
    gameStart.setUTCHours(18, 0, 0, 0)

    return [
      {
        id: `demo-event-${team.id}-practice`,
        team_id: team.id,
        season_id: seasonId,
        title: `${team.name} Practice`,
        type: 'practice',
        start_time: practiceStart.toISOString(),
        end_time: new Date(practiceStart.getTime() + 90 * 60 * 1000).toISOString(),
        arrival_time: new Date(practiceStart.getTime() - 15 * 60 * 1000).toISOString(),
        timezone,
        location: `${team.name} Practice Field`,
        notes: null,
        uniform_notes: null,
        equipment_notes: null,
        weather_dependent: true,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        team: { id: team.id, name: team.name, org_id: demoOrgId },
        season: { id: seasonId, name: `Spring ${yearNow()}` },
      },
      {
        id: `demo-event-${team.id}-game`,
        team_id: team.id,
        season_id: seasonId,
        title: `${team.name} Game Day`,
        type: 'game',
        start_time: gameStart.toISOString(),
        end_time: new Date(gameStart.getTime() + 120 * 60 * 1000).toISOString(),
        arrival_time: new Date(gameStart.getTime() - 30 * 60 * 1000).toISOString(),
        timezone,
        location: `${team.name} Stadium`,
        notes: null,
        uniform_notes: null,
        equipment_notes: null,
        weather_dependent: false,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        team: { id: team.id, name: team.name, org_id: demoOrgId },
        season: { id: seasonId, name: `Spring ${yearNow()}` },
      },
    ]
  })
}

export function generateAttendance(events: GeneratedEvent[], athletes: GeneratedAthlete[]): GeneratedAttendance[] {
  const timestamp = nowIso()

  return athletes.flatMap((athlete, index) => {
    const event = events.find((entry) => entry.team_id === athlete.team_id)
    if (!event) return []

    return {
      id: `demo-rsvp-${athlete.id}`,
      event_id: event.id,
      athlete_id: athlete.id,
      status: index % 3 === 0 ? 'unknown' : 'going',
      responded_at: index % 3 === 0 ? null : timestamp,
      responded_by_user_id: null,
      note: null,
      created_at: timestamp,
      updated_at: timestamp,
      child: {
        id: athlete.id,
        first_name: athlete.first_name,
        last_name: athlete.last_name,
      },
    }
  })
}

export function generatePayments(demoOrgId: string, athletes: GeneratedAthlete[], seed: string): GeneratedPayment[] {
  const random = createRng(`${seed}-payments`)
  const timestamp = nowIso()

  return athletes.slice(0, 30).map((athlete) => ({
    id: `demo-payment-${athlete.id}`,
    org_id: demoOrgId,
    fee_assignment_id: `demo-fee-assignment-${athlete.id}`,
    amount_cents: 7500 + Math.floor(random() * 5000),
    currency: 'usd',
    status: 'succeeded',
    stripe_payment_intent_id: null,
    payment_method: 'card',
    paid_at: timestamp,
    refunded_at: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  }))
}

export function generateAnnouncements(demoOrgId: string): GeneratedAnnouncement[] {
  const timestamp = nowIso()
  return [
    {
      id: `demo-announcement-${demoOrgId}-1`,
      org_id: demoOrgId,
      title: 'Welcome to your demo workspace',
      body: 'This demo organization contains generated teams, events, and payments.',
      created_at: timestamp,
    },
  ]
}

export function buildDemoGeneratedData(demoOrg: DemoOrganization, demoCode: string): DemoGeneratedData {
  const sports = demoOrg.sports_sponsored
  const organizations = [generateOrg(demoOrg)]

  const sportsData = sports.map((sportCode) => ({
    id: `demo-sport-${demoOrg.id}-${sportCode}`,
    org_id: demoOrg.id,
    name: SPORT_NAMES[sportCode],
    slug: sportCodeToSlug(sportCode),
    icon: 'sports',
    color: 'var(--org-btn-primary-bg, #137fec)',
    created_at: demoOrg.created_at,
    updated_at: demoOrg.updated_at,
    deleted_at: null,
  }))

  const programs = generatePrograms(demoOrg.id, sports)
  const levels = generateLevels(demoOrg.id, programs)
  const teams = generateTeams(demoOrg.id, programs, levels)
  const seasons = generateSeasons(demoOrg.id, programs)
  const activeSeason = String(seasons[0]?.id ?? `demo-season-${demoOrg.id}-${yearNow()}`)

  const teamSeasons = teams.map((team) => ({
    team_id: team.id,
    season_id: activeSeason,
    is_active: true,
    created_at: demoOrg.created_at,
    updated_at: demoOrg.updated_at,
  }))

  const athletes = generateAthletes(demoOrg.id, teams, demoCode)
  const guardians = generateGuardians(demoOrg.id, athletes)
  const events = generateEvents(demoOrg.id, teams, activeSeason, demoOrg.timezone)
  const attendance = generateAttendance(events, athletes)
  const payments = generatePayments(demoOrg.id, athletes, demoCode)
  const announcements = generateAnnouncements(demoOrg.id)

  return {
    demo_org_id: demoOrg.id,
    seed: demoCode,
    generated_at: nowIso(),
    sports,
    organizations,
    sportsData,
    programs: programs as unknown as Array<Record<string, unknown>>,
    levels: levels as unknown as Array<Record<string, unknown>>,
    teams: teams as unknown as Array<Record<string, unknown>>,
    seasons,
    teamSeasons,
    athletes: athletes.map((athlete) => ({ ...athlete })),
    guardians: guardians.map((guardian) => ({ ...guardian })),
    events: events.map((event) => ({ ...event })),
    attendance: attendance.map((entry) => ({ ...entry })),
    payments: payments.map((payment) => ({ ...payment })),
    announcements: announcements.map((announcement) => ({ ...announcement })),
  }
}
