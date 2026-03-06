import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getTravelPlans,
  formatDateRange
} from '../data/services/travelService'
import type { FakeTravelPlan } from '../data/fake/fakeTravel'
import { getSportFromTeam, type SportInfo } from '../utils/sportContext'
import PortalLayout from '../components/portal/PortalLayout'
import { CardTitle } from '../components/portal/Typography'
// SportCardImage removed
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import Button from '../components/portal/Button'
import EmptyState from '../components/portal/EmptyState'
import PullToRefreshContainer from '../components/common/mobile/PullToRefreshContainer'
import CollapsibleHeader from '../components/common/mobile/CollapsibleHeader'
import SwipeableRow from '../components/common/mobile/SwipeableRow'
import { cn } from '../utils/cn'
import { useT } from '../i18n/useI18n'

// ----------------------------------------------------------------------------
// Types & Helpers
// ----------------------------------------------------------------------------

type TabType = 'upcoming' | 'past' | 'all'

interface GroupedPlans {
    key: string
    label: string
    items: FakeTravelPlan[]
    year: number
    seasonId?: string
}

function getGroupKey(plan: FakeTravelPlan): string {
    if (plan.season?.id) return `season-${plan.season.id}`
    // Fallback to year if no season
    const year = new Date(plan.start_date).getFullYear()
    return `year-${isNaN(year) ? 'unknown' : year}`
}

function getGroupLabel(plan: FakeTravelPlan): string {
    if (plan.season?.name) return plan.season.name
    const year = new Date(plan.start_date).getFullYear()
    return isNaN(year) ? 'Unknown Date' : `${year}`
}

// Note: status badge labels are translated inside the component via `useT()`.

// ----------------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------------

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Travel() {
  useDebugLifecycle('Travel')
    const t = useT()
    const navigate = useNavigate()
    const { context, isReady } = useUserContext()

    const toLocalDateOnlyFromDate = (d: Date): string => {
        const y = String(d.getFullYear())
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    const toDateOnly = (value: string): string => {
        // Normalizes various backend formats to YYYY-MM-DD.
        // - YYYY-MM-DD
        // - YYYY-MM-DDTHH:mm:ssZ
        // - YYYY-MM-DD HH:mm:ss+00
        // - Other parseable date strings
        const v = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
        const parsed = new Date(v)
        if (!Number.isNaN(parsed.getTime())) return toLocalDateOnlyFromDate(parsed)
        return v
    }

    const getTodayLocalDateOnly = (): string => {
        // Use local date parts so timezone/UTC offsets don't affect comparisons.
        return toLocalDateOnlyFromDate(new Date())
    }

    const getDisplayStatus = (plan: FakeTravelPlan): { label: string; color: string } => {
        if (plan.status === 'cancelled') {
            return { label: t('portal.travel.badges.cancelled'), color: 'bg-red-500' }
        }

        // Normalize in case the backend returns timestamps.
        const startDate = toDateOnly(plan.start_date)
        const endDate = toDateOnly(plan.end_date)
        const todayStr = getTodayLocalDateOnly()

        if (endDate < todayStr) {
            return { label: t('portal.travel.badges.completed'), color: 'bg-gray-500' }
        }

        // If the trip starts today, call it out.
        if (startDate === todayStr) {
            return { label: t('portal.travel.badges.today'), color: 'bg-emerald-600' }
        }

        // If today's date is between start and end (inclusive), show Active (green).
        if (startDate <= todayStr && todayStr <= endDate) {
            return { label: t('portal.travel.badges.active'), color: 'bg-emerald-600' }
        }

        return { label: t('portal.travel.badges.upcoming'), color: 'bg-[var(--org-btn-primary-bg)]' }
    }
    
    // -- State --
    const [activeTab, setActiveTab] = useState<TabType>('upcoming')
    
    // Data stores
    const [upcomingPlans, setUpcomingPlans] = useState<FakeTravelPlan[] | null>(null)
    const [allPlans, setAllPlans] = useState<FakeTravelPlan[] | null>(null)
    
    // Loading/Error
    const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true)
    const [isLoadingAll, setIsLoadingAll] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    
    // Plan metadata (sports info)
    const [planSports, setPlanSports] = useState<Record<string, SportInfo | null>>({})
    
    // UI State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const [filtersOpen, setFiltersOpen] = useState(false)
    
    // -- Filters --
    const [searchQuery, setSearchQuery] = useState('')
    const [seasonFilter, setSeasonFilter] = useState<string>('')
    const [teamFilter, setTeamFilter] = useState<string>('')

    // -- Effects --

    // 1. Initial Load: Upcoming Plans
    useEffect(() => {
        if (!isReady) return

        let mounted = true
        const loadUpcoming = async () => {
            try {
                setIsLoadingUpcoming(true)
                // Use getTravelPlans with upcomingOnly: true
                const { data, error } = await getTravelPlans(context, { upcomingOnly: true })
                if (mounted) {
                    if (error) throw error
                    const resolved = Array.isArray(data) ? data : []
                    setUpcomingPlans(resolved)
                    loadSports(resolved)
                }
            } catch (err) {
                if (mounted) setError(err instanceof Error ? err : new Error('Failed to load travel plans'))
            } finally {
                if (mounted) setIsLoadingUpcoming(false)
            }
        }

        loadUpcoming()
        return () => { mounted = false }
    }, [context, isReady, retryCount])

    // 2. Load "All Plans" when tab switches to Past or All (if not loaded)
    useEffect(() => {
        console.log('Effect running - activeTab:', activeTab, 'isReady:', isReady, 'allPlans:', allPlans?.length, 'isLoadingAll:', isLoadingAll)
        
        if (!isReady) {
            console.log('Not ready yet')
            return
        }
        if (activeTab === 'upcoming') {
            console.log('Active tab is upcoming, skipping')
            return
        }
        if (Array.isArray(allPlans)) {
            console.log('allPlans already loaded')
            return
        }
        if (isLoadingAll) {
            console.log('Already loading')
            return
        }

        let mounted = true
        const loadAll = async () => {
            try {
                setIsLoadingAll(true)
                console.log('Loading all travel plans...')
                // Use getTravelPlans without upcomingOnly (fetches everything)
                // We rely on service caching or just simple fetch here. 
                // Since this is a redesign, we assume we fetch fresh if not in state.
                const { data, error } = await getTravelPlans(context, {})
                console.log('All travel plans loaded:', data?.length, 'plans', data)
                if (mounted) {
                    if (error) throw error
                    const resolved = Array.isArray(data) ? data : []
                    setAllPlans(resolved)
                    loadSports(resolved)
                }
            } catch (err) {
                console.error('Error loading all plans:', err)
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to load travel plans'))
                    setAllPlans([])
                }
            } finally {
                if (mounted) setIsLoadingAll(false)
            }
        }

        loadAll()
        return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isReady, context, retryCount])

    // Helper to load sports for new plans
    const loadSports = async (plans: FakeTravelPlan[]) => {
        const newSports: Record<string, SportInfo | null> = {}
        const uniqueTeamIds = [...new Set(plans.map(p => p.team_id).filter(Boolean))]
        
        // Check which ones we don't have yet? Or just reload to be safe/simple
        await Promise.all(uniqueTeamIds.map(async (teamId) => {
            try {
                const sport = await getSportFromTeam(context, teamId)
                // Map sport to all plans with this team
                plans.filter(p => p.team_id === teamId).forEach(p => {
                    newSports[p.id] = sport
                })
            } catch (e) {
                console.error(e)
            }
        }))
        
        setPlanSports(prev => ({ ...prev, ...newSports }))
    }

    // -- Derived Data --
    
    // Source plans based on tab
    const sourcePlans = useMemo(() => {
        console.log('sourcePlans recalculating:', { 
            activeTab, 
            upcomingPlansCount: upcomingPlans?.length, 
            allPlansCount: allPlans?.length 
        })
        
        if (activeTab === 'upcoming') return Array.isArray(upcomingPlans) ? upcomingPlans : []
        // For Past/All, we need the "allPlans" dataset
        // If not loaded yet, default to empty or upcoming (if sensible) 
        // But better to wait for allPlans. 
        if (!Array.isArray(allPlans)) {
            console.log('allPlans is null, returning empty array')
            return []
        }
        
        const today = getTodayLocalDateOnly()
        console.log('Today:', today)
        
        if (activeTab === 'past') {
            const pastPlans = allPlans.filter(p => {
                const endDate = toDateOnly(p.end_date)
                const isPast = endDate < today
                console.log('Plan:', p.title, 'end_date:', p.end_date, 'isPast:', isPast)
                return isPast
            })
            console.log('Past plans count:', pastPlans.length)
            return pastPlans
        }
        
        console.log('Returning all plans:', allPlans.length)
        return allPlans // 'all' tab
    }, [activeTab, upcomingPlans, allPlans])

    // Filter Logic
    const filteredPlans = useMemo(() => {
        return sourcePlans.filter(plan => {
            // Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const matchTitle = plan.title.toLowerCase().includes(q)
                const matchLoc = (plan.location || '').toLowerCase().includes(q)
                const matchCity = (plan.destination_city || '').toLowerCase().includes(q)
                const matchTeam = (plan.team?.name || '').toLowerCase().includes(q)
                if (!matchTitle && !matchLoc && !matchCity && !matchTeam) return false
            }
            // Season Filter
            if (seasonFilter) {
                if (plan.season?.id !== seasonFilter && plan.season?.name !== seasonFilter) return false
            }
            // Team Filter
            if (teamFilter) {
                if (plan.team?.id !== teamFilter && plan.team?.name !== teamFilter) return false
            }
            return true
        })
    }, [sourcePlans, searchQuery, seasonFilter, teamFilter])

    // Grouping
    const groupedPlans = useMemo(() => {
        const groups: Record<string, GroupedPlans> = {}
        
        filteredPlans.forEach(plan => {
            const key = getGroupKey(plan)
            if (!groups[key]) {
                groups[key] = {
                    key,
                    label: getGroupLabel(plan),
                    items: [],
                    year: new Date(plan.start_date).getFullYear(),
                    seasonId: plan.season?.id
                }
            }
            groups[key].items.push(plan)
        })

        // Sort items within groups (chronological)
        Object.values(groups).forEach(g => {
            g.items.sort((a, b) => a.start_date.localeCompare(b.start_date))
        })

        // Sort groups
        const sortedGroups = Object.values(groups).sort((a, b) => {
            // Sort logic: 
            // Upcoming tab: Soonest season/year first
            // Past tab: Most recent season/year first
            // All tab: Upcoming block first (soonest), then Past block (recent) -- complex. 
            // Simplified All: Recent (descending) or Chronological (ascending)? 
            // Requirement: "All: Upcoming block first... then Past block (most recent first)."
            
            // Let's implement simpler sort first:
            // If Upcoming tab -> Ascending date (Year/Season)
            // If Past/All tab -> Descending date
            
            if (activeTab === 'upcoming') {
                return a.year - b.year // Ascending year roughly, better to look at first item start date
                    || (a.items[0]?.start_date.localeCompare(b.items[0]?.start_date) ?? 0)
            } else {
                return b.year - a.year // Descending
                    || (b.items[0]?.start_date.localeCompare(a.items[0]?.start_date) ?? 0)
            }
        })
        
        return sortedGroups
    }, [filteredPlans, activeTab])

    // Initialization of expanded groups
    // Reset when tab changes? No, requirement says: "Upcoming always expanded. Past: collapse if large."
    useEffect(() => {
        // Build a set of keys to expand by default
        const newExpanded = new Set<string>()
        
        if (activeTab === 'upcoming') {
            groupedPlans.forEach(g => newExpanded.add(g.key))
        } else {
            // Past/All
            groupedPlans.forEach((g, idx) => {
                // Expand first group or if small
                if (idx === 0 || g.items.length < 5) {
                    newExpanded.add(g.key)
                }
            })
        }
        setExpandedGroups(newExpanded)
    }, [activeTab, groupedPlans.length]) // Only re-calc defaults when tab/plans change meaningfully


    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }
    
    // Filter Options
    const seasonOptions = useMemo(() => {
        const unique = new Map<string, string>()
        // Use allPlans if available for better filter list, or just sourcePlans
        const pool = allPlans || upcomingPlans || []
        pool.forEach(p => {
             if (p.season) unique.set(p.season.id, p.season.name)
        })
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }))
    }, [allPlans, upcomingPlans])

    const teamOptions = useMemo(() => {
        const unique = new Map<string, string>()
        const pool = allPlans || upcomingPlans || []
        pool.forEach(p => {
             if (p.team) unique.set(p.team.id, p.team.name)
        })
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }))
    }, [allPlans, upcomingPlans])


    // -- Render --

    if (error) {
        return (
            <PortalLayout breadcrumbs={[{ label: 'Home', path: '/portal/dashboard' }, { label: 'Travel' }]}>
                <div className="flex justify-center py-12">
                   <Card className="text-center py-12 max-w-lg w-full">
                       <Icon name="error" size="text-6xl" className="text-red-400 mb-4 mx-auto" />
                       <CardTitle className="mb-2">Error loading plans</CardTitle>
                       <p className="text-gray-500 mb-6">{error.message}</p>
                       <Button onClick={() => {
                           setError(null)
                           setRetryCount(c => c + 1)
                       }}>Retry</Button>
                   </Card>
                </div>
            </PortalLayout>
        )
    }

    return (
        <PortalLayout breadcrumbs={[{ label: 'Home', path: '/portal/dashboard' }, { label: 'Travel' }]}>
            <PullToRefreshContainer onRefresh={async () => { setRetryCount((count) => count + 1) }}>
            
            {/* Header */}
            <div className="mb-8">
                <CollapsibleHeader
                    title="Travel"
                    mode="large"
                    scrollContainerSelector=".portal-workspace-main"
                />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-light tracking-wide mt-2">
                    Manage upcoming trips and view past travel history.
                </p>
            </div>

            {/* Tabs & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                
                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start">
                    {(['upcoming', 'past', 'all'] as TabType[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all",
                                activeTab === tab 
                                    ? "bg-white dark:bg-gray-700 text-[var(--org-btn-primary-bg)] shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            {tab === 'upcoming'
                                ? t('portal.travel.tabs.current')
                                : tab === 'past'
                                    ? t('portal.travel.tabs.past')
                                    : t('portal.travel.tabs.all')}
                        </button>
                    ))}
                </div>
                
                {/* Filter Toggle / Search */}
                <div className="flex gap-2">
                   <div className="relative">
                       <input 
                          type="text" 
                          placeholder="Search..." 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="form-input pl-9 pr-4 w-40 sm:w-64"
                       />
                       <Icon name="search" className="absolute left-3 top-2.5 text-gray-400 text-sm" />
                   </div>
                   <Button 
                       variant="secondary" 
                       onClick={() => setFiltersOpen(!filtersOpen)}
                       className={cn(filtersOpen && "bg-gray-100 dark:bg-gray-800")}
                   >
                       <Icon name="filter_list" />
                   </Button>
                </div>
            </div>

            {/* Filters Bar */}
            {filtersOpen && (
                <Card className="mb-6 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="mobile-stack-controls">
                        <div className="flex-1 min-w-0 sm:min-w-[200px]">
                            <label className="form-label">Season</label>
                            <select 
                                value={seasonFilter} 
                                onChange={e => setSeasonFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Seasons</option>
                                {seasonOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-0 sm:min-w-[200px]">
                            <label className="form-label">Team</label>
                            <select 
                                value={teamFilter} 
                                onChange={e => setTeamFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Teams</option>
                                {teamOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button 
                                variant="secondary" 
                                className="text-red-500 hover:text-red-600 text-sm px-0"
                                onClick={() => {
                                    setSeasonFilter('')
                                    setTeamFilter('')
                                    setSearchQuery('')
                                }}
                            >
                                Clear All
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Content State */}
            {isLoadingUpcoming && !upcomingPlans ? (
                 <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--org-btn-primary-bg)]"></div>
                 </div>
            ) : (activeTab !== 'upcoming' && isLoadingAll && !allPlans) ? (
                 <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--org-btn-primary-bg)]"></div>
                 </div>
            ) : filteredPlans.length === 0 ? (
                 <EmptyState
                   icon="flight_takeoff"
                   title="No travel plans found"
                   description="Try adjusting your filters or check back later."
                 />
            ) : (
                <div className="space-y-8">
                    {groupedPlans.map(group => (
                        <div key={group.key} className="space-y-4">
                            {/* Group Header */}
                            <div 
                                className="flex items-center gap-4 cursor-pointer group select-none"
                                onClick={() => toggleGroup(group.key)}
                            >
                                <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Icon name={expandedGroups.has(group.key) ? "expand_less" : "expand_more"} className="text-gray-400" />
                                </button>
                                <h2 className="text-xl font-black uppercase text-gray-700 dark:text-gray-200 tracking-wide">
                                    {group.label}
                                </h2>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {group.items.length} {group.items.length === 1 ? 'Trip' : 'Trips'}
                                </span>
                            </div>

                            {/* Group Content */}
                            {expandedGroups.has(group.key) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 pl-2 sm:pl-0">
                                    {group.items.map(plan => {
                                        const status = getDisplayStatus(plan)
                                        const sport = planSports[plan.id]
                                        
                                        return (
                                            <SwipeableRow
                                                key={plan.id}
                                                rightActions={[
                                                    {
                                                        id: `${plan.id}-details`,
                                                        label: 'Details',
                                                        tone: 'primary',
                                                        onSelect: () => navigate(`/portal/travel/${plan.id}`),
                                                    },
                                                ]}
                                            >
                                            <div 
                                                onClick={() => navigate(`/portal/travel/${plan.id}`)}
                                                className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg hover:border-[var(--org-btn-primary-bg)]/30 transition-all duration-200 cursor-pointer overflow-hidden p-4 sm:p-5 flex flex-col gap-3"
                                            >
                                                {/* Top Row: Team + Status */}
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {sport && (
                                                            <div 
                                                                className="w-2 h-8 rounded-full"
                                                                style={{ backgroundColor: sport.color || '#ccc' }}
                                                            ></div>
                                                        )}
                                                        <div>
                                                            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                                                                {plan.team?.name || 'Team Event'}
                                                            </div>
                                                            <h3 className="font-bold text-gray-800 dark:text-white leading-tight">
                                                                {plan.title}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest text-white px-2 py-1 rounded", status.color)}>
                                                        {status.label}
                                                    </span>
                                                </div>

                                                {/* Middle: Details */}
                                                <div className="mt-1 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="calendar_today" size="text-sm" className="text-gray-400" />
                                                        <span className="font-medium">{formatDateRange(plan.start_date, plan.end_date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="place" size="text-sm" className="text-gray-400" />
                                                        <span className="font-medium">
                                                            {[plan.destination_city, plan.destination_state].filter(Boolean).join(', ') || plan.location}
                                                        </span>
                                                    </div>
                                                    {plan.venue_name && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Icon name="stadium" size="text-sm" className="text-gray-400 opacity-70" />
                                                            <span className="opacity-80 line-clamp-1">{plan.venue_name}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Hint */}
                                                <div className="mt-auto pt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <span className="text-xs font-bold text-[var(--org-link-color)] flex items-center gap-1 uppercase tracking-wide">
                                                        View Details <Icon name="arrow_forward" size="text-xs" />
                                                    </span>
                                                </div>
                                            </div>
                                            </SwipeableRow>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </PullToRefreshContainer>
        </PortalLayout>
    )
}

