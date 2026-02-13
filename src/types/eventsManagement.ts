/**
 * Events Management Page Types
 * 
 * Type definitions for the admin Events management page
 */

import type { CalendarEvent, EventType } from './calendar'

export type EventTimeContext = 'upcoming' | 'past' | 'all'
export type EventViewMode = 'list' | 'calendar' | 'agenda'
export type EventStatus = 'scheduled' | 'cancelled' | 'completed' | 'postponed'

export interface EventsFilters {
    search: string
    dateFrom: string
    dateTo: string
    eventTypes: EventType[]
    teamIds: string[]
    sportIds: string[]
    seasonIds: string[]
    status: EventStatus[]
    locationSearch: string
    visibleToFans: boolean
}

export interface EventsViewState {
    timeContext: EventTimeContext
    viewMode: EventViewMode
    filters: EventsFilters
    page: number
    rowsPerPage: number
    orderBy: string
    order: 'asc' | 'desc'
    selectedIds: Set<string>
    detailEventId: string | null
}

export interface EventListItem extends CalendarEvent {
    // Additional computed fields for list display
    statusLabel?: string
    locationDisplay?: string
}

export interface BulkAction {
    id: 'cancel' | 'reschedule' | 'assign_team' | 'assign_season' | 'duplicate' | 'delete'
    label: string
    icon: string
    variant: 'primary' | 'warning' | 'danger'
    requiresConfirmation: boolean
}
