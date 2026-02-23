import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { isBelowMinimumRosterSize } from '../../utils/rosterValidation'
import { useFeatureGate } from '../../lib/featureGate/useFeatureGate'
import { useT } from '../../i18n/useI18n'
import { useOffline } from '../../hooks/useOffline'
import { showSuccess, showError } from '../../utils/toast'
import '../../styles/orgAdmin.css'
import { 
  AdminPageHeader,
  Card, 
  Button, 
  Select, 
  ConfirmDialog,
  OrgDataTable,
  EmptyState,
  type ColumnConfig
} from '../../components/admin'
import { TransferPlayerModal } from '../../components/admin/TransferPlayerModal'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import type { Team } from '../../data/types/organization'

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
  const [playerToTransfer, setPlayerToTransfer] = useState<{
    membershipId: string
    athleteId: string
    athleteName: string
  } | null>(null)
  const [teamInfo, setTeamInfo] = useState<{
    name: string
    sport?: { name: string; id?: string; slug?: string }
    program?: { name: string; id?: string }
    level?: { name: string; id?: string }
    min_roster_size?: number | null
    max_roster_size?: number | null
  } | null>(null)

  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const transferFeatureGate = useFeatureGate('player_transfer')
  const t = useT()

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

    // Store team info for breadcrumbs and roster size limits
    const team = data as Team
    setTeamInfo({
      name: team.name,
      sport: (team as any).sport,
      program: (team as any).program,
      level: (team as any).level,
      min_roster_size: team.min_roster_size,
      max_roster_size: team.max_roster_size,
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
    if (!playerToRemove || isOffline) return
    
    try {
      // Soft delete team membership to preserve history
      const { error } = await supabase
        .from('team_memberships')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', playerToRemove)

      if (error) {
        console.error('Error removing player:', error)
        showError(error.message || t('admin.roster.removePlayerError') || 'Failed to remove player')
        return
      }

      showSuccess(t('admin.roster.removePlayerSuccess') || 'Player removed successfully')
      
      // Remove from local state
      setRoster(prev => prev.filter(m => m.id !== playerToRemove))
      
      // Refresh roster to ensure consistency
      if (selectedSeason) {
        fetchRoster(selectedSeason)
      }
    } catch (error) {
      console.error('Error removing player:', error)
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
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
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="dense"
            icon="swap_horiz"
            onClick={(e: React.MouseEvent) => { 
              e.stopPropagation()
              if (transferFeatureGate.allowed && !isOffline) {
                setPlayerToTransfer({
                  membershipId: row.id,
                  athleteId: row.athlete_id,
                  athleteName: row.child_name || 'Unknown Player',
                })
              }
            }}
            disabled={!transferFeatureGate.allowed || isOffline}
            title={
              !transferFeatureGate.allowed 
                ? 'Player transfer is not available for your organization'
                : isOffline
                ? 'Cannot transfer player while offline'
                : t('admin.roster.transferPlayer')
            }
          />
          <Button
            variant="danger"
            size="dense"
            icon="delete"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRemovePlayerClick(row.id); }}
            disabled={isOffline}
            title={isOffline ? 'Cannot remove player while offline' : t('admin.roster.removePlayer')}
          />
        </div>
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
          <div className="oa-flex oa-gap-2">
            <Button onClick={() => navigate(`/admin/athletes/import?teamId=${teamId}&seasonId=${selectedSeason}`)} variant="secondary" icon="upload_file">
              Import Athletes
            </Button>
            <OrgAdminButton onClick={() => navigate(getLink('admin.athletes.create'))} variant="primary" className="w-full sm:w-auto" icon="add">
              Add Athlete
            </OrgAdminButton>
          </div>
        }
      />

      <Card className="oa-mb-4">
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

      {/* Minimum Roster Size Warning */}
      {teamInfo?.min_roster_size && teamInfo.min_roster_size > 0 && isBelowMinimumRosterSize(roster.length, teamInfo.min_roster_size) && (
        <Card className="oa-mb-4" style={{
          background: 'var(--oa-warning-bg, #fffbeb)',
          borderLeft: '4px solid var(--oa-warning, #f59e0b)',
        }}>
          <div style={{ padding: 'var(--oa-space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--oa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--oa-warning, #f59e0b)', fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
              warning
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--oa-text, #1e293b)' }}>
                {t('admin.roster.belowMinimumWarning')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--oa-text-muted, #64748b)' }}>
                {t('admin.roster.belowMinimumMessage', { 
                  currentCount: roster.length, 
                  minSize: teamInfo.min_roster_size 
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="oa-spinner" style={{ margin: '0 auto 1rem' }} />
            <p className="oa-body-m oa-text-muted">{t('common.loading')}</p>
          </div>
        </Card>
      ) : roster.length === 0 ? (
        <Card>
          <EmptyState
            icon="groups"
            title={t('admin.roster.emptyTitle') || 'No Players on Roster'}
            description={
              selectedSeason 
                ? (t('admin.roster.emptyDescription') || 'Add players to this team roster to get started.')
                : (t('admin.roster.emptyDescriptionNoSeason') || 'Select a season to view the roster.')
            }
            noCard
          />
        </Card>
      ) : (
        <OrgDataTable
          columns={columns}
          rows={roster}
          loading={false}
          totalCount={roster.length}
          page={0}
          rowsPerPage={100}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          emptyMessage={t('admin.roster.emptyMessage') || 'No players on roster'}
        />
      )}

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
            className="oa-card" 
            style={{ width: '100%', maxWidth: '450px', padding: 'var(--oa-space-5)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="oa-h2 oa-mb-4">ADD PLAYER</h2>
            <p className="oa-body-m oa-mb-5">Player selection logic would be implemented here.</p>
            <div className="oa-flex oa-justify-end">
              <Button onClick={() => setShowAddModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Player Modal */}
      {playerToTransfer && context && (
        <TransferPlayerModal
          open={!!playerToTransfer}
          athleteId={playerToTransfer.athleteId}
          athleteName={playerToTransfer.athleteName}
          fromTeamId={teamId}
          fromTeamName={teamInfo?.name || 'Unknown Team'}
          seasonId={selectedSeason}
          orgId={context.orgId}
          onClose={() => setPlayerToTransfer(null)}
          onSuccess={() => {
            if (selectedSeason) {
              fetchRoster(selectedSeason)
            }
          }}
        />
      )}

      {/* Remove Player Confirmation Dialog */}
      <ConfirmDialog
        open={!!playerToRemove}
        title={t('admin.roster.removePlayer')}
        description={t('admin.roster.removePlayerConfirm')}
        confirmLabel={t('admin.roster.removePlayer')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleConfirmRemovePlayer}
        onCancel={() => setPlayerToRemove(null)}
      />
    </div>
  )
}
