import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { getTeams } from '../../data/services/teamsService'
import { 
  PageHeader, 
  Card, 
  EmptyState, 
  Button, 
  Input 
} from '../../components/platformAdmin'

interface TeamDisplay {
  id: string
  name: string
  playerCount: number
}

export default function Teams() {
  const [teams, setTeams] = useState<TeamDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchTeams = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    try {
      const { data, error } = await getTeams(context, { activeOnly: false })

      if (error) {
        console.error('Error fetching teams:', error)
        return
      }

      // Transform to display format
      const teamDisplay: TeamDisplay[] = data.map(team => ({
        id: team.id,
        name: team.name,
        playerCount: 0, // TODO: Get actual player count from roster
      }))
      
      setTeams(teamDisplay)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    if (isReady) {
      fetchTeams()
    }
  }, [isReady, fetchTeams])

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return

    setCreating(true)
    setError(null)

    // In fake data mode, just add locally
    const newTeam: TeamDisplay = {
      id: `team-new-${Date.now()}`,
      name: newTeamName.trim(),
      playerCount: 0,
    }

    setTeams(prev => [...prev, newTeam])
    setNewTeamName('')
    setShowCreateModal(false)
    setCreating(false)

    // TODO: Replace with real Supabase insert when migrating
    // const { error } = await supabase.from('teams').insert({ ... })
  }

  if (loading && teams.length === 0) {
    return (
      <div className="pa-flex pa-flex-col pa-gap-4">
        <div className="pa-skeleton" style={{ height: '40px', width: '200px' }} />
        <div className="pa-grid pa-grid-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="pa-skeleton" style={{ height: '120px' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader 
        title="Teams" 
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined">add</span>
            New Team
          </Button>
        }
      />

      {teams.length === 0 ? (
        <Card>
          <EmptyState
            icon="groups"
            title="NO TEAMS YET"
            description="Create your first team to start managing rosters and schedules."
            action={{
              label: 'Create Team',
              onClick: () => setShowCreateModal(true)
            }}
          />
        </Card>
      ) : (
        <div className="pa-grid pa-grid-3">
          {teams.map((team) => (
            <Card 
              key={team.id}
              onClick={() => navigate(`/admin/teams/${team.id}`)}
              className="pa-clickable"
            >
              <div className="pa-flex pa-items-center pa-gap-4">
                <div 
                  style={{ 
                    background: 'var(--pa-n900)', 
                    color: 'var(--pa-white)',
                    padding: 'var(--pa-space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span className="material-symbols-outlined">groups</span>
                </div>
                <div>
                  <h3 className="pa-h3 pa-mb-1">{team.name}</h3>
                  <div className="pa-body-s pa-text-muted">{team.playerCount} players</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Basic Create Modal */}
      {showCreateModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, 
            background: 'rgba(11,15,20,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000 
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="pa-card" 
            style={{ width: '100%', maxWidth: '450px', padding: 'var(--pa-space-5)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="pa-h2 pa-mb-4">CREATE TEAM</h2>
            {error && (
              <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-danger-bg)', border: 'none', color: 'var(--pa-n900)' }}>
                {error}
              </div>
            )}
            <Input 
              label="Team Name"
              placeholder="e.g. U12 Lightning"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              autoFocus
            />
            <div className="pa-flex pa-gap-3 pa-mt-5 pa-justify-end">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()} loading={creating}>
                Create Team
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
