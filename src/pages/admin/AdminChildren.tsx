import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AdminPageHeader, PlatformDataTable, Button, Card, ErrorState, Badge } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { getAthletes } from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { Child } from '../../types/family'
import { getLink } from '../../utils/routes'
import { calculateAge } from '../../utils/athleteHelpers'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

type SortColumn = 'first_name' | 'date_of_birth' | 'has_active_guardian' | ''
type SortOrder = 'asc' | 'desc'

interface AthleteWithDetails extends Omit<Child, 'sports'> {
  sports?: Array<{ sport_id: string; sport_name: string; sport_type: 'plays' | 'interested' }>
  teams?: Array<{ team_id: string; team_name: string }>
}

export default function AdminChildren() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const t = useT()
  const [children, setChildren] = useState<AthleteWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Fetch athletes data with sports and teams
  const fetchAthletes = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)

    try {
      const { data: athletesData, error: fetchError } = await getAthletes(context)
      if (fetchError) {
        setError(fetchError)
        setChildren([])
        setLoading(false)
        return
      }

      if (!athletesData || athletesData.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      const athleteIds = athletesData.map(a => a.id)

      // Fetch sports for all athletes in batch
      const { data: sportsData } = await supabase
        .from('athlete_sports')
        .select(`
          athlete_id,
          sport_id,
          sport:sports(id, name)
        `)
        .in('athlete_id', athleteIds)
        .eq('org_id', context.orgId)
        .eq('sport_type', 'plays') // Only show sports they play, not interested

      // Fetch team memberships for all athletes in batch
      const { data: teamsData } = await supabase
        .from('team_memberships')
        .select(`
          athlete_id,
          team_id,
          teams!inner(id, name, org_id)
        `)
        .in('athlete_id', athleteIds)
        .eq('status', 'active')

      // Group sports and teams by athlete_id
      const sportsMap = new Map<string, Array<{ sport_id: string; sport_name: string }>>()
      const teamsMap = new Map<string, Array<{ team_id: string; team_name: string }>>()

      if (sportsData) {
        sportsData.forEach((row: any) => {
          const athleteId = row.athlete_id
          if (!sportsMap.has(athleteId)) {
            sportsMap.set(athleteId, [])
          }
          if (row.sport) {
            sportsMap.get(athleteId)!.push({
              sport_id: row.sport.id,
              sport_name: row.sport.name
            })
          }
        })
      }

      if (teamsData) {
        teamsData.forEach((row: any) => {
          // Only include teams from the current organization
          if (row.teams && row.teams.org_id === context.orgId) {
            const athleteId = row.athlete_id
            if (!teamsMap.has(athleteId)) {
              teamsMap.set(athleteId, [])
            }
            teamsMap.get(athleteId)!.push({
              team_id: row.teams.id,
              team_name: row.teams.name
            })
          }
        })
      }

      // Combine athlete data with sports and teams
      const athletesWithDetails: AthleteWithDetails[] = athletesData.map(athlete => ({
        ...athlete,
        sports: sportsMap.get(athlete.id) || [],
        teams: teamsMap.get(athlete.id) || []
      }))

      setChildren(athletesWithDetails)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load athletes')
      setError(error)
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    fetchAthletes()
  }, [fetchAthletes])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchAthletes()
  }, [fetchAthletes])

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    const column = columnId as SortColumn
    if (sortColumn === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column with ascending order
      setSortColumn(column)
      setSortOrder('asc')
    }
    // Reset to first page when sorting changes
    setPage(0)
  }, [sortColumn, sortOrder])

  // Sort and paginate data
  const sortedAndPaginatedData = useMemo(() => {
    let sorted = [...children]

    // Apply sorting
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aValue: any = a[sortColumn as keyof Child]
        let bValue: any = b[sortColumn as keyof Child]

        // Handle date_of_birth sorting
        if (sortColumn === 'date_of_birth') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        } else if (sortColumn === 'first_name') {
          // Sort by first name, then last name
          const aFullName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          const bFullName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          if (aFullName < bFullName) return sortOrder === 'asc' ? -1 : 1
          if (aFullName > bFullName) return sortOrder === 'asc' ? 1 : -1
          return 0
        } else {
          // String comparison for other fields
          aValue = String(aValue || '').toLowerCase()
          bValue = String(bValue || '').toLowerCase()
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = page * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return sorted.slice(startIndex, endIndex)
  }, [children, sortColumn, sortOrder, page, rowsPerPage])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    const totalPages = Math.max(1, Math.ceil(children.length / rowsPerPage))
    const safePage = Math.max(0, Math.min(newPage, totalPages - 1))
    setPage(safePage)
  }, [children.length, rowsPerPage])

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0) // Reset to first page
  }, [])

  // Handle row click - navigate to athlete detail
  const handleRowClick = useCallback((child: AthleteWithDetails) => {
    if (!child?.id) {
      console.warn('[AdminChildren] Cannot navigate: athlete missing ID', child)
      return
    }
    
    try {
      // Navigate to athlete detail page (preferred)
      navigate(getLink('admin.athletes.detail', { id: child.id }))
    } catch (err) {
      console.error('[AdminChildren] Navigation error:', err)
      // Fallback to family if athlete detail fails
      if (child.family_id) {
        navigate(getLink('admin.guardians.detail', { id: child.family_id }))
      }
    }
  }, [navigate])

  // Handle sport link click
  const handleSportClick = useCallback((e: React.MouseEvent, sportId: string) => {
    e.stopPropagation()
    try {
      navigate(getLink('admin.sports.detail', { id: sportId }))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to sport:', err)
    }
  }, [navigate])

  // Handle team link click
  const handleTeamClick = useCallback((e: React.MouseEvent, teamId: string) => {
    e.stopPropagation()
    try {
      navigate(getLink('admin.teams.detail', { id: teamId }))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to team:', err)
    }
  }, [navigate])

  // Handle "Import Athletes" button click
  const handleImportClick = useCallback(() => {
    if (loading) return
    try {
      navigate(getLink('admin.athletes.import'))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to import:', err)
    }
  }, [navigate, loading])

  // Handle "Add Athlete" button click
  const handleAddAthleteClick = useCallback(() => {
    if (loading) return
    try {
      navigate(getLink('admin.athletes.create'))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to create:', err)
    }
  }, [navigate, loading])

  const columns: ColumnConfig<AthleteWithDetails>[] = useMemo(() => [
    {
      id: 'first_name',
      label: 'Name',
      sortable: true,
      render: (c) => <span className="pa-text-primary" style={{ fontWeight: 600 }}>{c?.first_name} {c?.last_name}</span>
    },
    {
      id: 'has_active_guardian',
      label: 'Guardian',
      sortable: true,
      render: (c) => {
        const hasActive = c?.has_active_guardian ?? false
        return (
          <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-2')}>
            {hasActive ? (
                <Badge variant="success" className="pa-flex pa-items-center pa-gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                    Connected
                </Badge>
            ) : (
                <Badge variant="neutral" className="pa-flex pa-items-center pa-gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span>
                    Not connected
                </Badge>
            )}
          </div>
        )
      }
    },
    {
      id: 'date_of_birth',
      label: 'Age',
      sortable: true,
      render: (c) => {
        const age = calculateAge(c?.date_of_birth || null)
        return age !== null ? `${age}` : '-'
      }
    },
    {
      id: 'sports',
      label: 'Sports',
      render: (c) => {
        const sports = c?.sports || []
        if (sports.length === 0) {
          return <span className="pa-text-muted">—</span>
        }
        return (
          <div className={cn('pa-flex', 'pa-flex-wrap', 'pa-gap-1', 'pa-items-center')}>
            {sports.map((sport: { sport_id: string; sport_name: string; sport_type: 'plays' | 'interested' }, idx: number) => (
              <span key={sport.sport_id}>
                <Link
                  to={getLink('admin.sports.detail', { id: sport.sport_id })}
                  className="pa-link"
                  onClick={(e) => handleSportClick(e, sport.sport_id)}
                  style={{ fontSize: 'var(--pa-font-size-s)' }}
                >
                  {sport.sport_name}
                </Link>
                {idx < sports.length - 1 && <span style={{ marginLeft: 'var(--pa-space-1)' }}>,</span>}
              </span>
            ))}
          </div>
        )
      }
    },
    {
      id: 'teams',
      label: 'Teams',
      render: (c) => {
        const teams = c?.teams || []
        if (teams.length === 0) {
          return <span className="pa-text-muted">—</span>
        }
        return (
          <div className={cn('pa-flex', 'pa-flex-wrap', 'pa-gap-1', 'pa-items-center')}>
            {teams.map((team: { team_id: string; team_name: string }, idx: number) => (
              <span key={team.team_id}>
                <Link
                  to={getLink('admin.teams.detail', { id: team.team_id })}
                  className="pa-link"
                  onClick={(e) => handleTeamClick(e, team.team_id)}
                  style={{ fontSize: 'var(--pa-font-size-s)' }}
                >
                  {team.team_name}
                </Link>
                {idx < teams.length - 1 && <span style={{ marginLeft: 'var(--pa-space-1)' }}>,</span>}
              </span>
            ))}
          </div>
        )
      }
    }
  ], [handleSportClick, handleTeamClick])

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.children.title')}
        actions={
          <div className={cn('pa-flex', 'pa-gap-2')}>
            <Button 
              onClick={handleImportClick} 
              icon="upload_file" 
              variant="secondary"
              disabled={loading}
            >
              Import Athletes
            </Button>
            <Button 
              onClick={handleAddAthleteClick} 
              icon="add"
              disabled={loading}
            >
              Add Athlete
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState 
            title={t('admin.children.errorLoading')}
            message={error.message || 'An error occurred while loading athletes'}
            onRetry={handleRetry}
        />
      ) : (
        <PlatformDataTable
          data={sortedAndPaginatedData}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage={t('admin.children.emptyMessage')}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={children.length}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          orderBy={sortColumn}
          order={sortOrder}
          onSort={handleSort}
        />
      )}
    </div>
  )
}
