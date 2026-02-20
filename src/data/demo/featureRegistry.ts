/**
 * Demo Feature Registry
 * 
 * Central registry of features to showcase in the demo welcome page.
 * Features are organized by role and include outcome-focused descriptions.
 */

import type { DemoAllowedRole } from '@/types/demoManagement'
import { RouteKeys } from '@/utils/routes'

/**
 * Demo feature definition
 */
export interface DemoFeature {
  /** Unique identifier for this feature */
  id: string
  /** Display name */
  name: string
  /** 1-2 sentence outcome-focused explanation */
  description: string
  /** CTA button text */
  cta: string
  /** Optional quick-start bullet points */
  quickStart?: string[]
  /** Route key to navigate to */
  routeKey: string
  /** Roles that can see this feature */
  roles: DemoAllowedRole[]
  /** Business value explanation */
  businessValue: string
}

/**
 * All demo features organized by role
 */
export const demoFeatures: DemoFeature[] = [
  // Org Admin Features
  {
    id: 'org-admin-dashboard',
    name: 'Dashboard Overview',
    description: 'Get a complete view of your organization\'s activity, upcoming events, and key metrics at a glance.',
    cta: 'View Dashboard',
    quickStart: ['See upcoming events', 'Monitor payment status', 'View recent activity'],
    routeKey: RouteKeys.ADMIN_DASHBOARD,
    roles: ['org_admin'],
    businessValue: 'Stay informed about your organization\'s operations without switching between multiple screens.',
  },
  {
    id: 'org-admin-teams',
    name: 'Team Management',
    description: 'Create and manage teams, set up rosters, and organize athletes by sport and season.',
    cta: 'Manage Teams',
    quickStart: ['Create a new team', 'Add athletes to rosters', 'Set up seasons'],
    routeKey: RouteKeys.ADMIN_TEAMS,
    roles: ['org_admin'],
    businessValue: 'Keep your teams organized and ensure every athlete is properly assigned.',
  },
  {
    id: 'org-admin-events',
    name: 'Event Scheduling',
    description: 'Schedule practices, games, and other events with automatic notifications to participants.',
    cta: 'Schedule Events',
    quickStart: ['Create a practice', 'Set up recurring events', 'Send notifications'],
    routeKey: RouteKeys.ADMIN_EVENTS,
    roles: ['org_admin'],
    businessValue: 'Eliminate scheduling conflicts and ensure everyone knows when and where to be.',
  },
  {
    id: 'org-admin-payments',
    name: 'Payment Processing',
    description: 'Track fees, process payments, and manage outstanding balances for your organization.',
    cta: 'View Payments',
    quickStart: ['Assign fees to athletes', 'Track payment status', 'Process refunds'],
    routeKey: RouteKeys.ADMIN_PAYMENTS,
    roles: ['org_admin'],
    businessValue: 'Streamline financial management and reduce time spent on payment tracking.',
  },
  {
    id: 'org-admin-athletes',
    name: 'Athlete Management',
    description: 'Maintain complete athlete profiles, manage rosters, and track participation.',
    cta: 'Manage Athletes',
    quickStart: ['View athlete profiles', 'Manage rosters', 'Track attendance'],
    routeKey: RouteKeys.ADMIN_ATHLETES,
    roles: ['org_admin'],
    businessValue: 'Centralize athlete information and make it easy to find what you need.',
  },
  {
    id: 'org-admin-ticketing',
    name: 'Event Ticketing',
    description: 'Sell tickets for games and events with seat maps, order management, and gate entry.',
    cta: 'Manage Ticketing',
    quickStart: ['Create ticketed events', 'Set up seat maps', 'Process orders'],
    routeKey: RouteKeys.ADMIN_TICKETING_EVENTS,
    roles: ['org_admin'],
    businessValue: 'Monetize your events and simplify ticket sales and entry management.',
  },

  // Coach Features
  {
    id: 'coach-dashboard',
    name: 'Coach Dashboard',
    description: 'See your teams\' schedules, upcoming events, and athlete information in one place.',
    cta: 'View Dashboard',
    quickStart: ['Check today\'s schedule', 'View team rosters', 'See upcoming events'],
    routeKey: RouteKeys.PORTAL_DASHBOARD,
    roles: ['coach'],
    businessValue: 'Start each day knowing exactly what\'s happening with your teams.',
  },
  {
    id: 'coach-athletes',
    name: 'My Athletes',
    description: 'Access athlete profiles, contact information, and team rosters for your teams.',
    cta: 'View Athletes',
    quickStart: ['View athlete profiles', 'Check contact info', 'See team rosters'],
    routeKey: RouteKeys.PORTAL_ATHLETES,
    roles: ['coach'],
    businessValue: 'Quickly find athlete information when you need it most.',
  },
  {
    id: 'coach-calendar',
    name: 'Schedule Management',
    description: 'View and manage your team\'s schedule, including practices, games, and events.',
    cta: 'View Schedule',
    quickStart: ['See upcoming events', 'Check practice times', 'View game schedules'],
    routeKey: RouteKeys.PORTAL_CALENDAR,
    roles: ['coach'],
    businessValue: 'Keep your schedule organized and ensure you never miss an event.',
  },
  {
    id: 'coach-photos',
    name: 'Team Photos',
    description: 'Browse and manage team photo galleries, tag athletes, and share memories.',
    cta: 'View Photos',
    quickStart: ['Browse galleries', 'Tag athletes in photos', 'Share with parents'],
    routeKey: RouteKeys.PORTAL_PHOTOS,
    roles: ['coach'],
    businessValue: 'Preserve and share team memories with organized photo galleries.',
  },

  // Guardian/Parent Features
  {
    id: 'guardian-dashboard',
    name: 'Family Dashboard',
    description: 'See everything happening with your athletes: upcoming events, payments due, and recent activity.',
    cta: 'View Dashboard',
    quickStart: ['Check upcoming events', 'View payment status', 'See recent updates'],
    routeKey: RouteKeys.PORTAL_DASHBOARD,
    roles: ['parent'],
    businessValue: 'Stay on top of your athlete\'s schedule and obligations in one place.',
  },
  {
    id: 'guardian-athletes',
    name: 'My Athletes',
    description: 'View your athletes\' profiles, teams, and manage their information.',
    cta: 'View Athletes',
    quickStart: ['See athlete profiles', 'View team assignments', 'Update information'],
    routeKey: RouteKeys.PORTAL_ATHLETES,
    roles: ['parent'],
    businessValue: 'Keep your athlete\'s information up to date and easily accessible.',
  },
  {
    id: 'guardian-calendar',
    name: 'Event Calendar',
    description: 'See all upcoming events, practices, and games for your athletes in one calendar view.',
    cta: 'View Calendar',
    quickStart: ['See upcoming events', 'Bookmark important dates', 'View event details'],
    routeKey: RouteKeys.PORTAL_CALENDAR,
    roles: ['parent'],
    businessValue: 'Never miss a game or practice with a clear, organized calendar.',
  },
  {
    id: 'guardian-payments',
    name: 'Payments & Fees',
    description: 'View outstanding fees, payment history, and make payments securely online.',
    cta: 'View Payments',
    quickStart: ['Check outstanding fees', 'View payment history', 'Make a payment'],
    routeKey: RouteKeys.PORTAL_PAYMENTS,
    roles: ['parent'],
    businessValue: 'Stay on top of fees and make payments quickly and securely.',
  },
  {
    id: 'guardian-tickets',
    name: 'Event Tickets',
    description: 'Purchase and manage tickets for games and events, all in one place.',
    cta: 'View Tickets',
    quickStart: ['Browse events', 'Purchase tickets', 'Access your tickets'],
    routeKey: RouteKeys.PORTAL_MY_TICKETS,
    roles: ['parent'],
    businessValue: 'Simplify ticket purchasing and ensure you never forget your tickets.',
  },
  {
    id: 'guardian-messages',
    name: 'Team Communication',
    description: 'Stay connected with coaches and other parents through team announcements and messages.',
    cta: 'View Messages',
    quickStart: ['Read announcements', 'See team updates', 'Stay informed'],
    routeKey: RouteKeys.PORTAL_MESSAGES,
    roles: ['parent'],
    businessValue: 'Stay informed about team news and important updates.',
  },

  // Athlete Features
  {
    id: 'athlete-dashboard',
    name: 'My Dashboard',
    description: 'See your schedule, upcoming events, and team information all in one place.',
    cta: 'View Dashboard',
    quickStart: ['Check your schedule', 'See upcoming events', 'View team info'],
    routeKey: RouteKeys.PORTAL_DASHBOARD,
    roles: ['athlete'],
    businessValue: 'Stay organized and never miss a practice or game.',
  },
  {
    id: 'athlete-calendar',
    name: 'My Schedule',
    description: 'View all your practices, games, and team events in an easy-to-read calendar.',
    cta: 'View Schedule',
    quickStart: ['See upcoming events', 'Bookmark important dates', 'Check practice times'],
    routeKey: RouteKeys.PORTAL_CALENDAR,
    roles: ['athlete'],
    businessValue: 'Keep track of your schedule and stay prepared.',
  },
  {
    id: 'athlete-team',
    name: 'My Team',
    description: 'View your team roster, see teammates, and check team information.',
    cta: 'View Team',
    quickStart: ['See team roster', 'View teammates', 'Check team info'],
    routeKey: RouteKeys.PORTAL_ATHLETES,
    roles: ['athlete'],
    businessValue: 'Stay connected with your team and teammates.',
  },
  {
    id: 'athlete-messages',
    name: 'Announcements',
    description: 'Read team announcements and stay updated on important news.',
    cta: 'View Announcements',
    quickStart: ['Read announcements', 'See team updates', 'Stay informed'],
    routeKey: RouteKeys.PORTAL_MESSAGES,
    roles: ['athlete'],
    businessValue: 'Never miss important team news or updates.',
  },
]

/**
 * Get features for a specific role
 */
export function getFeaturesForRole(role: DemoAllowedRole): DemoFeature[] {
  return demoFeatures.filter(feature => feature.roles.includes(role))
}

/**
 * Get a feature by ID
 */
export function getFeatureById(featureId: string): DemoFeature | undefined {
  return demoFeatures.find(feature => feature.id === featureId)
}
