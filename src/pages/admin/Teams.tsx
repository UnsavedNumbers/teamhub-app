import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptTeamToTableRow, TeamTableRow } from '../../utils/dataAdapters'
import type { Database } from '../../lib/database.types.ts'
import { 
  PageHeader, 
  Card, 
  EmptyState, 
  Button, 
  Input 
} from '../../components/platformAdmin'

type TeamRow = Database['public']['Tables']['teams']['Row']

export default function Teams() {
  const [teams, setTeams] = useState<TeamTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching teams:', error)
        return
      }

      const teamRows = (data || []) as TeamRow[]
      setTeams(teamRows.map((team) => adaptTeamToTableRow(team, 0, 0, 0)))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id])

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchTeams()
    }
  }, [currentOrganization, fetchTeams])

  async function handleCreateTeam() {
    if (!newTeamName.trim() || !currentOrganization?.id) return

    setCreating(true)
    setError(null)

    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      org_id: currentOrganization.id,
    } as never)

    if (error) {
      setError(error.message)
    } else {
      setNewTeamName('')
      setShowCreateModal(false)
      fetchTeams()
    }
    setCreating(false)
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
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                Create Team
              </Button>
            }
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
