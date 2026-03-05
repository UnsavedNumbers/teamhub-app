import {
  TicketSaleStatus,
  TicketSeatingMode,
  TicketedEvent,
  TicketType,
  TicketingProgram,
  TicketingSeason,
  TicketingVenue,
} from '@/types/ticketing'
import { DEMO_ORG_A_ID, DEMO_ORG_B_ID } from '../config'
import { DEMO_TICKETING_EVENT_IMAGES } from '@/utils/demoImagePlaceholders'
import { DEMO_RESERVED_SEAT_MAP_ID } from './ticketingFakeConstants'

type FakeTicketType = {
  id: string
  name: string
  capacity_total: number
  capacity_remaining: number
  price_cents: number
  is_active?: boolean
  seating_mode?: TicketSeatingMode
  seat_map_id?: string | null
}

type TicketingEventWithDerived = TicketedEvent & {
  ticket_types?: FakeTicketType[]
}

const programs: TicketingProgram[] = [
  { id: 'prog-soccer', org_id: DEMO_ORG_A_ID, name: 'Premier Soccer', slug: 'premier-soccer', sport: 'soccer', color: '#2563eb', is_active: true },
  { id: 'prog-basketball', org_id: DEMO_ORG_A_ID, name: 'Elite Basketball', slug: 'elite-basketball', sport: 'basketball', color: '#f97316', is_active: true },
  { id: 'prog-baseball', org_id: DEMO_ORG_A_ID, name: 'Club Baseball', slug: 'club-baseball', sport: 'baseball', color: '#16a34a', is_active: true },
  { id: 'prog-cheer', org_id: DEMO_ORG_A_ID, name: 'Cheer & Spirit', slug: 'cheer-spirit', sport: 'cheer', color: '#8b5cf6', is_active: true },
]

const seasons: TicketingSeason[] = [
  { id: 'season-spring-current', org_id: DEMO_ORG_A_ID, program_id: 'prog-soccer', name: 'Spring Season', slug: 'spring-season', start_date: '2026-03-01', end_date: '2026-06-30', is_active: true },
  { id: 'season-summer-current', org_id: DEMO_ORG_A_ID, program_id: 'prog-basketball', name: 'Summer Showcase', slug: 'summer-showcase', start_date: '2026-06-01', end_date: '2026-08-31', is_active: true },
  { id: 'season-fall-current', org_id: DEMO_ORG_A_ID, program_id: 'prog-baseball', name: 'Fall Series', slug: 'fall-series', start_date: '2026-09-01', end_date: '2026-11-30', is_active: true },
  { id: 'season-winter-current', org_id: DEMO_ORG_A_ID, program_id: 'prog-cheer', name: 'Winter Invitational', slug: 'winter-invitational', start_date: '2026-12-01', end_date: '2027-02-28', is_active: true },
]

const venues: TicketingVenue[] = [
  { id: 'venue-sac-riverside', org_id: DEMO_ORG_A_ID, name: 'Riverside Sports Complex', address_line1: '1234 Athletic Way', city: 'Sacramento', state: 'CA', postal_code: '95814', country: 'US', latitude: 38.58157, longitude: -121.4944, maps_url: 'https://www.google.com/maps?q=38.58157,-121.4944', capacity: 6200 },
  { id: 'venue-sac-lincoln', org_id: DEMO_ORG_A_ID, name: 'Lincoln High School Stadium', address_line1: '5678 Education Blvd', city: 'Sacramento', state: 'CA', postal_code: '95822', country: 'US', latitude: 38.51896, longitude: -121.49324, maps_url: 'https://www.google.com/maps?q=38.51896,-121.49324', capacity: 3500 },
  { id: 'venue-oakland-golden', org_id: DEMO_ORG_A_ID, name: 'Golden State Arena', address_line1: '9012 Championship Dr', city: 'Oakland', state: 'CA', postal_code: '94612', country: 'US', latitude: 37.80436, longitude: -122.27111, maps_url: 'https://www.google.com/maps?q=37.80436,-122.27111', capacity: 14000 },
  { id: 'venue-la-expo', org_id: DEMO_ORG_A_ID, name: 'Exposition Park Field', address_line1: '700 Exposition Park Dr', city: 'Los Angeles', state: 'CA', postal_code: '90037', country: 'US', latitude: 34.01573, longitude: -118.28618, maps_url: 'https://www.google.com/maps?q=34.01573,-118.28618', capacity: 4800 },
  { id: 'venue-san-diego-bay', org_id: DEMO_ORG_A_ID, name: 'Bayfront Athletic Grounds', address_line1: '180 Harbor Plaza', city: 'San Diego', state: 'CA', postal_code: '92101', country: 'US', latitude: 32.71574, longitude: -117.16109, maps_url: 'https://www.google.com/maps?q=32.71574,-117.16109', capacity: 2900 },
  { id: 'venue-phx-desert', org_id: DEMO_ORG_A_ID, name: 'Desert Sun Sports Park', address_line1: '2120 Camelback Rd', city: 'Phoenix', state: 'AZ', postal_code: '85016', country: 'US', latitude: 33.50808, longitude: -112.07328, maps_url: 'https://www.google.com/maps?q=33.50808,-112.07328', capacity: 5300 },
  { id: 'venue-denver-foothills', org_id: DEMO_ORG_A_ID, name: 'Foothills Performance Center', address_line1: '4550 Mile High Dr', city: 'Denver', state: 'CO', postal_code: '80202', country: 'US', latitude: 39.73924, longitude: -104.99025, maps_url: 'https://www.google.com/maps?q=39.73924,-104.99025', capacity: 4100 },
  { id: 'venue-austin-longhorn', org_id: DEMO_ORG_A_ID, name: 'Longhorn Youth Stadium', address_line1: '1500 Congress Ave', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US', latitude: 30.26715, longitude: -97.74306, maps_url: 'https://www.google.com/maps?q=30.26715,-97.74306', capacity: 7600 },
  { id: 'venue-dallas-civic', org_id: DEMO_ORG_A_ID, name: 'Dallas Civic Fieldhouse', address_line1: '2400 Victory Park Ln', city: 'Dallas', state: 'TX', postal_code: '75219', country: 'US', latitude: 32.77666, longitude: -96.79699, maps_url: 'https://www.google.com/maps?q=32.77666,-96.79699', capacity: 8300 },
  { id: 'venue-houston-legacy', org_id: DEMO_ORG_A_ID, name: 'Legacy Sports Dome', address_line1: '990 Champions Way', city: 'Houston', state: 'TX', postal_code: '77002', country: 'US', latitude: 29.76043, longitude: -95.3698, maps_url: 'https://www.google.com/maps?q=29.76043,-95.3698', capacity: 9100 },
  { id: 'venue-atlanta-peachtree', org_id: DEMO_ORG_A_ID, name: 'Peachtree Athletic Complex', address_line1: '300 Peachtree Center Ave', city: 'Atlanta', state: 'GA', postal_code: '30303', country: 'US', latitude: 33.74899, longitude: -84.39026, maps_url: 'https://www.google.com/maps?q=33.74899,-84.39026', capacity: 5600 },
  { id: 'venue-charlotte-uptown', org_id: DEMO_ORG_A_ID, name: 'Uptown Family Sports Center', address_line1: '610 Trade St', city: 'Charlotte', state: 'NC', postal_code: '28202', country: 'US', latitude: 35.22709, longitude: -80.84313, maps_url: 'https://www.google.com/maps?q=35.22709,-80.84313', capacity: 4700 },
  { id: 'venue-orlando-lake', org_id: DEMO_ORG_A_ID, name: 'Lake Eola Recreation Grounds', address_line1: '1200 E Central Blvd', city: 'Orlando', state: 'FL', postal_code: '32801', country: 'US', latitude: 28.53834, longitude: -81.37924, maps_url: 'https://www.google.com/maps?q=28.53834,-81.37924', capacity: 3600 },
  { id: 'venue-tampa-bayside', org_id: DEMO_ORG_A_ID, name: 'Bayside Championship Field', address_line1: '801 Water St', city: 'Tampa', state: 'FL', postal_code: '33602', country: 'US', latitude: 27.95058, longitude: -82.45718, maps_url: 'https://www.google.com/maps?q=27.95058,-82.45718', capacity: 5200 },
  { id: 'venue-portland-rose', org_id: DEMO_ORG_A_ID, name: 'Rose City Sports Pavilion', address_line1: '4200 Broadway St', city: 'Portland', state: 'OR', postal_code: '97232', country: 'US', latitude: 45.51523, longitude: -122.67838, maps_url: 'https://www.google.com/maps?q=45.51523,-122.67838', capacity: 3300 },
  { id: 'venue-seattle-rainier', org_id: DEMO_ORG_A_ID, name: 'Rainier Valley Arena', address_line1: '2200 6th Ave', city: 'Seattle', state: 'WA', postal_code: '98121', country: 'US', latitude: 47.60621, longitude: -122.33207, maps_url: 'https://www.google.com/maps?q=47.60621,-122.33207', capacity: 6900 },
]

const TITLE_PREFIXES = [
  'Spring Championship Tournament',
  'Youth Soccer League Finals',
  'Summer Basketball Camp Showcase',
  'Regional Track & Field Meet',
  'Back to School Sports Festival',
  'Holiday Hoops Classic',
  'Community Kickoff Cup',
  'Saturday Rivalry Series',
  'Youth Development Showcase',
  'Senior Night Celebration',
]

const OPPONENTS = [
  'Cedar Park Lions',
  'San Antonio Heat',
  'Bay Area Storm',
  'Capital City Falcons',
  'Valley Thunder',
  'Northside Rangers',
  'Metro United',
  'South Coast Chargers',
  'Central Tigers',
  'Pioneer Eagles',
]

const COVER_IMAGES = DEMO_TICKETING_EVENT_IMAGES.length > 0
  ? DEMO_TICKETING_EVENT_IMAGES
  : ['/images/sports/default/hero-bg.webp']

const EVENT_TYPES: TicketedEvent['event_type'][] = ['game', 'tournament', 'fundraiser', 'social_event', 'other']
export const DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID = 'evt-social-family-night-001'
export const DEMO_SOCIAL_RESERVED_CALENDAR_EVENT_ID = 'event-ticketing-social-family-night-001'

const DEFAULT_TIMEZONE = 'America/Chicago'
const ORG_B_EVENT_ID_PREFIX = 'orgb-event-'
const ORG_B_CALENDAR_EVENT_ID_PREFIX = 'orgb-calendar-'
const ORG_B_TICKET_TYPE_ID_PREFIX = 'orgb-ticket-type-'

function toOrgBEventId(baseEventId: string): string {
  return `${ORG_B_EVENT_ID_PREFIX}${baseEventId}`
}

function toOrgBCalendarEventId(baseEventId: string): string {
  return `${ORG_B_CALENDAR_EVENT_ID_PREFIX}${baseEventId}`
}

function toOrgBTicketTypeId(baseTicketTypeId: string): string {
  return `${ORG_B_TICKET_TYPE_ID_PREFIX}${baseTicketTypeId}`
}

function fromOrgBEventId(eventId: string): string | null {
  if (!eventId.startsWith(ORG_B_EVENT_ID_PREFIX)) return null
  return eventId.slice(ORG_B_EVENT_ID_PREFIX.length)
}

function fromOrgBCalendarEventId(calendarEventId: string): string | null {
  if (!calendarEventId.startsWith(ORG_B_CALENDAR_EVENT_ID_PREFIX)) return null
  return calendarEventId.slice(ORG_B_CALENDAR_EVENT_ID_PREFIX.length)
}

function fromOrgBTicketTypeId(ticketTypeId: string): string | null {
  if (!ticketTypeId.startsWith(ORG_B_TICKET_TYPE_ID_PREFIX)) return null
  return ticketTypeId.slice(ORG_B_TICKET_TYPE_ID_PREFIX.length)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toIsoFromNow(daysOffset: number, hour: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysOffset)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

function pick<T>(list: readonly T[], index: number): T {
  return list[Math.abs(index) % list.length]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildDescription(title: string, venueName: string, city: string, state: string, index: number): string {
  const paragraphOne = `${title} brings together youth athletes, families, and community supporters for a full day of competition and team pride. Expect a fast-paced schedule, pregame warmups, and in-venue entertainment between sessions.`
  const paragraphTwo = `Gates open 90 minutes before start time at ${venueName} in ${city}, ${state}. On-site parking, concessions, and family seating are available, and event staff will guide check-in for all ticket tiers including VIP and family packages.`
  const paragraphThree = index % 2 === 0
    ? 'Fans are encouraged to arrive early, wear team colors, and review venue policies before entry. Premium ticket holders receive expedited check-in, while general admission includes full access to all main competition areas.'
    : 'Please bring digital tickets, a refillable water bottle, and weather-ready gear for outdoor segments. Community ticket blocks are available for selected sessions to keep the event accessible for local families.'

  return `${paragraphOne}\n\n${paragraphTwo}\n\n${paragraphThree}`
}

function computeSoldRatio(status: TicketedEvent['status'], visibility: TicketedEvent['visibility'] | null, index: number): number {
  if (status === 'draft') return 0
  if (status === 'cancelled') return [0.22, 0.34, 0.41, 0.57, 0.18][index % 5]
  if (status === 'completed') return [0.78, 0.84, 0.91, 1, 0.87][index % 5]
  if (visibility === 'hidden') return [0, 0.28, 0.44, 0.5, 0][index % 5]
  return [0, 0.3, 0.46, 0.79, 0.88, 1, 0.34, 0.82][index % 8]
}

function createTicketTypes(eventId: string, index: number, salesStartAt: string | null, salesEndAt: string | null, soldRatio: number) {
  const generalCapacity = 260 + (index % 7) * 40
  const vipCapacity = 40 + (index % 5) * 8
  const familyCapacity = 90 + (index % 6) * 12
  const earlyBirdCapacity = 100 + (index % 4) * 20
  const atDoorCapacity = 70 + (index % 5) * 10

  const types: FakeTicketType[] = [
    {
      id: `${eventId}-tt-ga`,
      name: 'General Admission',
      capacity_total: generalCapacity,
      capacity_remaining: generalCapacity,
      price_cents: 1200 + (index % 7) * 150,
      is_active: true,
    },
    {
      id: `${eventId}-tt-vip`,
      name: 'VIP Access',
      capacity_total: vipCapacity,
      capacity_remaining: vipCapacity,
      price_cents: 6500 + (index % 8) * 900,
      is_active: true,
    },
    {
      id: `${eventId}-tt-family`,
      name: 'Family Pack',
      capacity_total: familyCapacity,
      capacity_remaining: familyCapacity,
      price_cents: 4500 + (index % 6) * 450,
      is_active: true,
    },
    index % 2 === 0
      ? {
        id: `${eventId}-tt-early`,
        name: 'Early Bird',
        capacity_total: earlyBirdCapacity,
        capacity_remaining: earlyBirdCapacity,
        price_cents: 1000 + (index % 5) * 120,
        is_active: true,
      }
      : {
        id: `${eventId}-tt-door`,
        name: 'At The Door',
        capacity_total: atDoorCapacity,
        capacity_remaining: atDoorCapacity,
        price_cents: 2200 + (index % 5) * 180,
        is_active: true,
      },
  ]

  if (index % 10 === 0) {
    types.push({
      id: `${eventId}-tt-community`,
      name: 'Community Access',
      capacity_total: 120,
      capacity_remaining: 120,
      price_cents: 0,
      is_active: true,
    })
  } else if (index % 7 === 0) {
    types.push({
      id: `${eventId}-tt-inactive`,
      name: 'Student Rush',
      capacity_total: 80,
      capacity_remaining: 80,
      price_cents: 900,
      is_active: false,
    })
  }

  const activeTypes = types.filter((ticketType) => ticketType.is_active !== false)
  const totalCapacity = activeTypes.reduce((sum, ticketType) => sum + ticketType.capacity_total, 0)
  let remainingToSell = Math.round(totalCapacity * clamp(soldRatio, 0, 1))
  const weights = [0.56, 0.1, 0.2, 0.1, 0.04]

  activeTypes.forEach((ticketType, activeIndex) => {
    if (remainingToSell <= 0) return
    const projected = activeIndex === activeTypes.length - 1
      ? remainingToSell
      : Math.round(totalCapacity * clamp(soldRatio, 0, 1) * weights[Math.min(activeIndex, weights.length - 1)])
    const sold = clamp(projected, 0, Math.min(ticketType.capacity_total, remainingToSell))
    ticketType.capacity_remaining = ticketType.capacity_total - sold
    remainingToSell -= sold
  })

  if (index % 8 === 0) {
    const soldOutTarget = activeTypes.find((ticketType) => ticketType.name === 'Early Bird') || activeTypes[1]
    if (soldOutTarget) soldOutTarget.capacity_remaining = 0
  }

  return {
    ticketTypes: types,
    sales_start_at: salesStartAt,
    sales_end_at: salesEndAt,
  }
}

function buildEvent(
  index: number,
  status: TicketedEvent['status'],
  visibility: TicketedEvent['visibility'] | null,
  startsAt: string,
  endsAt: string,
): { event: TicketingEventWithDerived; ticketsSold: number; revenueCents: number } {
  const eventId = `evt-${String(index + 1).padStart(3, '0')}`
  const venue = pick(venues, index)
  const program = pick(programs, index)
  const season = pick(seasons.filter((entry) => entry.program_id === program.id), index)
  const title = `${pick(TITLE_PREFIXES, index)} ${pad((index % 12) + 1)}`
  const description = `${title} at ${venue.name}`

  const salesStartAt = status === 'draft' && index % 3 === 0 ? null : toIsoFromNow(-35 + (index % 18), 12)
  const salesEndAt = status === 'draft' ? null : toIsoFromNow(Math.max(-2, Math.round((new Date(startsAt).getTime() - Date.now()) / 86400000) - 1), 18)
  const soldRatio = computeSoldRatio(status, visibility, index)
  const ticketing = createTicketTypes(eventId, index, salesStartAt, salesEndAt, soldRatio)

  const createdAt = toIsoFromNow(-120 + (index % 60), 9)
  const updatedAt = toIsoFromNow(-10 + (index % 9), 14)

  const event: TicketingEventWithDerived = {
    id: eventId,
    org_id: DEMO_ORG_A_ID,
    program_id: program.id,
    season_id: season?.id ?? null,
    venue_id: venue.id,
    opponent: pick(OPPONENTS, index),
    is_home: index % 3 !== 0,
    event_type: pick(EVENT_TYPES, index),
    title,
    description,
    event_description: buildDescription(title, venue.name || 'the venue', venue.city || 'the city', venue.state || 'the state', index),
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: DEFAULT_TIMEZONE,
    venue_name: venue.name ?? null,
    venue_city: venue.city ?? null,
    venue_state: venue.state ?? null,
    venue_postal_code: venue.postal_code ?? null,
    venue_address_line1: venue.address_line1 ?? null,
    venue_address_line2: venue.address_line2 ?? null,
    venue_country: venue.country ?? 'US',
    venue_is_virtual: false,
    venue_virtual_link: null,
    sales_start_at: ticketing.sales_start_at,
    sales_end_at: ticketing.sales_end_at,
    cover_image_path: pick(COVER_IMAGES, index),
    ticket_banner_url: pick(COVER_IMAGES, index + 2),
    status,
    visibility,
    created_at: createdAt,
    updated_at: updatedAt,
    team_id: null,
    event_id: `event-${eventId}`,
    ticket_types: ticketing.ticketTypes,
  }

  const ticketsSold = ticketing.ticketTypes.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold
  }, 0)

  const revenueCents = ticketing.ticketTypes.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold * ticketType.price_cents
  }, 0)

  return { event, ticketsSold, revenueCents }
}

function createCuratedSocialReservedEvent(): { event: TicketingEventWithDerived; ticketsSold: number; revenueCents: number } {
  const venue = venues.find((entry) => entry.id === 'venue-sac-riverside') ?? venues[0]
  const program = programs.find((entry) => entry.id === 'prog-soccer') ?? programs[0]
  const season = seasons.find((entry) => entry.id === 'season-spring-current') ?? seasons[0]

  const startsAt = toIsoFromNow(11, 18)
  const endsAt = toIsoFromNow(11, 22)
  const createdAt = toIsoFromNow(-30, 10)
  const updatedAt = toIsoFromNow(-1, 15)
  const salesStartAt = toIsoFromNow(-21, 14)
  const salesEndAt = toIsoFromNow(11, 17)

  const ticketTypes: FakeTicketType[] = [
    {
      id: `${DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID}-tt-vip-lounge`,
      name: 'VIP Lounge Table',
      capacity_total: 48,
      capacity_remaining: 16,
      price_cents: 14500,
      is_active: true,
      seating_mode: 'reserved_seating',
      seat_map_id: DEMO_RESERVED_SEAT_MAP_ID,
    },
    {
      id: `${DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID}-tt-club-lower`,
      name: 'Club Lower Bowl',
      capacity_total: 180,
      capacity_remaining: 72,
      price_cents: 6200,
      is_active: true,
      seating_mode: 'reserved_seating',
      seat_map_id: DEMO_RESERVED_SEAT_MAP_ID,
    },
    {
      id: `${DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID}-tt-family-endzone`,
      name: 'Family Endzone',
      capacity_total: 220,
      capacity_remaining: 110,
      price_cents: 3400,
      is_active: true,
      seating_mode: 'reserved_seating',
      seat_map_id: DEMO_RESERVED_SEAT_MAP_ID,
    },
  ]

  const event: TicketingEventWithDerived = {
    id: DEMO_SOCIAL_RESERVED_TICKETED_EVENT_ID,
    org_id: DEMO_ORG_A_ID,
    program_id: program.id,
    season_id: season?.id ?? null,
    venue_id: venue?.id ?? null,
    opponent: null,
    is_home: true,
    event_type: 'social_event',
    title: 'Family Night on the Field',
    description: 'Community social event with reserved seating packages and live entertainment.',
    event_description:
      'Celebrate the season with a family social night featuring player introductions, live music, and a community awards ceremony. Reserved seating options include VIP lounge tables, club lower bowl seats, and family endzone seating with quick concession access.',
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: DEFAULT_TIMEZONE,
    venue_name: venue?.name ?? null,
    venue_city: venue?.city ?? null,
    venue_state: venue?.state ?? null,
    venue_postal_code: venue?.postal_code ?? null,
    venue_address_line1: venue?.address_line1 ?? null,
    venue_address_line2: venue?.address_line2 ?? null,
    venue_country: venue?.country ?? 'US',
    venue_is_virtual: false,
    venue_virtual_link: null,
    sales_start_at: salesStartAt,
    sales_end_at: salesEndAt,
    cover_image_path: COVER_IMAGES[0] ?? null,
    ticket_banner_url: COVER_IMAGES[1] ?? COVER_IMAGES[0] ?? null,
    status: 'published',
    visibility: 'visible',
    created_at: createdAt,
    updated_at: updatedAt,
    team_id: null,
    event_id: DEMO_SOCIAL_RESERVED_CALENDAR_EVENT_ID,
    ticket_types: ticketTypes,
  }

  const ticketsSold = ticketTypes.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold
  }, 0)

  const revenueCents = ticketTypes.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold * ticketType.price_cents
  }, 0)

  return { event, ticketsSold, revenueCents }
}

function seedTicketingCatalog() {
  const seededEvents: TicketingEventWithDerived[] = []
  const seededOrdersByEvent: Record<string, { ticketsSold: number; revenueCents: number }> = {}

  const curatedSocial = createCuratedSocialReservedEvent()
  seededEvents.push(curatedSocial.event)
  seededOrdersByEvent[curatedSocial.event.id] = {
    ticketsSold: curatedSocial.ticketsSold,
    revenueCents: curatedSocial.revenueCents,
  }

  let cursor = 0

  for (let i = 0; i < 10; i += 1) {
    const startsAt = toIsoFromNow(18 + i * 5, 18)
    const endsAt = toIsoFromNow(18 + i * 5, 21)
    const seeded = buildEvent(cursor, 'draft', 'hidden', startsAt, endsAt)
    seededEvents.push(seeded.event)
    seededOrdersByEvent[seeded.event.id] = { ticketsSold: seeded.ticketsSold, revenueCents: seeded.revenueCents }
    cursor += 1
  }

  for (let i = 0; i < 10; i += 1) {
    const startsAt = toIsoFromNow(6 + i * 4, 19)
    const endsAt = toIsoFromNow(6 + i * 4, 22)
    const seeded = buildEvent(cursor, 'published', 'hidden', startsAt, endsAt)
    seededEvents.push(seeded.event)
    seededOrdersByEvent[seeded.event.id] = { ticketsSold: seeded.ticketsSold, revenueCents: seeded.revenueCents }
    cursor += 1
  }

  for (let i = 0; i < 20; i += 1) {
    const startsAt = toIsoFromNow(2 + i * 3, 18)
    const endsAt = toIsoFromNow(2 + i * 3, 21)
    const seeded = buildEvent(cursor, 'published', 'visible', startsAt, endsAt)
    seededEvents.push(seeded.event)
    seededOrdersByEvent[seeded.event.id] = { ticketsSold: seeded.ticketsSold, revenueCents: seeded.revenueCents }
    cursor += 1
  }

  // Completed events - use future dates but mark as completed status
  for (let i = 0; i < 15; i += 1) {
    const startsAt = toIsoFromNow(30 + i * 9, 17)
    const endsAt = toIsoFromNow(30 + i * 9, 20)
    const seeded = buildEvent(cursor, 'completed', 'hidden', startsAt, endsAt)
    seededEvents.push(seeded.event)
    seededOrdersByEvent[seeded.event.id] = { ticketsSold: seeded.ticketsSold, revenueCents: seeded.revenueCents }
    cursor += 1
  }

  // Cancelled events - use future dates
  for (let i = 0; i < 5; i += 1) {
    const startsAt = toIsoFromNow(10 + i * 15, 18)
    const endsAt = toIsoFromNow(10 + i * 15, 21)
    const seeded = buildEvent(cursor, 'cancelled', 'hidden', startsAt, endsAt)
    seededEvents.push(seeded.event)
    seededOrdersByEvent[seeded.event.id] = { ticketsSold: seeded.ticketsSold, revenueCents: seeded.revenueCents }
    cursor += 1
  }

  return { seededEvents, seededOrdersByEvent }
}

const seededCatalog = seedTicketingCatalog()

let events: TicketingEventWithDerived[] = seededCatalog.seededEvents
const fakeOrdersByEvent: Record<string, { ticketsSold: number; revenueCents: number }> = seededCatalog.seededOrdersByEvent

function mapTicketType(
  event: TicketingEventWithDerived,
  type: NonNullable<TicketingEventWithDerived['ticket_types']>[number],
  index: number,
): TicketType {
  return {
    id: type.id,
    org_id: event.org_id,
    ticketed_event_id: event.id,
    name: type.name,
    description: null,
    price_cents: type.price_cents,
    currency: 'USD',
    capacity_total: type.capacity_total ?? null,
    capacity_remaining: type.capacity_remaining ?? null,
    sales_start_at: event.sales_start_at ?? null,
    sales_end_at: event.sales_end_at ?? null,
    seating_mode: type.seating_mode ?? 'general_admission',
    seat_map_id: type.seat_map_id ?? null,
    sort_order: index,
    is_active: type.is_active !== false,
    created_at: event.created_at,
    updated_at: event.updated_at,
  }
}

function computeSaleStatus(event: TicketingEventWithDerived, ticketsSold: number, capacity: number | null): TicketSaleStatus {
  const now = new Date()
  if (event.status !== 'published') return 'off'
  const start = event.sales_start_at ? new Date(event.sales_start_at) : null
  const end = event.sales_end_at ? new Date(event.sales_end_at) : null
  if (start && start > now) return 'scheduled'
  if (end && end < now) return 'ended'
  if (capacity && ticketsSold >= capacity) return 'sold_out'
  return 'on_sale'
}

function deriveEvent(event: TicketingEventWithDerived): TicketedEvent {
  const capacityTotal = (event.ticket_types || []).reduce((sum, ticketType) => sum + (ticketType.capacity_total ?? 0), 0)
  const capacityRemaining = (event.ticket_types || []).reduce((sum, ticketType) => sum + (ticketType.capacity_remaining ?? 0), 0)
  const orderMetrics = fakeOrdersByEvent[event.id] || { ticketsSold: capacityTotal - capacityRemaining, revenueCents: 0 }
  const ticketsSold = orderMetrics.ticketsSold ?? 0
  const sale_status = computeSaleStatus(event, ticketsSold, capacityTotal || null)
  const program = programs.find((entry) => entry.id === event.program_id && entry.org_id === event.org_id)
    || programs.find((entry) => entry.id === event.program_id)
    || null
  const season = seasons.find((entry) => entry.id === event.season_id && entry.org_id === event.org_id)
    || seasons.find((entry) => entry.id === event.season_id)
    || null
  const venue = venues.find((entry) => entry.id === event.venue_id && entry.org_id === event.org_id)
    || venues.find((entry) => entry.id === event.venue_id)
    || null

  return {
    ...event,
    program,
    season,
    venue,
    capacity_total: capacityTotal,
    capacity_remaining: capacityRemaining,
    tickets_sold: ticketsSold,
    revenue_cents: orderMetrics.revenueCents,
    ticket_progress_pct: capacityTotal ? Math.round((ticketsSold / capacityTotal) * 100) : null,
    sale_status,
  }
}

function recalculateMetricsForEvent(eventId: string): void {
  const event = events.find((entry) => entry.id === eventId)
  if (!event?.ticket_types?.length) {
    fakeOrdersByEvent[eventId] = { ticketsSold: 0, revenueCents: 0 }
    return
  }

  const ticketsSold = event.ticket_types.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold
  }, 0)

  const revenueCents = event.ticket_types.reduce((sum, ticketType) => {
    const sold = Math.max(0, ticketType.capacity_total - ticketType.capacity_remaining)
    return sum + sold * ticketType.price_cents
  }, 0)

  fakeOrdersByEvent[eventId] = { ticketsSold, revenueCents }
}

function shiftIsoByDays(iso: string | null | undefined, dayOffset: number): string | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  parsed.setUTCDate(parsed.getUTCDate() + dayOffset)
  return parsed.toISOString()
}

function cloneProgramForOrg(program: TicketingProgram, orgId: string): TicketingProgram {
  if (orgId === DEMO_ORG_A_ID) return program
  return {
    ...program,
    org_id: orgId,
    name: program.name.replace('Premier', 'Varsity').replace('Elite', 'Cardinal'),
    slug: `${program.slug}-${orgId.replace(/[^a-z0-9-]/gi, '').toLowerCase()}`,
  }
}

function cloneSeasonForOrg(season: TicketingSeason, orgId: string): TicketingSeason {
  if (orgId === DEMO_ORG_A_ID) return season
  return {
    ...season,
    org_id: orgId,
  }
}

function cloneVenueForOrg(venue: TicketingVenue, orgId: string): TicketingVenue {
  if (orgId === DEMO_ORG_A_ID) return venue
  return {
    ...venue,
    org_id: orgId,
    name: venue.name.replace('Riverside', 'Lincoln').replace('Youth', 'School'),
    city: 'Lincoln',
    state: 'CA',
    postal_code: '95648',
  }
}

function cloneOrgBEventFromBase(baseEvent: TicketingEventWithDerived, index: number): TicketingEventWithDerived {
  const shiftedStart = shiftIsoByDays(baseEvent.starts_at, 1 + (index % 3)) || baseEvent.starts_at
  const shiftedEnd = shiftIsoByDays(baseEvent.ends_at, 1 + (index % 3)) || baseEvent.ends_at
  const shiftedSalesStart = shiftIsoByDays(baseEvent.sales_start_at, 1 + (index % 2))
  const shiftedSalesEnd = shiftIsoByDays(baseEvent.sales_end_at, 1 + (index % 2))

  return {
    ...baseEvent,
    id: toOrgBEventId(baseEvent.id),
    org_id: DEMO_ORG_B_ID,
    event_id: toOrgBCalendarEventId(baseEvent.event_id || baseEvent.id),
    title: `Lincoln HS - ${baseEvent.title}`,
    description: baseEvent.description ? `Lincoln HS Athletics: ${baseEvent.description}` : baseEvent.description,
    starts_at: shiftedStart,
    ends_at: shiftedEnd,
    sales_start_at: shiftedSalesStart,
    sales_end_at: shiftedSalesEnd,
    venue_name: `Lincoln HS - ${baseEvent.venue_name || 'Athletics Complex'}`,
    venue_city: 'Lincoln',
    venue_state: 'CA',
    venue_postal_code: '95648',
    venue_address_line1: baseEvent.venue_address_line1 || '500 Education Blvd',
    created_at: shiftIsoByDays(baseEvent.created_at, 1 + (index % 4)) || baseEvent.created_at,
    updated_at: shiftIsoByDays(baseEvent.updated_at, 1 + (index % 4)) || baseEvent.updated_at,
    ticket_types: (baseEvent.ticket_types || []).map((ticketType) => ({
      ...ticketType,
      id: toOrgBTicketTypeId(ticketType.id),
    })),
  }
}

function getOrgBVirtualEvents(): TicketingEventWithDerived[] {
  const publishedVisible = events
    .filter(
      (event) => event.org_id === DEMO_ORG_A_ID && event.status === 'published' && (event.visibility === 'visible' || event.visibility == null),
    )
    .slice(0, 14)
  const completed = events
    .filter((event) => event.org_id === DEMO_ORG_A_ID && event.status === 'completed')
    .slice(0, 6)
  const curated = [...publishedVisible, ...completed]
  return curated.map((event, index) => cloneOrgBEventFromBase(event, index))
}

function getEventsForOrg(orgId: string): TicketingEventWithDerived[] {
  if (orgId === DEMO_ORG_B_ID) {
    return getOrgBVirtualEvents()
  }
  return events.filter((event) => event.org_id === orgId)
}

function resolveEventById(eventId: string, orgId?: string | null): TicketingEventWithDerived | null {
  if (orgId === DEMO_ORG_B_ID) {
    const orgBEvents = getOrgBVirtualEvents()
    const directMatch = orgBEvents.find((event) => event.id === eventId)
    if (directMatch) return directMatch
    const fallbackBaseId = fromOrgBEventId(eventId) || eventId
    return orgBEvents.find((event) => fromOrgBEventId(event.id) === fallbackBaseId) || null
  }

  if (!orgId) {
    const directMatch = events.find((event) => event.id === eventId)
    if (directMatch) return directMatch
    const orgBBaseId = fromOrgBEventId(eventId)
    if (orgBBaseId) {
      const orgBEvents = getOrgBVirtualEvents()
      return orgBEvents.find((event) => fromOrgBEventId(event.id) === orgBBaseId) || null
    }
    return null
  }

  return events.find((event) => event.id === eventId && event.org_id === orgId) || null
}

export interface TicketingEventsQuery {
  search?: string | null
  programIds?: string[]
  seasonIds?: string[]
  venueIds?: string[]
  status?: string | null
  saleStatus?: TicketSaleStatus | null
  fanVisibleOnly?: boolean
  dateFrom?: string | null
  dateTo?: string | null
  datePreset?: string | null
  sortBy?: string | null
  page?: number
  perPage?: number
  hidePast?: boolean
}

export function getFakePrograms(orgId: string): TicketingProgram[] {
  const sourcePrograms = programs.filter((entry) => entry.org_id === DEMO_ORG_A_ID)
  if (orgId === DEMO_ORG_A_ID) return sourcePrograms
  if (orgId === DEMO_ORG_B_ID) return sourcePrograms.map((program) => cloneProgramForOrg(program, DEMO_ORG_B_ID))
  return []
}

export function getFakeSeasons(orgId: string): TicketingSeason[] {
  const sourceSeasons = seasons.filter((entry) => entry.org_id === DEMO_ORG_A_ID)
  if (orgId === DEMO_ORG_A_ID) return sourceSeasons
  if (orgId === DEMO_ORG_B_ID) return sourceSeasons.map((season) => cloneSeasonForOrg(season, DEMO_ORG_B_ID))
  return []
}

export function getFakeVenues(orgId: string): TicketingVenue[] {
  const sourceVenues = venues.filter((entry) => entry.org_id === DEMO_ORG_A_ID)
  if (orgId === DEMO_ORG_A_ID) return sourceVenues
  if (orgId === DEMO_ORG_B_ID) return sourceVenues.map((venue) => cloneVenueForOrg(venue, DEMO_ORG_B_ID))
  return []
}

export function getFakeTicketingEvents(orgId: string, params: TicketingEventsQuery) {
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  let data = getEventsForOrg(orgId).map(deriveEvent)

  if (params.search) {
    const query = params.search.toLowerCase()
    data = data.filter((event) =>
      [event.title, event.description, event.venue?.name, event.opponent, event.program?.name]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(query)),
    )
  }

  if (params.programIds?.length) {
    data = data.filter((event) => !!event.program_id && params.programIds!.includes(event.program_id))
  }

  if (params.seasonIds?.length) {
    data = data.filter((event) => !!event.season_id && params.seasonIds!.includes(event.season_id))
  }

  if (params.venueIds?.length) {
    data = data.filter((event) => !!event.venue_id && params.venueIds!.includes(event.venue_id))
  }

  if (params.status) {
    data = data.filter((event) => event.status === params.status)
  }

  if (params.saleStatus) {
    data = data.filter((event) => event.sale_status === params.saleStatus)
  }

  if (params.fanVisibleOnly) {
    data = data.filter((event) => event.status === 'published' && (event.visibility === 'visible' || event.visibility == null))
  }

  if (params.datePreset === 'upcoming') {
    const now = new Date()
    data = data.filter((event) => new Date(event.starts_at) >= now)
  } else if (params.datePreset === 'past') {
    const now = new Date()
    data = data.filter((event) => new Date(event.starts_at) < now)
  }

  if (params.dateFrom) {
    data = data.filter((event) => new Date(event.starts_at) >= new Date(params.dateFrom!))
  }

  if (params.dateTo) {
    data = data.filter((event) => new Date(event.starts_at) <= new Date(params.dateTo!))
  }

  if (params.sortBy === 'revenue') {
    data = [...data].sort((a, b) => (b.revenue_cents ?? 0) - (a.revenue_cents ?? 0))
  } else if (params.sortBy === 'tickets_sold') {
    data = [...data].sort((a, b) => (b.tickets_sold ?? 0) - (a.tickets_sold ?? 0))
  } else if (params.sortBy === 'created_at') {
    data = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    data = [...data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }

  const counts_by_status = data.reduce<Record<string, number>>((accumulator, event) => {
    accumulator[event.status] = (accumulator[event.status] || 0) + 1
    return accumulator
  }, {})

  const counts_by_program = data.reduce<Record<string, number>>((accumulator, event) => {
    const label = event.program?.name || 'Unassigned'
    accumulator[label] = (accumulator[label] || 0) + 1
    return accumulator
  }, {})

  const total = data.length
  const total_pages = Math.max(1, Math.ceil(total / perPage))
  const sliceStart = (page - 1) * perPage
  const sliceEnd = sliceStart + perPage

  return {
    data: data.slice(sliceStart, sliceEnd),
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages,
      counts_by_status,
      counts_by_program,
      total_revenue_cents: data.reduce((sum, event) => sum + (event.revenue_cents ?? 0), 0),
      total_tickets_sold: data.reduce((sum, event) => sum + (event.tickets_sold ?? 0), 0),
    },
  }
}

export function createFakeTicketingEvent(orgId: string, payload: Partial<TicketedEvent>) {
  const nextEventId = `evt-${String(events.length + 1).padStart(3, '0')}`
  const newEvent: TicketingEventWithDerived = {
    id: nextEventId,
    org_id: orgId,
    event_type: payload.event_type || 'game',
    title: payload.title || 'Untitled Event',
    description: payload.description || null,
    event_description: payload.event_description || null,
    starts_at: payload.starts_at || new Date().toISOString(),
    ends_at: payload.ends_at || new Date().toISOString(),
    timezone: payload.timezone || DEFAULT_TIMEZONE,
    venue_name: payload.venue_name || null,
    venue_city: payload.venue_city || null,
    venue_state: payload.venue_state || null,
    venue_postal_code: payload.venue_postal_code || null,
    venue_address_line1: payload.venue_address_line1 || null,
    venue_address_line2: payload.venue_address_line2 || null,
    venue_country: payload.venue_country || 'US',
    venue_is_virtual: payload.venue_is_virtual ?? false,
    venue_virtual_link: payload.venue_virtual_link || null,
    sales_start_at: payload.sales_start_at || null,
    sales_end_at: payload.sales_end_at || null,
    cover_image_path: payload.cover_image_path || null,
    ticket_banner_url: payload.ticket_banner_url || null,
    status: payload.status || 'draft',
    visibility: payload.visibility || 'hidden',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    program_id: payload.program_id || null,
    season_id: payload.season_id || null,
    venue_id: payload.venue_id || null,
    opponent: payload.opponent || null,
    is_home: payload.is_home ?? true,
    team_id: payload.team_id ?? null,
    event_id: payload.event_id ?? `event-${nextEventId}`,
    ticket_types: [],
  }

  events = [newEvent, ...events]
  fakeOrdersByEvent[newEvent.id] = { ticketsSold: 0, revenueCents: 0 }
  return deriveEvent(newEvent)
}

export function updateFakeTicketingEvent(orgId: string, id: string, payload: Partial<TicketedEvent>) {
  events = events.map((event) => {
    if (event.id !== id || event.org_id !== orgId) return event
    return { ...event, ...payload, updated_at: new Date().toISOString() }
  })
  const updated = events.find((event) => event.id === id && event.org_id === orgId)
  return updated ? deriveEvent(updated) : null
}

export function deleteFakeTicketingEvent(orgId: string, id: string) {
  const before = events.length
  events = events.filter((event) => !(event.id === id && event.org_id === orgId))
  delete fakeOrdersByEvent[id]
  return before !== events.length
}

export function duplicateFakeTicketingEvent(orgId: string, id: string) {
  const source = events.find((event) => event.id === id && event.org_id === orgId)
  if (!source) return null

  const nextId = `evt-${String(events.length + 1).padStart(3, '0')}`
  const cloneTicketTypes = (source.ticket_types || []).map((ticketType, index) => ({
    ...ticketType,
    id: `${nextId}-tt-${index + 1}`,
  }))

  const clone: TicketingEventWithDerived = {
    ...source,
    id: nextId,
    title: `${source.title} (Copy)`,
    status: 'draft',
    visibility: 'hidden',
    event_id: source.event_id ? `${source.event_id}-copy-${events.length + 1}` : `event-${nextId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ticket_types: cloneTicketTypes,
  }

  events = [clone, ...events]
  fakeOrdersByEvent[clone.id] = { ticketsSold: 0, revenueCents: 0 }
  return deriveEvent(clone)
}

export function bulkFakeTicketingEvents(orgId: string, ids: string[], action: string, payload?: any) {
  if (action === 'delete') {
    events = events.filter((event) => !(ids.includes(event.id) && event.org_id === orgId))
    ids.forEach((id) => delete fakeOrdersByEvent[id])
    return { deleted: ids.length }
  }

  if (action === 'move') {
    events = events.map((event) => (ids.includes(event.id) && event.org_id === orgId ? { ...event, ...payload } : event))
    return { moved: ids.length }
  }

  if (action === 'update') {
    events = events.map((event) => (ids.includes(event.id) && event.org_id === orgId ? { ...event, ...payload } : event))
    return { updated: ids.length }
  }

  if (action === 'duplicate') {
    const created: string[] = []
    ids.forEach((id) => {
      const duplicate = duplicateFakeTicketingEvent(orgId, id)
      if (duplicate) created.push(duplicate.id)
    })
    return { duplicated: created.length, new_ids: created }
  }

  return { handled: false }
}

export function getFakeTicketedEventById(eventId: string, orgId?: string | null): TicketedEvent | null {
  const match = resolveEventById(eventId, orgId)
  return match ? deriveEvent(match) : null
}

export function getFakeTicketedEventByCalendarEventId(calendarEventId: string, orgId?: string | null): TicketedEvent | null {
  if (orgId === DEMO_ORG_B_ID) {
    const normalizedCalendarId = fromOrgBCalendarEventId(calendarEventId) || calendarEventId
    const match = getOrgBVirtualEvents().find((event) => {
      const eventCalendarId = fromOrgBCalendarEventId(event.event_id || '')
      return eventCalendarId === normalizedCalendarId
    })
    return match ? deriveEvent(match) : null
  }

  const orgBCalendarId = fromOrgBCalendarEventId(calendarEventId)
  if (!orgId && orgBCalendarId) {
    const match = getOrgBVirtualEvents().find((event) => fromOrgBCalendarEventId(event.event_id || '') === orgBCalendarId)
    return match ? deriveEvent(match) : null
  }

  const match = events.find((event) => event.event_id === calendarEventId && (!orgId || event.org_id === orgId))
  return match ? deriveEvent(match) : null
}

export function getFakeTicketTypesForEvent(eventId: string, orgId?: string | null): TicketType[] {
  const match = resolveEventById(eventId, orgId)
  if (!match || !match.ticket_types) return []
  return match.ticket_types.map((ticketType, index) => mapTicketType(match, ticketType, index))
}

export function adjustFakeTicketTypeCapacity(eventId: string, ticketTypeId: string, delta: number): boolean {
  const normalizedEventId = fromOrgBEventId(eventId) || eventId
  const normalizedTicketTypeId = fromOrgBTicketTypeId(ticketTypeId) || ticketTypeId

  const eventIndex = events.findIndex((event) => event.id === normalizedEventId)
  if (eventIndex === -1) return false

  const event = events[eventIndex]
  if (!event.ticket_types) return false

  const ticketType = event.ticket_types.find((entry) => entry.id === normalizedTicketTypeId)
  if (!ticketType) return false

  const nextRemaining = (ticketType.capacity_remaining ?? 0) + delta
  if (nextRemaining < 0) return false

  ticketType.capacity_remaining = nextRemaining
  recalculateMetricsForEvent(normalizedEventId)
  return true
}
