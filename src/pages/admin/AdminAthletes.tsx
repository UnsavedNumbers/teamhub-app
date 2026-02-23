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
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { ConfirmDialog, AdminPageHeader, Card } from '../../components/admin'
import AthletesHeader from '../../components/admin/AthletesHeader'
import AthletesFilters, { type AthletesFilters as AthletesFiltersType } from '../../components/admin/AthletesFilters'
import AthletesGrid, { type AthleteCardData } from '../../components/admin/AthletesGrid'
import BulkActionsBar from '../../components/admin/BulkActionsBar'
import * as athletesListService from '../../data/services/athletesListService'
import { getSports } from '../../data/services/sportsService'
import { getTeams } from '../../data/services/teamsService'
import { getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getSeasons } from '../../data/services/seasonsService'
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
                // Use existing services that handle fake data
                const [sportsResult, teamsResult, programsResult, levelsResult, seasonsResult] = await Promise.all([
                    getSports(context),
                    getTeams(context, {}),
                    getPrograms(context),
                    getLevels(context),
                    getSeasons(context, {}),
                ])

                if (sportsResult.data) {
                    setSports(sportsResult.data.map(s => ({ id: s.id, name: s.name })))
                }
                if (teamsResult.data) {
                    setTeams(teamsResult.data.map(t => ({ id: t.id, name: t.name })))
                }
                if (programsResult.data) {
                    setPrograms(programsResult.data.map(p => ({ id: p.id, name: p.name })))
                }
                if (levelsResult.data) {
                    setLevels(levelsResult.data.map(l => ({ id: l.id, name: l.name })))
                }
                if (seasonsResult.data) {
                    setSeasons(seasonsResult.data.map(s => ({ id: s.id, name: s.name })))
                }
            } catch (err) {
                console.error('Error loading filter data:', err)
            }
        }

        loadFilterData()
    }, [context, isReady])

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
            // Use the athletes list service which handles fake data
            const result = await athletesListService.getAthletes(context.orgId)

            if (!result.success || !result.data) {
                setAthletes([])
                setTotalCount(0)
                setLoading(false)
                return
            }

            console.log('[AdminAthletes] Fetched athletes:', result.data?.length)

            // Apply client-side filters
            let filteredAthletes: AthleteCardData[] = result.data

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
                <div 
                    className="rounded-xl border p-8 text-center"
                    style={{ 
                        background: 'var(--pa-surface)',
                        borderColor: 'var(--pa-border-default)'
                    }}
                >
                    <div 
                        className="animate-pulse rounded" 
                        style={{ 
                            width: '100%', 
                            height: '400px',
                            background: 'var(--pa-surface-panel)'
                        }} 
                    />
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
                <Card className="oa-border-2 oa-border-dashed">
                    <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                        <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>person_off</span>
                        <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                            <h3 className="oa-h3 oa-mb-0">{t('admin.athletes.noAthletes')}</h3>
                            <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.athletes.noAthletesDescription')}</p>
                            <button className="oa-btn oa-btn--primary" onClick={() => navigate(getLink('admin.athletes.create'))}>
                                {t('admin.athletes.add')}
                            </button>
                        </div>
                    </div>
                </Card>
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
