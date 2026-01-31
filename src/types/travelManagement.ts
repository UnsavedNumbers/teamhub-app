/**
 * Travel Management Page Types
 *
 * Mirrors eventsManagement for List/Calendar/Agenda design parity.
 */

export type TravelTimeContext = 'upcoming' | 'past' | 'all'
export type TravelViewMode = 'list' | 'calendar' | 'agenda'
export type TravelPlanStatus = 'draft' | 'published' | 'cancelled'

export interface TravelFilters {
    search: string
    dateFrom: string
    dateTo: string
    teamIds: string[]
    status: TravelPlanStatus[]
}

export interface TravelViewState {
    timeContext: TravelTimeContext
    viewMode: TravelViewMode
    filters: TravelFilters
    page: number
    rowsPerPage: number
    orderBy: string
    order: 'asc' | 'desc'
    selectedIds: Set<string>
    detailPlanId: string | null
}
