import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamParams } from '../../hooks/useRouteParams'
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

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchTeamAndSeasons = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single()
    const { data: seasonsData } = await supabase.from('seasons').select('*').eq('team_id', teamId).order('start_date', { ascending: false })
    if (teamData) setTeam(teamData as Team)
    if (seasonsData) setSeasons(seasonsData as Season[])
    setLoading(false)
  }, [teamId])

  useEffect(() => { fetchTeamAndSeasons() }, [fetchTeamAndSeasons])

  const handleCreateSeason = async () => {
    if (!seasonForm.name.trim() || !teamId) return
    setCreating(true); setError(null)
    const { error } = await supabase.from('seasons').insert({ team_id: teamId, name: seasonForm.name.trim(), start_date: seasonForm.start_date, end_date: seasonForm.end_date } as never)
    if (error) setError(error.message)
    else { setSeasonForm({ name: '', start_date: '', end_date: '' }); setShowSeasonModal(false); fetchTeamAndSeasons(); }
    setCreating(false)
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '400px' }} />
  if (!team) return <PageHeader title="Team not found" actions={<Button variant="secondary" onClick={() => navigate('/admin/teams')}>Back</Button>} />

  return (
    <div className="pa-root">
      <PageHeader title={team.name} />

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
            <Card><EmptyState icon="calendar_today" title="NO SEASONS" description="Create a season to start assigning rosters." action={<Button onClick={() => setShowSeasonModal(true)}>Create Season</Button>} /></Card>
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
