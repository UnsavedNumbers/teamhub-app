/**
 * Fixed local image catalog for fake-data pages.
 * All files are served from /public (referenced as root-relative paths).
 */

export const DEMO_PAGE_IMAGES = {
  resetPasswordHero: '/demo-assets/photos/facility-exterior.jpg',
  adminDashboard: {
    heroStadium: '/demo-assets/photos/tournament-field.jpg',
    heroTrack: '/demo-assets/photos/players-action.jpg',
    heroBasketball: '/demo-assets/photos/soccer-action.jpg',
    cardSchedule: '/demo-assets/photos/team-huddle.jpg',
    cardPlayers: '/demo-assets/photos/player-portrait.jpg',
    cardPayments: '/demo-assets/photos/equipment-room.jpg',
    cardTraining: '/demo-assets/photos/team-warmup.jpg',
    cardField: '/demo-assets/photos/facility-exterior.jpg',
    cardUniforms: '/demo-assets/photos/tournament-trophy.jpg',
  },
} as const

export const DEMO_TICKETING_EVENT_IMAGES: readonly string[] = [
  '/demo-assets/photos/tournament-field.jpg',
  '/demo-assets/photos/team-celebration.jpg',
  '/demo-assets/photos/team-huddle.jpg',
  '/demo-assets/photos/players-action.jpg',
  '/demo-assets/photos/soccer-action.jpg',
  '/demo-assets/photos/team-warmup.jpg',
  '/demo-assets/photos/tournament-trophy.jpg',
  '/demo-assets/photos/facility-exterior.jpg',
]

const DEFAULT_VENUE_INSIGHT_IMAGES: readonly [string, string] = [
  '/demo-assets/photos/tournament-field.jpg',
  '/demo-assets/photos/facility-exterior.jpg',
]

const VENUE_INSIGHT_IMAGES_BY_PLACE: Record<string, readonly [string, string]> = {
  'riv-001': ['/demo-assets/photos/tournament-field.jpg', '/demo-assets/photos/team-celebration.jpg'],
  'lin-001': ['/demo-assets/photos/team-huddle.jpg', '/demo-assets/photos/facility-exterior.jpg'],
}

/**
 * Fixed venue-insight photos by place_id with stable fallback.
 */
export function getDemoVenueInsightImages(placeId: string): readonly [string, string] {
  return VENUE_INSIGHT_IMAGES_BY_PLACE[placeId] || DEFAULT_VENUE_INSIGHT_IMAGES
}
