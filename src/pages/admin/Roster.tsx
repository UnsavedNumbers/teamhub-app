import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { 
  AdminPageHeader,
  Card, 
  Button, 
  Select, 
  PlatformDataTable, 
  type ColumnConfig,
  ConfirmDialog
} from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'

interface Season {
  id: string
  name: string
}

interface Membership {
  id: string
  athlete_id: string
  child_name: string
  family_name: string
}

export default function Roster() {
  const navigate = useNavigate()
  const { teamId } = useTeamParams()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [roster, setRoster] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null)
  const [teamInfo, setTeamInfo] = useState<{
    name: string
    sport?: { name: string; id?: string; slug?: string }
    program?: { name: string; id?: string }
    level?: { name: string; id?: string }
  } | null>(null)

  const { context, isReady } = useUserContext()

  const fetchRoster = useCallback(async (seasonId: string) => {
    if (!teamId || !isReady || !seasonId) {
      setRoster([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await getTeamRoster(context, teamId, seasonId)
      
      if (error) {
        console.error('Error fetching roster:', error)
        setRoster([])
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setRoster([])
        setLoading(false)
        return
      }

      // Get athlete IDs
      const athleteIds = data.map(m => m.athlete_id ?? (m as { child_id?: string }).child_id).filter(Boolean) as string[]
      
      if (athleteIds.length === 0) {
        setRoster([])
        setLoading(false)
        return
      }

      // Fetch athlete details
      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('id, first_name, last_name')
        .in('id', athleteIds)

      if (athletesError) {
        console.error('Error fetching athletes:', athletesError)
        setRoster([])
        setLoading(false)
        return
      }

      // Create athlete map
      const athleteMap = new Map(
        (athletesData || []).map((a: any) => [a.id, { first_name: a.first_name, last_name: a.last_name }])
      )

      // Fetch guardian information for family names
      // Get user_ids from athlete_guardians, then fetch user details
      const { data: guardianLinks, error: guardiansError } = await supabase
        .from('athlete_guardians')
        .select('athlete_id, user_id')
        .in('athlete_id', athleteIds)
        .eq('org_id', context.orgId)
        .eq('status', 'active')

      // Create family name map
      const familyMap = new Map<string, string>()
      if (!guardiansError && guardianLinks && guardianLinks.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(guardianLinks.map((ag: any) => ag.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          // Fetch user details
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, email')
            .in('id', userIds)

          // Create user map
          const userMap = new Map(
            (usersData || []).map((u: any) => [u.id, { display_name: u.display_name, email: u.email }])
          )

          // Map athletes to family names (use first guardian found)
          guardianLinks.forEach((ag: any) => {
            if (ag.athlete_id && !familyMap.has(ag.athlete_id)) {
              const user = userMap.get(ag.user_id)
              if (user) {
                const displayName = user.display_name || user.email || ''
                // Extract last name from display name or use email prefix
                const familyName = displayName.split(' ').pop() || displayName.split('@')[0] || 'Family'
                familyMap.set(ag.athlete_id, familyName)
              }
            }
          })
        }
      }

      // Transform to display format
      const displayRoster: Membership[] = data.map(member => {
        const memberAthleteId = member.athlete_id ?? (member as { child_id?: string }).child_id ?? ''
        const athlete = athleteMap.get(memberAthleteId)
        const athleteName = athlete 
          ? `${athlete.first_name} ${athlete.last_name}`.trim()
          : 'Unknown Player'
        // Use guardian's family name, or athlete's last name, or "No Family"
        const familyName = familyMap.get(memberAthleteId) || athlete?.last_name || 'No Family'

        return {
          id: member.id,
          athlete_id: memberAthleteId,
          child_name: athleteName,
          family_name: familyName,
        }
      })

      setRoster(displayRoster)
    } catch (error) {
      console.error('Error in fetchRoster:', error)
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [teamId, context, isReady])

  const fetchSeasons = useCallback(async () => {
    if (!teamId || !isReady) return

    const { data, error } = await getTeamDetails(context, teamId)

    if (error || !data) {
      setLoading(false)
      return
    }

    // Store team info for breadcrumbs
    setTeamInfo({
      name: data.name,
      sport: (data as any).sport,
      program: (data as any).program,
      level: (data as any).level,
    })

    let seasonList: Season[] = []

    if (data.seasons && data.seasons.length > 0) {
      seasonList = data.seasons.map(s => ({
        id: s.id,
        name: s.name,
      }))
    } else {
      // Try to fetch seasons directly if not included in team data
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('team_seasons')
        .select('season:seasons(id, name)')
        .eq('team_id', teamId)

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError)
      } else if (seasonsData && seasonsData.length > 0) {
        seasonList = seasonsData.map((s: any) => ({
          id: s.season.id,
          name: s.season.name,
        }))
      }
    }

    if (seasonList.length > 0) {
      setSeasons(seasonList)
      setSelectedSeason(seasonList[0].id)
      // fetchRoster will manage loading state
      fetchRoster(seasonList[0].id)
    } else {
      setLoading(false)
    }
  }, [teamId, context, isReady, fetchRoster])

  useEffect(() => {
    if (teamId && isReady) fetchSeasons()
  }, [teamId, isReady, fetchSeasons])

  function handleRemovePlayerClick(membershipId: string) {
    setPlayerToRemove(membershipId)
  }

  async function handleConfirmRemovePlayer() {
    if (!playerToRemove) return
    
    try {
      // Update team membership status to inactive
      const { error } = await supabase
        .from('team_memberships')
        .update({ status: 'removed' })
        .eq('id', playerToRemove)

      if (error) {
        console.error('Error removing player:', error)
        // Still remove from UI on error for better UX
      }

      // Remove from local state
      setRoster(prev => prev.filter(m => m.id !== playerToRemove))
      
      // Refresh roster to ensure consistency
      if (selectedSeason) {
        fetchRoster(selectedSeason)
      }
    } catch (error) {
      console.error('Error removing player:', error)
    } finally {
      setPlayerToRemove(null)
    }
  }

  const columns: ColumnConfig<Membership>[] = [
    { id: 'child_name', label: 'Player' },
    { id: 'family_name', label: 'Family' },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <Button
          variant="danger"
          size="dense"
          icon="delete"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRemovePlayerClick(row.id); }}
        />
      )
    }
  ]

  // Build breadcrumbs
  const breadcrumbs = []
  if (teamInfo?.sport?.name) {
    breadcrumbs.push({
      label: teamInfo.sport.name,
      path: teamInfo.sport.id 
        ? getLink('admin.sports.detail', { sport_slug: teamInfo.sport.slug ?? teamInfo.sport.id })
        : getLink('admin.sports.list'),
    })
  }
  if (teamInfo?.program?.name) {
    breadcrumbs.push({
      label: teamInfo.program.name,
      path: teamInfo.program.id
        ? getLink('admin.programs.detail', { id: teamInfo.program.id })
        : getLink('admin.programs.list'),
    })
  }
  if (teamInfo?.level?.name) {
    breadcrumbs.push({
      label: teamInfo.level.name,
      path: teamInfo.level.id
        ? getLink('admin.levels.detail', { id: teamInfo.level.id })
        : undefined,
    })
  }
  if (teamInfo?.name) {
    breadcrumbs.push({
      label: teamInfo.name,
      path: teamId ? getLink('admin.teams.detail', { id: teamId }) : undefined,
    })
  }
  breadcrumbs.push({ label: 'Team Roster' })

  return (
    <div>
      <AdminPageHeader 
        title="Team Roster"
        breadcrumbs={breadcrumbs}
        actions={
          <div className="pa-flex pa-gap-2">
            <Button onClick={() => navigate(`/admin/athletes/import?teamId=${teamId}&seasonId=${selectedSeason}`)} variant="secondary" icon="upload_file">
              Import Athletes
            </Button>
            <OrgAdminButton onClick={() => navigate(getLink('admin.athletes.create'))} variant="primary" className="w-full sm:w-auto" icon="add">
              Add Athlete
            </OrgAdminButton>
          </div>
        }
      />

      <Card className="pa-mb-4">
        <Select 
          label="Season"
          value={selectedSeason}
          onChange={(e) => {
            setSelectedSeason(e.target.value)
            fetchRoster(e.target.value)
          }}
          options={seasons.map(s => ({ value: s.id, label: s.name }))}
        />
      </Card>

      <PlatformDataTable
        columns={columns}
        rows={roster}
        loading={loading}
        totalCount={roster.length}
        page={0}
        rowsPerPage={100}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
        emptyMessage={selectedSeason ? "No players on roster for this season." : "Select a season to view the roster."}
      />

      {/* Basic modal replacement */}
      {showAddModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, 
            background: 'rgba(11,15,20,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000 
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="pa-card" 
            style={{ width: '100%', maxWidth: '450px', padding: 'var(--pa-space-5)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="pa-h2 pa-mb-4">ADD PLAYER</h2>
            <p className="pa-body-m pa-mb-5">Player selection logic would be implemented here.</p>
            <div className="pa-flex pa-justify-end">
              <Button onClick={() => setShowAddModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Confirmation Dialog */}
      <ConfirmDialog
        open={!!playerToRemove}
        title="Remove Player"
        description="Are you sure you want to remove this player from the roster?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemovePlayer}
        onCancel={() => setPlayerToRemove(null)}
      />
    </div>
  )
}
