import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getAllTravelPlansAdmin, publishTravelPlan, cancelTravelPlan } from '../../data/services/travelService'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { ConfirmDialog, AdminPageHeader, EmptyState } from '../../components/admin'
import TravelHeader from '../../components/admin/TravelHeader'
import TravelFilters from '../../components/admin/TravelFilters'
import TravelList from '../../components/admin/TravelList'
import TravelCalendar from '../../components/admin/TravelCalendar'
import TravelAgenda from '../../components/admin/TravelAgenda'
import TravelDetailSlideOver from '../../components/admin/TravelDetailSlideOver'
import type { TravelTimeContext, TravelViewMode, TravelFilters as TravelFiltersType } from '../../types/travelManagement'
import type { TravelPlanWithTeam } from '../../components/admin/TravelList'

interface Team {
    id: string
    name: string
}

const DEFAULT_FILTERS: TravelFiltersType = {
    search: '',
    dateFrom: '',
    dateTo: '',
    teamIds: [],
    status: [],
}

export default function TravelPlans() {
    const [searchParams, setSearchParams] = useSearchParams()

    const [timeContext, setTimeContext] = useState<TravelTimeContext>('upcoming')
    const [viewMode, setViewMode] = useState<TravelViewMode>('list')
    const [filters, setFilters] = useState<TravelFiltersType>(DEFAULT_FILTERS)

    const [allPlans, setAllPlans] = useState<TravelPlanWithTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(50)
  const [orderBy] = useState('start_date')
  const [order] = useState<'asc' | 'desc'>('asc')

    const [detailPlanId, setDetailPlanId] = useState<string | null>(null)
    const [calendarDate, setCalendarDate] = useState(new Date())

    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; plan: TravelPlanWithTeam | null }>({ open: false, plan: null })
    const [publishLoading, setPublishLoading] = useState<string | null>(null)
    const [cancelLoading, setCancelLoading] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    void actionError

    const [teams, setTeams] = useState<Team[]>([])

    const { context, isReady } = useUserContext()
    const navigate = useNavigate()
    const t = useT()

    useEffect(() => {
        if (!isReady) return
        const loadTeams = async () => {
            try {
                const { data } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .eq('is_active', true)
                    .order('name')
                if (data) setTeams(data)
            } catch (err) {
                console.error('Error loading teams:', err)
            }
        }
        loadTeams()
    }, [context.orgId, isReady])

    useEffect(() => {
        localStorage.setItem('travelViewMode', viewMode)
        localStorage.setItem('travelTimeContext', timeContext)
    }, [viewMode, timeContext])

    useEffect(() => {
        const savedViewMode = localStorage.getItem('travelViewMode') as TravelViewMode
        const savedTimeContext = localStorage.getItem('travelTimeContext') as TravelTimeContext
        if (savedViewMode) setViewMode(savedViewMode)
        if (savedTimeContext) setTimeContext(savedTimeContext)
    }, [])

    useEffect(() => {
        const planId = searchParams.get('planId')
        setDetailPlanId(planId)
    }, [searchParams])

    const fetchPlans = useCallback(async () => {
        if (!isReady) return
        setLoading(true)
        try {
            const { data, error } = await getAllTravelPlansAdmin(context)
            if (error) throw error
            const plansWithTeam = (data || []).map((p) => ({
                ...p,
                team: p.team ?? (p.team_id ? { id: p.team_id, name: 'Unknown Team' } : undefined),
            }))
            setAllPlans(plansWithTeam)
        } catch (err) {
            console.error('Error fetching travel plans:', err)
            showError(getErrorMessage(err) || 'Failed to load travel plans')
            setAllPlans([])
        } finally {
            setLoading(false)
        }
    }, [context, isReady])

    useEffect(() => {
        fetchPlans()
    }, [fetchPlans])

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

    const filteredPlans = useMemo(() => {
        let list = [...allPlans]

        if (timeContext === 'upcoming') list = list.filter((p) => p.end_date >= todayStr)
        else if (timeContext === 'past') list = list.filter((p) => p.end_date < todayStr)

        if (filters.search.trim()) {
            const q = filters.search.toLowerCase()
            list = list.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    (p.location || '').toLowerCase().includes(q) ||
                    (p.team?.name || '').toLowerCase().includes(q)
            )
        }
        if (filters.dateFrom) list = list.filter((p) => p.end_date >= filters.dateFrom)
        if (filters.dateTo) list = list.filter((p) => p.start_date <= filters.dateTo)
        if (filters.teamIds.length > 0) list = list.filter((p) => filters.teamIds.includes(p.team_id))
        if (filters.status.length > 0) list = list.filter((p) => filters.status.includes(p.status))

        const asc = order === 'asc'
        list.sort((a, b) => {
            const aVal = a[orderBy as keyof TravelPlanWithTeam]
            const bVal = b[orderBy as keyof TravelPlanWithTeam]
            if (typeof aVal === 'string' && typeof bVal === 'string')
                return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
            return 0
        })
        return list
    }, [allPlans, timeContext, filters, orderBy, order, todayStr])

    const paginatedPlans = useMemo(() => {
        if (viewMode !== 'list') return filteredPlans
        const from = page * rowsPerPage
        return filteredPlans.slice(from, from + rowsPerPage)
    }, [filteredPlans, viewMode, page, rowsPerPage])

    const totalCount = filteredPlans.length
    const upcomingCount = useMemo(() => allPlans.filter((p) => p.end_date >= todayStr).length, [allPlans, todayStr])

    const handlePublish = async (plan: TravelPlanWithTeam) => {
        setPublishLoading(plan.id)
        setActionError(null)
        try {
            const { data, error } = await publishTravelPlan(context, plan.id)
            if (error) throw error
            if (data) {
                showSuccess(t('travelPlans.publishSuccess'))
                await fetchPlans()
            }
        } catch (err) {
            const msg = getErrorMessage(err) || 'Failed to publish travel plan'
            setActionError(msg)
            showError(msg)
        } finally {
            setPublishLoading(null)
        }
    }

    const handleCancelConfirm = async (_reason: string) => {
        if (!cancelDialog.plan) return
        const planId = cancelDialog.plan.id
        setCancelLoading(planId)
        setActionError(null)
        try {
            const { data, error } = await cancelTravelPlan(context, planId)
            if (error) throw error
            if (data) {
                showSuccess(t('travelPlans.cancelSuccess'))
                setCancelDialog({ open: false, plan: null })
                setSearchParams({})
                await fetchPlans()
            }
        } catch (err) {
            const msg = getErrorMessage(err) || 'Failed to cancel travel plan'
            setActionError(msg)
            showError(msg)
        } finally {
            setCancelLoading(null)
        }
    }

    const handleClearFilters = () => {
        setFilters(DEFAULT_FILTERS)
        setPage(0)
    }

    const handlePlanClick = (plan: TravelPlanWithTeam) => {
        setSearchParams({ planId: plan.id })
    }

    const handleCloseDetail = () => {
        setSearchParams({})
    }

    if (!isReady) {
        return (
            <div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
                    <div className="animate-pulse rounded bg-slate-200 dark:bg-slate-700" style={{ width: '100%', height: '400px' }} />
                </div>
            </div>
        )
    }

    return (
        <div>
            <AdminPageHeader title={t('admin.travel.title')} subtitle={t('admin.travel.subtitle')} />

            <TravelHeader
                timeContext={timeContext}
                viewMode={viewMode}
                onTimeContextChange={(ctx) => { setTimeContext(ctx); setPage(0) }}
                onViewModeChange={(mode) => { setViewMode(mode); setPage(0) }}
                onCreateClick={() => navigate('/admin/travel/new')}
                upcomingCount={upcomingCount}
            />

            <TravelFilters
                filters={filters}
                onFiltersChange={(newFilters) => { setFilters(newFilters); setPage(0) }}
                teams={teams}
                onClearAll={handleClearFilters}
            />

            {filteredPlans.length === 0 && !loading ? (
                <EmptyState
                    icon="flight_takeoff"
                    title={t('travelPlans.noPlans')}
                    description={t('travelPlans.noPlansDesc')}
                >
                    <button className="oa-btn oa-btn--primary" onClick={() => navigate('/admin/travel/new')}>
                        {t('travelPlans.createPlan')}
                    </button>
                </EmptyState>
            ) : (
                <>
                    {viewMode === 'list' && (
                        <TravelList
                            plans={paginatedPlans}
                            loading={loading}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(0) }}
                            onRowClick={handlePlanClick}
                            onEdit={(plan) => navigate(getLink('admin.travel.edit', { id: plan.id }))}
                            onPublish={handlePublish}
                            onCancel={(plan) => setCancelDialog({ open: true, plan })}
                            publishLoading={publishLoading}
                            cancelLoading={cancelLoading}
                        />
                    )}

                    {viewMode === 'calendar' && (
                        <TravelCalendar
                            plans={filteredPlans}
                            currentDate={calendarDate}
                            onDateChange={setCalendarDate}
                            onPlanClick={handlePlanClick}
                        />
                    )}

                    {viewMode === 'agenda' && (
                        <TravelAgenda
                            plans={filteredPlans}
                            loading={loading}
                            onPlanClick={handlePlanClick}
                            onEdit={(plan) => navigate(getLink('admin.travel.edit', { id: plan.id }))}
                            onPublish={handlePublish}
                            onCancel={(plan) => setCancelDialog({ open: true, plan })}
                            publishLoading={publishLoading}
                            cancelLoading={cancelLoading}
                        />
                    )}
                </>
            )}

            <TravelDetailSlideOver
                planId={detailPlanId}
                onClose={handleCloseDetail}
                onEdit={(id) => navigate(getLink('admin.travel.edit', { id }))}
                onPublish={(id) => {
                    const plan = allPlans.find((p) => p.id === id)
                    if (plan) handlePublish(plan)
                }}
                onCancel={(id) => {
                    const plan = allPlans.find((p) => p.id === id)
                    if (plan) setCancelDialog({ open: true, plan })
                }}
            />

            <ConfirmDialog
                open={cancelDialog.open}
                title={t('travelPlans.cancelDialogTitle')}
                description={cancelDialog.plan ? t('travelPlans.cancelDialogDesc', { title: cancelDialog.plan.title }) : ''}
                confirmLabel={t('travelPlans.cancelConfirmLabel')}
                variant="primary"
                onConfirm={() => { void handleCancelConfirm('') }}
                onCancel={() => { setCancelDialog({ open: false, plan: null }); setActionError(null) }}
            />
        </div>
    )
}
