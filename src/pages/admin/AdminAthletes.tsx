/**
 * Admin Athletes Page
 *
 * Lists all athletes in the organization with filtering and view options.
 * Complete action audit implementation with full CRUD support.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { ConfirmDialog, AdminPageHeader, EmptyState } from '../../components/admin'
import AthletesHeader from '../../components/admin/AthletesHeader'
import AthletesFilters, { type AthletesFilters as AthletesFiltersType } from '../../components/admin/AthletesFilters'
import AthletesGrid, { type AthleteCardData } from '../../components/admin/AthletesGrid'
import BulkActionsBar from '../../components/admin/BulkActionsBar'
import * as athletesListService from '../../data/services/athletesListService'
import type { AthleteViewMode } from '../../components/admin/AthletesHeader'

interface Team {
    id: string
    name: string
}

interface Sport {
    id: string
    name: string
}

interface Program {
    id: string
    name: string
}

interface Level {
    id: string
    name: string
}

interface Season {
    id: string
    name: string
}

const DEFAULT_FILTERS: AthletesFiltersType = {
    search: '',
    sportIds: [],
    teamIds: [],
    programIds: [],
    levelIds: [],
    seasonIds: [],
    genders: [],
}

export default function AdminAthletes() {
    // View state
    const [viewMode, setViewMode] = useState<AthleteViewMode>('grid')
    const [filters, setFilters] = useState<AthletesFiltersType>(DEFAULT_FILTERS)

    // Data state
    const [athletes, setAthletes] = useState<AthleteCardData[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    // Pagination
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(24)

    // Selection and bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Dialogs
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; athlete: AthleteCardData | null }>({ open: false, athlete: null })
    const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    void actionLoading
    void actionError

    // Filter data
    const [teams, setTeams] = useState<Team[]>([])
    const [sports, setSports] = useState<Sport[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [levels, setLevels] = useState<Level[]>([])
    const [seasons, setSeasons] = useState<Season[]>([])

    const { context, isReady } = useUserContext()
    const navigate = useNavigate()
    const t = useT()

    // Load filter data (teams, sports, programs, levels, seasons) - all scoped to org
    useEffect(() => {
        if (!isReady) return

        const loadFilterData = async () => {
            try {
                // Load sports - filtered by org (via teams)
                const { data: sportsData } = await supabase
                    .from('sports')
                    .select('id, name')
                    .order('name')

                // Filter sports to only show those used by teams in this org
                const { data: orgTeams } = await supabase
                    .from('teams')
                    .select('sport_id')
                    .eq('org_id', context.orgId)

                const orgSportIds = new Set(orgTeams?.map(t => t.sport_id).filter(Boolean) || [])
                const orgSports = sportsData?.filter(s => orgSportIds.has(s.id)) || []
                if (orgSports.length > 0) setSports(orgSports)

                // Load teams
                const { data: teamsData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .order('name')
                if (teamsData) setTeams(teamsData)

                // Load programs
                const { data: programsData } = await supabase
                    .from('programs')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .order('name')
                if (programsData) setPrograms(programsData)

                // Load levels
                const { data: levelsData } = await supabase
                    .from('levels')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .order('name')
                if (levelsData) setLevels(levelsData)

                // Load seasons
                const { data: seasonsData } = await supabase
                    .from('seasons')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .order('name')
                if (seasonsData) setSeasons(seasonsData)
            } catch (err) {
                console.error('Error loading filter data:', err)
            }
        }

        loadFilterData()
    }, [context.orgId, isReady])

    // Persist view preferences to localStorage
    useEffect(() => {
        localStorage.setItem('athletesViewMode', viewMode)
    }, [viewMode])

    // Load view preferences from localStorage on mount
    useEffect(() => {
        const savedViewMode = localStorage.getItem('athletesViewMode') as AthleteViewMode
        if (savedViewMode) setViewMode(savedViewMode)
    }, [])

    const fetchAthletes = useCallback(async () => {
        if (!isReady) return

        setLoading(true)
        try {
            // Use the same RPC function as the portal Athletes page
            const { data, error } = await supabase
                .rpc('get_athletes_with_guardian_status', {
                    p_org_id: context.orgId,
                    p_limit: 10000,
                    p_offset: 0
                })

            if (error) {
                console.error('Error fetching athletes:', error)
                throw error
            }

            console.log('[AdminAthletes] Fetched athletes:', data?.length)

            if (!data || data.length === 0) {
                setAthletes([])
                setTotalCount(0)
                setLoading(false)
                return
            }

            // Enrich data with team and sport info
            const enrichedAthletes = await Promise.all(
                (data || []).map(async (d: any) => {
                    // Get primary team
                    const { data: teamMembership } = await supabase
                        .from('team_memberships')
                        .select('team:teams(id, name)')
                        .eq('athlete_id', d.athlete_id)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    // Get primary sport
                    const { data: athleteSport } = await supabase
                        .from('athlete_sports')
                        .select('sport:sports(id, name)')
                        .eq('athlete_id', d.athlete_id)
                        .eq('is_primary', true)
                        .limit(1)
                        .maybeSingle()

                    return {
                        id: d.athlete_id,
                        first_name: d.first_name,
                        last_name: d.last_name,
                        birthdate: d.birthdate,
                        gender: d.gender,
                        jersey_number: d.jersey_number,
                        photo_url: null,
                        has_profile_photo: d.has_profile_photo,
                        org_id: context.orgId,
                        primary_team: teamMembership?.team,
                        primary_sport: athleteSport?.sport,
                    } as AthleteCardData
                })
            )

            // Apply client-side filters
            let filteredAthletes: AthleteCardData[] = enrichedAthletes

            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filteredAthletes = filteredAthletes.filter((a: AthleteCardData) =>
                    `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchLower)
                )
            }

            // Gender filter
            if (filters.genders.length > 0) {
                filteredAthletes = filteredAthletes.filter((a: AthleteCardData) =>
                    a.gender && filters.genders.includes(a.gender)
                )
            }

            // Team filter
            if (filters.teamIds.length > 0) {
                filteredAthletes = filteredAthletes.filter((a: AthleteCardData) =>
                    a.primary_team && filters.teamIds.includes(a.primary_team.id as string)
                )
            }

            // Sport filter
            if (filters.sportIds.length > 0) {
                filteredAthletes = filteredAthletes.filter((a: AthleteCardData) =>
                    a.primary_sport && filters.sportIds.includes(a.primary_sport.id as string)
                )
            }

            // Sort by last name
            filteredAthletes.sort((a: AthleteCardData, b: AthleteCardData) => a.last_name.localeCompare(b.last_name))

            // Client-side pagination
            const startIndex = page * rowsPerPage
            const paginatedAthletes = filteredAthletes.slice(startIndex, startIndex + rowsPerPage)

            setAthletes(paginatedAthletes)
            setTotalCount(filteredAthletes.length)
        } catch (err) {
            console.error('Error fetching athletes:', err)
            showError(getErrorMessage(err) || 'Failed to load athletes')
            setAthletes([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
    }, [context, isReady, filters, page, rowsPerPage])

    useEffect(() => {
        fetchAthletes()
    }, [fetchAthletes])

    const handleDelete = async (_reason: string) => {
        if (!deleteDialog.athlete) return

        setActionLoading(true)
        setActionError(null)

        try {
            const result = await athletesListService.deleteAthlete(deleteDialog.athlete.id)

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete athlete')
            }

            showSuccess(t('admin.athletes.deleteSuccess'))
            setDeleteDialog({ open: false, athlete: null })
            fetchAthletes()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || t('admin.athletes.deleteFailed')
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleBulkDelete = async (_reason: string) => {
        setActionLoading(true)
        setActionError(null)

        try {
            const ids = Array.from(selectedIds)

            const result = await athletesListService.deleteAthletes(ids)

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete athletes')
            }

            showSuccess(t('admin.athletes.bulkDeleteSuccess', { count: ids.length }))
            setBulkDeleteDialog(false)
            setSelectedIds(new Set())
            fetchAthletes()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || t('admin.athletes.bulkDeleteFailed')
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleClearFilters = () => {
        setFilters(DEFAULT_FILTERS)
        setPage(0)
    }

    const handleAthleteClick = (athlete: AthleteCardData) => {
        navigate(getLink('admin.athletes.detail', { id: athlete.id }))
    }

    const handleEdit = (athlete: AthleteCardData) => {
        navigate(getLink('admin.athletes.edit', { id: athlete.id }))
    }

    const handleDeleteClick = (athlete: AthleteCardData) => {
        setDeleteDialog({ open: true, athlete })
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
            <AdminPageHeader 
                title={t('admin.athletes.title')} 
                subtitle={t('admin.athletes.subtitle')} 
            />

            <AthletesHeader
                statusContext="all"
                viewMode={viewMode}
                onStatusContextChange={() => {}}
                onViewModeChange={(mode) => {
                    setViewMode(mode)
                    setPage(0)
                }}
                onCreateClick={() => navigate(getLink('admin.athletes.create'))}
                activeCount={totalCount}
            />

            <AthletesFilters
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters)
                    setPage(0)
                }}
                teams={teams}
                sports={sports}
                programs={programs}
                levels={levels}
                seasons={seasons}
                onClearAll={handleClearFilters}
            />

            {athletes.length === 0 && !loading ? (
                <EmptyState
                    icon="person_off"
                    title={t('admin.athletes.noAthletes')}
                    description={t('admin.athletes.noAthletesDescription')}
                >
                    <button className="oa-btn oa-btn--primary" onClick={() => navigate(getLink('admin.athletes.create'))}>
                        {t('admin.athletes.add')}
                    </button>
                </EmptyState>
            ) : (
                <AthletesGrid
                    athletes={athletes}
                    loading={loading}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onRowsPerPageChange={(value) => {
                        setRowsPerPage(value)
                        setPage(0)
                    }}
                    onAthleteClick={handleAthleteClick}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    viewMode={viewMode}
                    selectable
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            )}

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onDelete={() => setBulkDeleteDialog(true)}
                onClearSelection={() => setSelectedIds(new Set())}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                title={t('admin.athletes.deleteTitle')}
                description={
                    deleteDialog.athlete
                        ? t('admin.athletes.deleteConfirm', {
                            name: `${deleteDialog.athlete.first_name} ${deleteDialog.athlete.last_name}`,
                        })
                        : ''
                }
                confirmLabel={t('common.delete')}
                variant="danger"
                onConfirm={() => { void handleDelete('') }}
                onCancel={() => {
                    setDeleteDialog({ open: false, athlete: null })
                    setActionError(null)
                }}
            />

            {/* Bulk Delete Dialog */}
            <ConfirmDialog
                open={bulkDeleteDialog}
                title={t('admin.athletes.bulkDeleteTitle')}
                description={t('admin.athletes.bulkDeleteConfirm', { count: selectedIds.size })}
                confirmLabel={t('admin.athletes.delete')}
                variant="danger"
                onConfirm={() => { void handleBulkDelete('') }}
                onCancel={() => {
                    setBulkDeleteDialog(false)
                    setActionError(null)
                }}
            />
        </div>
    )
}
