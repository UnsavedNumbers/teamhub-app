import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import type { Database } from '../../lib/database.types'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select, 
  Badge, 
  PlatformDataTable, 
  type ColumnConfig 
} from '../../components/platformAdmin'

type TryoutRow = { id: string; org_id: string; title: string; name: string | null; type: string; start_at: string | null; tryout_date: string | null; location: string }
type TryoutCriteriaRow = { id: string; tryout_id: string; name: string; description: string | null; sort_order: number; min_score: number; max_score: number }
type RequiredDocRow = { id: string; tryout_id: string; key: string; label: string; description: string | null; required: boolean }
type RegistrationRow = { id: string; child_id: string; status: string; created_at: string; child?: { first_name: string; last_name: string }; child_name: string }
type TeamRow = { id: string; name: string }
type SeasonRow = { id: string; name: string; team_id: string }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminTryoutDetail() {
  const { tryoutId } = useParams()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const [tryout, setTryout] = useState<TryoutRow | null>(null)
  const [criteria, setCriteria] = useState<TryoutCriteriaRow[]>([])
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocRow[]>([])
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)

  const [newCriterionName, setNewCriterionName] = useState('')
  const [newCriterionDesc, setNewCriterionDesc] = useState('')
  const [newDocKey, setNewDocKey] = useState('')
  const [newDocLabel, setNewDocLabel] = useState('')
  const [newDocRequired, setNewDocRequired] = useState(true)

  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>('')
  const selectedRegistration = useMemo(() => registrations.find(r => r.id === selectedRegistrationId) ?? null, [registrations, selectedRegistrationId])

  const [scoreDraft, setScoreDraft] = useState<Record<string, { score: string; notes: string }>>({})

  const [convertTeamId, setConvertTeamId] = useState<string>('')
  const [convertSeasonId, setConvertSeasonId] = useState<string>('')
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])

  const fetchAll = useCallback(async () => {
    if (!tryoutId || !currentOrganization) return
    setLoading(true)
    const { data: tryoutData } = await supabase.from('tryouts').select('*').eq('id', tryoutId).single()
    if (tryoutData) setTryout(tryoutData as any)

    const { data: criteriaData } = await (supabase as any).from('tryout_criteria').select('*').eq('tryout_id', tryoutId).order('sort_order', { ascending: true })
    setCriteria(criteriaData || [])

    const { data: docData } = await (supabase as any).from('tryout_required_documents').select('*').eq('tryout_id', tryoutId).order('created_at', { ascending: true })
    setRequiredDocs(docData || [])

    const { data: regData } = await supabase.from('tryout_registrations').select('id, child_id, status, created_at, child:children(first_name, last_name)').eq('tryout_id', tryoutId).order('created_at', { ascending: false })
    const rows = (regData as any[]) || []
    setRegistrations(rows.map(r => ({ ...r, child_name: r.child ? `${r.child.first_name} ${r.child.last_name}` : r.child_id })))

    const { data: teamData } = await supabase.from('teams').select('id, name').eq('org_id', currentOrganization.id).order('name', { ascending: true })
    setTeams(teamData || [])
    setLoading(false)
  }, [tryoutId, currentOrganization])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!convertTeamId) { setSeasons([]); return; }
    supabase.from('seasons').select('id, name').eq('team_id', convertTeamId).order('start_date', { ascending: false }).then(({ data }) => setSeasons(data || []))
  }, [convertTeamId])

  const addCriterion = async () => {
    if (!tryoutId || !newCriterionName.trim()) return
    await (supabase as any).from('tryout_criteria').insert({ tryout_id: tryoutId, name: newCriterionName.trim(), description: newCriterionDesc.trim() || null, sort_order: criteria.length, min_score: 1, max_score: 10 })
    setNewCriterionName(''); setNewCriterionDesc(''); fetchAll()
  }

  const addRequiredDoc = async () => {
    if (!tryoutId || !newDocKey.trim() || !newDocLabel.trim()) return
    await (supabase as any).from('tryout_required_documents').insert({ tryout_id: tryoutId, key: newDocKey.trim().toLowerCase(), label: newDocLabel.trim(), required: newDocRequired })
    setNewDocKey(''); setNewDocLabel(''); fetchAll()
  }

  const updateRegistrationStatus = async (id: string, status: string) => {
    await supabase.from('tryout_registrations').update({ status } as any).eq('id', id)
    fetchAll()
  }

  const loadScoresForRegistration = async (registrationId: string) => {
    const { data } = await (supabase as any).from('tryout_scores').select('criteria_id, score, notes').eq('registration_id', registrationId).eq('coach_id', profile?.id)
    const next: Record<string, { score: string; notes: string }> = {}
    ;(data as any[])?.forEach(row => { if (row.criteria_id) next[row.criteria_id] = { score: String(row.score ?? ''), notes: String(row.notes ?? '') } })
    setScoreDraft(next)
  }

  const saveScores = async () => {
    if (!selectedRegistration || !profile?.id) return
    for (const c of criteria) {
      const d = scoreDraft[c.id]; if (!d) continue
      await (supabase as any).from('tryout_scores').upsert({ registration_id: selectedRegistration.id, criteria_id: c.id, coach_id: profile.id, score: Number(d.score), notes: d.notes || null, category: c.name }, { onConflict: 'registration_id,criteria_id,coach_id' })
    }
    alert('Scores saved')
  }

  const convertToTeamMember = async () => {
    if (!selectedRegistration || !convertTeamId || !convertSeasonId) return
    const { error } = await supabase.rpc('convert_accepted_tryout_registration_to_team_member', { p_registration_id: selectedRegistration.id, p_team_id: convertTeamId, p_season_id: convertSeasonId })
    if (error) alert(error.message); else alert('Converted to team member')
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />
  if (!tryout) return <PageHeader title="Tryout not found" />

  const regColumns: ColumnConfig<RegistrationRow>[] = [
    { id: 'child_name', label: 'Athlete' },
    { id: 'status', label: 'Status', render: (row) => <Badge variant="neutral">{row.status.toUpperCase()}</Badge> },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <div className="pa-flex pa-gap-2 pa-justify-end">
        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); updateRegistrationStatus(row.id, 'checked_in') }}>Check-in</Button>
        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); updateRegistrationStatus(row.id, 'offered') }}>Offer</Button>
      </div>
    )}
  ]

  return (
    <div className="pa-root">
      <PageHeader title={tryout.name ?? tryout.title} subtitle={`${tryout.start_at ? formatDateTime(tryout.start_at) : 'TBD'} • ${tryout.location}`} />

      <div className="pa-grid pa-grid-12 pa-gap-6">
        <div className="pa-col-5">
          <Card className="pa-mb-6">
            <h3 className="pa-h3 pa-mb-4">EVALUATION CRITERIA</h3>
            <div className="pa-flex pa-flex-col pa-gap-3">
              <Input label="Name" value={newCriterionName} onChange={e => setNewCriterionName(e.target.value)} />
              <textarea className="pa-input pa-textarea" placeholder="Description (optional)" value={newCriterionDesc} onChange={e => setNewCriterionDesc(e.target.value)} />
              <Button onClick={addCriterion}>Add Criterion</Button>
            </div>
            <div className="pa-mt-5 pa-flex pa-flex-col pa-gap-3">
              {criteria.map(c => <div key={c.id} className="pa-card pa-mb-0" style={{ padding: 'var(--pa-space-3)' }}><strong>{c.name}</strong><div className="pa-body-s pa-text-muted">{c.description}</div></div>)}
            </div>
          </Card>

          <Card>
            <h3 className="pa-h3 pa-mb-4">REQUIRED DOCUMENTS</h3>
            <div className="pa-flex pa-flex-col pa-gap-3 pa-mb-4">
              <Input label="Key" value={newDocKey} onChange={e => setNewDocKey(e.target.value)} />
              <Input label="Label" value={newDocLabel} onChange={e => setNewDocLabel(e.target.value)} />
              <Select label="Required" value={newDocRequired ? 'yes' : 'no'} onChange={e => setNewDocRequired(e.target.value === 'yes')} options={[{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}]} />
              <Button onClick={addRequiredDoc}>Add Document</Button>
            </div>
            {requiredDocs.map(d => <div key={d.id} className="pa-body-m pa-mb-2">• {d.label} {d.required && '(Required)'}</div>)}
          </Card>
        </div>

        <div className="pa-col-7">
          <Card className="pa-mb-6">
            <h3 className="pa-h3 pa-mb-4">REGISTRATIONS</h3>
            <PlatformDataTable columns={regColumns} rows={registrations} loading={loading} page={0} rowsPerPage={100} totalCount={registrations.length} onPageChange={() => {}} onRowsPerPageChange={() => {}} onRowClick={r => { setSelectedRegistrationId(r.id); loadScoresForRegistration(r.id); }} />
          </Card>

          {selectedRegistration && (
            <Card>
              <h3 className="pa-h3 pa-mb-4">EVALUATION: {selectedRegistration.child_name}</h3>
              <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
                {criteria.map(c => (
                  <div key={c.id} className="pa-grid pa-grid-12 pa-gap-3 pa-items-center">
                    <div className="pa-col-4"><strong>{c.name}</strong></div>
                    <div className="pa-col-2"><Input placeholder="Score" value={scoreDraft[c.id]?.score || ''} onChange={e => setScoreDraft({ ...scoreDraft, [c.id]: { score: e.target.value, notes: scoreDraft[c.id]?.notes || '' } })} /></div>
                    <div className="pa-col-6"><Input placeholder="Notes" value={scoreDraft[c.id]?.notes || ''} onChange={e => setScoreDraft({ ...scoreDraft, [c.id]: { score: scoreDraft[c.id]?.score || '', notes: e.target.value } })} /></div>
                  </div>
                ))}
                <div className="pa-flex pa-justify-end"><Button onClick={saveScores}>Save Scores</Button></div>
              </div>
              <div className="pa-divider pa-my-6" />
              <h3 className="pa-h3 pa-mb-4">CONVERT TO TEAM MEMBER</h3>
              <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
                <Select label="Team" value={convertTeamId} onChange={e => setConvertTeamId(e.target.value)} options={teams.map(t => ({ value: t.id, label: t.name }))} />
                <Select label="Season" value={convertSeasonId} onChange={e => setConvertSeasonId(e.target.value)} options={seasons.map(s => ({ value: s.id, label: s.name }))} />
              </div>
              <div className="pa-flex pa-justify-end"><Button onClick={convertToTeamMember} disabled={!convertTeamId || !convertSeasonId}>Convert</Button></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
