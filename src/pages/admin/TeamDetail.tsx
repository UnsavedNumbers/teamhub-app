import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails } from '../../data/services/teamsService'
import { 
  PageHeader, 
  Card, 
  Button, 
  Badge, 
  Input, 
  EmptyState 
} from '../../components/platformAdmin'

interface Team { id: string; name: string }
interface Season { id: string; name: string; start_date: string; end_date: string; is_active: boolean }

export default function TeamDetail() {
  const { teamId } = useTeamParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonForm, setSeasonForm] = useState({ name: '', start_date: '', end_date: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchTeamAndSeasons = useCallback(async () => {
    if (!teamId || !isReady) return
    
    setLoading(true)
    const { data: teamData, error: teamError } = await getTeamDetails(context, teamId)
    
    if (teamError || !teamData) {
      setLoading(false)
      return
    }

    // Note: sport_name, program_name, level_name are computed properties, not stored on Team
    setTeam({
      id: teamData.id,
      name: teamData.name,
      // These would need to be added to the Team type or computed separately
      // sport_name: teamData.sport?.name,
      // program_name: teamData.program?.name,
      // level_name: teamData.level?.name
    })

    // Transform seasons from fake data
    if (teamData.seasons) {
      setSeasons(teamData.seasons.map(s => ({
        id: s.id,
        name: s.name,
        start_date: s.start_date,
        end_date: s.end_date,
        is_active: s.is_active,
      })))
    }

    setLoading(false)
  }, [teamId, context, isReady])

  useEffect(() => { 
    fetchTeamAndSeasons() 
  }, [fetchTeamAndSeasons])

  const handleCreateSeason = async () => {
    if (!seasonForm.name.trim() || !teamId) return
    
    setCreating(true)
    setError(null)

    // In fake data mode, just add locally
    const newSeason: Season = {
      id: `season-new-${Date.now()}`,
      name: seasonForm.name.trim(),
      start_date: seasonForm.start_date,
      end_date: seasonForm.end_date,
      is_active: false,
    }

    setSeasons(prev => [newSeason, ...prev])
    setSeasonForm({ name: '', start_date: '', end_date: '' })
    setShowSeasonModal(false)
    setCreating(false)

    // TODO: Replace with real Supabase insert when migrating
    // const { error } = await supabase.from('seasons').insert({ ... })
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '400px' }} />
  if (!team) return <PageHeader title="Team not found" actions={<Button variant="secondary" onClick={() => navigate('/admin/teams')}>Back</Button>} />

  return (
    <div className="pa-root">
      <PageHeader 
        title={team.name} 
        breadcrumbs={[
            { label: 'Teams', onClick: () => navigate('/admin/teams') },
            { label: team.name }
        ]}
        actions={
            <div className="pa-flex pa-gap-2 pa-text-sm pa-text-muted">
                {/* Safe access to optional properties we might have attached to team state */}
                {/* Note: team state here is local Team interface. We need to store extra details if we want to show them. */}
            </div>
        }
      />
      {/* Detail Context Banner */}
      <div className="pa-mb-6 pa-p-4 pa-bg-gray-50 pa-border pa-rounded pa-flex pa-gap-6 pa-items-center">
         {(team as any).sport_name && (
             <div className="pa-flex pa-flex-col">
                 <span className="pa-text-xs pa-text-muted pa-uppercase">Sport</span>
                 <span className="pa-font-medium">{(team as any).sport_name}</span>
             </div>
         )}
         {(team as any).program_name && (
             <div className="pa-flex pa-flex-col">
                 <span className="pa-text-xs pa-text-muted pa-uppercase">Program</span>
                 <span className="pa-font-medium">{(team as any).program_name}</span>
             </div>
         )}
         {(team as any).level_name && (
             <div className="pa-flex pa-flex-col">
                 <span className="pa-text-xs pa-text-muted pa-uppercase">Level</span>
                 <span className="pa-font-medium">{(team as any).level_name}</span>
             </div>
         )}
      </div>

      {/* Custom Tabs */}
      <div className="pa-tabs pa-mb-6">
        {['overview', 'seasons', 'roster'].map(tab => (
          <button 
            key={tab} 
            className={`pa-tab ${activeTab === tab ? 'pa-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="pa-grid pa-grid-3">
          <Card className="pa-clickable" onClick={() => navigate(`/admin/teams/${teamId}/roster`)}>
            <div className="pa-flex pa-items-center pa-gap-4">
              <div style={{ background: 'var(--pa-n900)', color: 'var(--pa-white)', padding: 'var(--pa-space-3)', display: 'flex' }}><span className="material-symbols-outlined">people</span></div>
              <div>
                <h3 className="pa-h3 pa-mb-1">MANAGE ROSTER</h3>
                <div className="pa-body-s pa-text-muted">Add or remove players</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'seasons' && (
        <div>
          <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
            <h3 className="pa-h3">SEASONS</h3>
            <Button variant="secondary" onClick={() => setShowSeasonModal(true)}>New Season</Button>
          </div>
          {seasons.length === 0 ? (
            <Card><EmptyState icon="calendar_today" title="NO SEASONS" description="Create a season to start assigning rosters." action={{ label: 'Create Season', onClick: () => setShowSeasonModal(true) }} /></Card>
          ) : (
            <div className="pa-grid pa-grid-2">
              {seasons.map(s => (
                <Card key={s.id}>
                  <div className="pa-flex pa-justify-between pa-items-start">
                    <div>
                      <h4 className="pa-h4 pa-mb-1">{s.name}</h4>
                      <div className="pa-body-s pa-text-muted">{new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}</div>
                      {s.is_active && <div className="pa-mt-2"><Badge variant="success">ACTIVE</Badge></div>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <Card>
          <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
            <h3 className="pa-h3">ROSTER</h3>
            <Button onClick={() => navigate(`/admin/teams/${teamId}/roster`)}>Manage Roster</Button>
          </div>
          <p className="pa-body-m">View and manage the players assigned to this team across all seasons.</p>
        </Card>
      )}

      {showSeasonModal && (
        <div className="pa-modal-overlay" onClick={() => setShowSeasonModal(false)}>
          <div className="pa-card pa-modal" onClick={e => e.stopPropagation()}>
            <h2 className="pa-h2 pa-mb-4">CREATE SEASON</h2>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            <div className="pa-flex pa-flex-col pa-gap-4">
              <Input label="Season Name" value={seasonForm.name} onChange={e => setSeasonForm({...seasonForm, name: e.target.value})} placeholder="e.g. Spring 2024" />
              <Input label="Start Date" type="date" value={seasonForm.start_date} onChange={e => setSeasonForm({...seasonForm, start_date: e.target.value})} />
              <Input label="End Date" type="date" value={seasonForm.end_date} onChange={e => setSeasonForm({...seasonForm, end_date: e.target.value})} />
            </div>
            <div className="pa-flex pa-gap-3 pa-mt-6 pa-justify-end">
              <Button variant="secondary" onClick={() => setShowSeasonModal(false)}>Cancel</Button>
              <Button onClick={handleCreateSeason} loading={creating} disabled={creating || !seasonForm.name.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
