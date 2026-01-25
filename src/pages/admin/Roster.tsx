import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { 
  AdminPageHeader,
  Card, 
  Button, 
  Select, 
  PlatformDataTable, 
  type ColumnConfig 
} from '../../components/platformAdmin'

interface Season {
  id: string
  name: string
}

interface Membership {
  id: string
  child_id: string
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

  const { context, isReady } = useUserContext()

  const fetchRoster = useCallback(async (seasonId: string) => {
    if (!teamId || !isReady) return

    const { data, error } = await getTeamRoster(context, teamId, seasonId)
    
    if (error) {
      console.error('Error fetching roster:', error)
      setRoster([])
      return
    }

    // Transform to display format
    const displayRoster: Membership[] = data.map(member => ({
      id: member.id,
      child_id: member.child_id,
      child_name: getChildName(member.child_id),
      family_name: getFamilyName(member.child_id),
    }))

    setRoster(displayRoster)
  }, [teamId, context, isReady])

  const fetchSeasons = useCallback(async () => {
    if (!teamId || !isReady) return

    const { data, error } = await getTeamDetails(context, teamId)

    if (error || !data) {
      setLoading(false)
      return
    }

    if (data.seasons && data.seasons.length > 0) {
      const seasonList = data.seasons.map(s => ({
        id: s.id,
        name: s.name,
      }))
      setSeasons(seasonList)
      setSelectedSeason(seasonList[0].id)
      fetchRoster(seasonList[0].id)
    }
    setLoading(false)
  }, [teamId, context, isReady, fetchRoster])

  useEffect(() => {
    if (teamId && isReady) fetchSeasons()
  }, [teamId, isReady, fetchSeasons])

  // Helper functions to get names (in real implementation, comes from joined data)
  const getChildName = (childId: string): string => {
    const names: Record<string, string> = {
      'child-emma-001': 'Emma Johnson',
      'child-liam-002': 'Liam Williams',
      'child-sophia-003': 'Sophia Brown',
      'child-jackson-004': 'Jackson Davis',
    }
    return names[childId] ?? 'Player'
  }

  const getFamilyName = (childId: string): string => {
    const families: Record<string, string> = {
      'child-emma-001': 'Johnson Family',
      'child-liam-002': 'Williams Family',
      'child-sophia-003': 'Brown Family',
      'child-jackson-004': 'Davis Family',
    }
    return families[childId] ?? 'Family'
  }

  async function removePlayer(membershipId: string) {
    if (!window.confirm('Are you sure you want to remove this player from the roster?')) return
    
    // In fake data mode, just remove locally
    setRoster(prev => prev.filter(m => m.id !== membershipId))

    // TODO: Replace with real Supabase update when migrating
    // await supabase.from('team_memberships').update({ status: 'inactive' }).eq('id', membershipId)
  }

  const columns: ColumnConfig<Membership>[] = [
    { id: 'child_name', label: 'Player' },
    { id: 'family_name', label: 'Family' },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <button 
          className="pa-btn pa-btn--ghost pa-btn--dense" 
          onClick={(e) => { e.stopPropagation(); removePlayer(row.id); }}
          style={{ color: 'var(--pa-n900)' }}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      )
    }
  ]

  return (
    <div>
      <AdminPageHeader 
        title="Team Roster" 
        actions={
          <div className="pa-flex pa-gap-2">
            <Button onClick={() => navigate(`/admin/athletes/import?teamId=${teamId}&seasonId=${selectedSeason}`)} variant="secondary" icon="upload_file">
              Import Athletes
            </Button>
            <Button onClick={() => navigate('/admin/athletes/new')} icon="add">
              Add Athlete
            </Button>
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
        emptyMessage="No players on roster for this season."
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
    </div>
  )
}
