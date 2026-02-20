import type { DemoOrganization } from '@/types/demoManagement'
import type { SportCode } from '@/types/sports'
import { USE_FAKE_DATA, DEMO_ORG_A_ID } from '../config'
import { buildDemoGeneratedData } from './demoDataGenerators'
import { setGeneratedDemoData } from './demoDataStore'
import { fakeOrganizations } from './fakeOrganizations'
import {
  fakeSports,
  fakePrograms,
  fakeLevels,
  fakeTeams,
  fakeSeasons,
  fakeTeamSeasons,
  fakeTeamMembers,
  fakeCoachAssignments,
} from './fakeTeams'
import { fakeEvents, fakeEventLocations, fakeEventRSVPs } from './fakeEvents'
import { fakeFees, fakeFeeAssignments, fakePayments } from './fakePayments'
import { fakeFamilies, fakeChildren, fakeFamilyMembers, fakeOrganizationMembers, fakeUsers } from './fakeUsers'
import { fakeAthleteSportProfiles, generateDemoAthleteSportProfiles } from './fakeAthleteSportProfiles'

function removeWhere<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      items.splice(index, 1)
    }
  }
}

function startsWithDemoId(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('demo-')
}

function clearDemoOrgData(demoOrgId: string): void {
  removeWhere(fakeOrganizations, (item) => item.id === demoOrgId)

  removeWhere(fakeSports, (item) => item.org_id === demoOrgId)
  removeWhere(fakePrograms, (item) => item.org_id === demoOrgId)
  removeWhere(fakeLevels, (item) => item.org_id === demoOrgId)
  removeWhere(fakeTeams, (item) => item.org_id === demoOrgId)
  removeWhere(fakeSeasons, (item) => item.org_id === demoOrgId)

  const demoTeamIds = new Set(fakeTeams.filter((team) => team.org_id === demoOrgId).map((team) => team.id))
  removeWhere(fakeTeamSeasons, (item) => demoTeamIds.has(item.team_id) || String(item.team_id).includes(demoOrgId))
  removeWhere(fakeTeamMembers, (item) => String(item.team_id).includes(demoOrgId) || startsWithDemoId(item.athlete_id))
  removeWhere(fakeCoachAssignments, (item) => String(item.team_id).includes(demoOrgId) || startsWithDemoId(item.user_id))

  removeWhere(fakeEvents, (item) => {
    const orgId = item.team?.org_id
    return orgId === demoOrgId || String(item.team_id).includes(demoOrgId)
  })
  removeWhere(fakeEventLocations, (item) => String(item.event_id).includes(demoOrgId))
  removeWhere(fakeEventRSVPs, (item) => startsWithDemoId(item.athlete_id) || String(item.event_id).includes(demoOrgId))

  removeWhere(fakeFees, (item) => item.org_id === demoOrgId)
  removeWhere(fakeFeeAssignments, (item) => startsWithDemoId(item.athlete_id) || String(item.fee_id).includes(demoOrgId))
  removeWhere(fakePayments, (item) => item.org_id === demoOrgId)

  removeWhere(fakeFamilies, (item) => item.org_id === demoOrgId)
  removeWhere(fakeChildren, (item) => startsWithDemoId(item.id) && String(item.family_id).includes(demoOrgId))
  removeWhere(fakeFamilyMembers, (item) => String(item.family_id).includes(demoOrgId) || startsWithDemoId(item.user_id))
  removeWhere(fakeOrganizationMembers, (item) => item.org_id === demoOrgId && startsWithDemoId(item.user_id))
  removeWhere(fakeUsers, (item) => startsWithDemoId(item.id))
  removeWhere(fakeAthleteSportProfiles, (item) => item.org_id === demoOrgId || startsWithDemoId(item.athlete_id))
}

function appendDemoOrgData(demoOrg: DemoOrganization, demoCode: string): void {
  const data = buildDemoGeneratedData(demoOrg, demoCode)
  const timestamp = data.generated_at

  clearDemoOrgData(demoOrg.id)
  setGeneratedDemoData(data)

  const organization = data.organizations[0]
  fakeOrganizations.push(organization as unknown as (typeof fakeOrganizations)[number])

  fakeSports.push(...(data.sportsData as unknown as typeof fakeSports))
  fakePrograms.push(...(data.programs as unknown as typeof fakePrograms))
  fakeLevels.push(...(data.levels as unknown as typeof fakeLevels))
  fakeTeams.push(...(data.teams as unknown as typeof fakeTeams))
  fakeSeasons.push(...(data.seasons as unknown as typeof fakeSeasons))
  fakeTeamSeasons.push(...(data.teamSeasons as unknown as typeof fakeTeamSeasons))

  const primarySeasonId = String(data.seasons[0]?.id ?? '')
  const generatedTeamMembers = data.athletes.map((athlete, index) => ({
    id: `demo-team-member-${athlete.id}`,
    team_id: String(athlete.team_id),
    season_id: primarySeasonId,
    athlete_id: String(athlete.id),
    role: index % 9 === 0 ? 'captain' : 'player',
    status: 'active',
    jersey_number: String(athlete.jersey_number ?? ''),
    position: null,
    joined_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeTeamMembers.push(...(generatedTeamMembers as unknown as typeof fakeTeamMembers))

  const generatedCoachAssignments = data.teams.map((team, index) => ({
    id: `demo-coach-assignment-${team.id}`,
    team_id: String(team.id),
    season_id: primarySeasonId,
    user_id: `demo-coach-user-${demoOrg.id}-${index + 1}`,
    role: 'head_coach',
    created_at: timestamp,
  }))
  fakeCoachAssignments.push(...(generatedCoachAssignments as unknown as typeof fakeCoachAssignments))

  fakeEvents.push(...(data.events as unknown as typeof fakeEvents))
  const generatedLocations = data.events.map((event, index) => ({
    id: `demo-location-${index + 1}-${demoOrg.id}`,
    event_id: String(event.id),
    venue_name: String(event.location),
    address_line1: demoOrg.city ?? 'Demo City Sports Complex',
    address_line2: null,
    city: demoOrg.city,
    state: demoOrg.state,
    postal_code: null,
    place_id: null,
    country: demoOrg.country,
    latitude: null,
    longitude: null,
    is_tbd: false,
    is_virtual: false,
    virtual_link: null,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeEventLocations.push(...(generatedLocations as unknown as typeof fakeEventLocations))
  fakeEventRSVPs.push(...(data.attendance as unknown as typeof fakeEventRSVPs))

  const baseFees = data.sports.map((sportCode) => ({
    id: `demo-fee-${demoOrg.id}-${sportCode}`,
    org_id: demoOrg.id,
    team_id: null,
    season_id: null,
    title: `${sportCode.replace(/_/g, ' ')} registration fee`,
    description: 'Demo generated registration fee',
    amount_cents: 12000,
    currency: 'usd',
    due_date: `${new Date().getUTCFullYear()}-12-31`,
    status: 'active',
    allow_partial: true,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeFees.push(...(baseFees as unknown as typeof fakeFees))

  const feeAssignments = data.athletes.slice(0, 50).map((athlete, index) => ({
    id: `demo-fee-assignment-${athlete.id}`,
    fee_id: baseFees[index % Math.max(baseFees.length, 1)]?.id ?? `demo-fee-${demoOrg.id}`,
    athlete_id: String(athlete.id),
    status: 'paid',
    amount_due_cents: 12000,
    amount_paid_cents: 12000,
    discount_cents: 0,
    discount_reason: null,
    waived_at: null,
    waived_reason: null,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeFeeAssignments.push(...(feeAssignments as unknown as typeof fakeFeeAssignments))
  fakePayments.push(...(data.payments as unknown as typeof fakePayments))

  // Generate sport profiles for demo athletes
  const generatedSportProfiles = generateDemoAthleteSportProfiles(
    data.athletes as Array<{ id: string; team_id: string }>,
    data.teams as Array<{ id: string; sport_id: string }>,
    data.sportsData as Array<{ id: string; slug: string }>,
    demoOrg.id,
    demoCode
  )
  fakeAthleteSportProfiles.push(...generatedSportProfiles)

  const familyById = new Map<string, { familyId: string; athlete: (typeof data.athletes)[number] }>()
  data.athletes.forEach((athlete) => {
    if (!familyById.has(String(athlete.family_id))) {
      familyById.set(String(athlete.family_id), { familyId: String(athlete.family_id), athlete })
    }
  })

  const families = Array.from(familyById.values()).map(({ familyId, athlete }) => ({
    id: familyId,
    name: `${athlete.last_name} Family`,
    created_by_user_id: `demo-guardian-user-${familyId}`,
    org_id: demoOrg.id,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeFamilies.push(...(families as unknown as typeof fakeFamilies))

  const children = data.athletes.map((athlete, index) => ({
    id: String(athlete.id),
    family_id: String(athlete.family_id),
    first_name: String(athlete.first_name),
    last_name: String(athlete.last_name),
    date_of_birth: String(athlete.date_of_birth),
    gender: index % 2 === 0 ? 'female' : 'male',
    jersey_number: String(athlete.jersey_number),
    medical_notes: null,
    allergies: null,
    emergency_contact_name: `${athlete.first_name} Parent`,
    emergency_contact_phone: null,
    photo_url: null,
    height_cm: null,
    weight_kg: null,
    shoe_size_value: null,
    shoe_size_system: null,
    shoe_width: null,
    tshirt_size: null,
    shorts_size: null,
    dominant_hand: null,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  fakeChildren.push(...(children as unknown as typeof fakeChildren))

  const familyMembers = families.map((family, index) => ({
    id: `demo-family-member-${family.id}`,
    family_id: family.id,
    user_id: `demo-user-${demoOrg.id}-${index + 1}`,
    role: 'owner',
    permissions: ['rsvp', 'payments', 'edit_children'],
    created_at: timestamp,
  }))
  fakeFamilyMembers.push(...(familyMembers as unknown as typeof fakeFamilyMembers))

  familyMembers.forEach((member) => {
    fakeUsers.push({
      id: member.user_id,
      email: `${member.user_id}@demo.local`,
      phone: null,
      display_name: member.user_id,
      created_at: timestamp,
      updated_at: timestamp,
    })

    fakeOrganizationMembers.push({
      id: `demo-org-member-${member.user_id}`,
      org_id: demoOrg.id,
      user_id: member.user_id,
      roles: ['parent'],
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
    })
  })
}

export async function generateDemoData(demoOrg: DemoOrganization, sports: SportCode[], demoCode: string): Promise<void> {
  // When USE_FAKE_DATA is true, use DEMO_ORG_A_ID so generated data matches static fake data
  const sourceOrg: DemoOrganization = {
    ...demoOrg,
    id: USE_FAKE_DATA ? DEMO_ORG_A_ID : demoOrg.id,
    sports_sponsored: sports,
  }

  appendDemoOrgData(sourceOrg, demoCode)
}
