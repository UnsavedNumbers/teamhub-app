/**
 * Tool Link Element Registry
 * 
 * Central registry of linkable application elements for help center tool links.
 */

export type ToolLinkElement = {
  id: string
  name: string
  route: string
  selector?: string
  defaultPrompt: string
  contextPrompts?: {
    [context: string]: string
  }
}

export const TOOL_LINK_REGISTRY: Record<string, ToolLinkElement> = {
  'settings-billing-page': {
    id: 'settings-billing-page',
    name: 'Billing Settings',
    route: '/admin/organization/billing',
    selector: '[data-section="billing"]',
    defaultPrompt: 'Here is where you can manage billing settings',
    contextPrompts: {
      'payment-setup': 'Start here to set up payment processing',
      'view-invoices': 'Here you can view and download invoices',
    },
  },
  'athlete-profile-edit': {
    id: 'athlete-profile-edit',
    name: 'Edit Athlete Profile',
    route: '/portal/athletes/:id/edit',
    selector: '[data-form="athlete-profile"]',
    defaultPrompt: 'Here is where you can edit athlete information',
  },
  'organization-settings': {
    id: 'organization-settings',
    name: 'Organization Settings',
    route: '/admin/organization',
    selector: '[data-section="overview"]',
    defaultPrompt: 'Here is where you can manage organization settings',
  },
  'team-roster': {
    id: 'team-roster',
    name: 'Team Roster',
    route: '/admin/teams/:id/roster',
    selector: '[data-section="roster"]',
    defaultPrompt: 'Here is where you can manage the team roster',
  },
  'create-event': {
    id: 'create-event',
    name: 'Create Event',
    route: '/admin/events/new',
    selector: '[data-form="event-form"]',
    defaultPrompt: 'Start here to create a new event',
  },
  'payment-fees': {
    id: 'payment-fees',
    name: 'Fees Management',
    route: '/admin/payments/fees',
    selector: '[data-section="fees"]',
    defaultPrompt: 'Here is where you can manage fees',
  },
  'athlete-registration': {
    id: 'athlete-registration',
    name: 'Athlete Registration',
    route: '/portal/athletes/new',
    selector: '[data-form="athlete-registration"]',
    defaultPrompt: 'Start here to register a new athlete',
  },
  'calendar-view': {
    id: 'calendar-view',
    name: 'Calendar',
    route: '/portal/calendar',
    selector: '[data-view="calendar"]',
    defaultPrompt: 'Here is your calendar view',
  },
  'notifications-settings': {
    id: 'notifications-settings',
    name: 'Notification Settings',
    route: '/admin/settings',
    selector: '[data-tab="notifications"]',
    defaultPrompt: 'Here is where you can manage notification preferences',
  },
  'user-management': {
    id: 'user-management',
    name: 'User Management',
    route: '/admin/organization/users',
    selector: '[data-section="users"]',
    defaultPrompt: 'Here is where you can manage organization users',
  },
}

/**
 * Get tool link element by ID
 */
export function getToolLinkElement(id: string): ToolLinkElement | null {
  return TOOL_LINK_REGISTRY[id] || null
}

/**
 * Validate tool link ID exists in registry
 */
export function validateToolLinkId(id: string): boolean {
  return id in TOOL_LINK_REGISTRY
}

/**
 * Get all registered tool link IDs
 */
export function getAllToolLinkIds(): string[] {
  return Object.keys(TOOL_LINK_REGISTRY)
}
