import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
interface Child { id: string; first_name: string; last_name: string }
interface FeeFormData { team_id: string; season_id: string; child_id: string; amount: string; description: string; due_date: string; applyToAll: boolean; }

export default function CreateFee() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FeeFormData>({
    defaultValues: { team_id: '', season_id: '', child_id: '', amount: '', description: '', due_date: '', applyToAll: false },
  })

  const watchTeamId = watch('team_id')
  const watchApplyToAll = watch('applyToAll')

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return
    const { data } = await supabase.from('teams').select('id, name').eq('org_id', currentOrganization.id).order('name')
    setTeams((data as Team[]) || [])
    setLoading(false)
  }, [currentOrganization?.id])

  const fetchSeasons = useCallback(async (teamId: string) => {
    const { data } = await supabase.from('seasons').select('id, name').eq('team_id', teamId).order('start_date', { ascending: false })
    setSeasons((data as any[]) || [])
  }, [])

  const fetchChildren = useCallback(async (teamId: string) => {
    const { data } = await supabase.from('team_memberships').select('child:children(id, first_name, last_name)').eq('team_id', teamId).eq('status', 'active')
    setChildren(((data as any[]) || []).map(m => m.child))
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])
  useEffect(() => { if (watchTeamId) { fetchSeasons(watchTeamId); fetchChildren(watchTeamId); setValue('season_id', ''); setValue('child_id', ''); } }, [watchTeamId, setValue, fetchSeasons, fetchChildren])

  const onSubmit = async (data: FeeFormData) => {
    if (!data.team_id || !data.season_id || !data.amount) return
    setSaving(true); setError(null)
    const amountCents = Math.round(parseFloat(data.amount) * 100)
    try {
      if (data.applyToAll) {
        const inserts = children.map(child => ({ organization_id: currentOrganization?.id, child_id: child.id, amount_cents: amountCents, balance_cents: amountCents, paid_cents_total: 0, status: 'unpaid', due_date: data.due_date || null }))
        const { error } = await supabase.from('fee_assignments').insert(inserts as any)
        if (error) throw error
      } else {
        if (!data.child_id) { setError('Select a child or apply to all'); setSaving(false); return }
        const { error } = await supabase.from('fee_assignments').insert({ organization_id: currentOrganization?.id, child_id: data.child_id, amount_cents: amountCents, balance_cents: amountCents, paid_cents_total: 0, status: 'unpaid', due_date: data.due_date || null } as any)
        if (error) throw error
      }
      navigate('/admin/payments')
    } catch (err: unknown) { setError(getErrorMessage(err) || 'Failed to create fee') } finally { setSaving(false) }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <PageHeader title="Create Fee" />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
          
          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required />} />
            <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
          </div>

          <div className="pa-mb-4">
            <Controller name="applyToAll" control={control} render={({ field }) => (
              <label className="pa-flex pa-items-center pa-gap-2 pa-clickable">
                <input type="checkbox" checked={field.value} onChange={field.onChange} />
                <span className="pa-body-m">Apply to all players on team</span>
              </label>
            )} />
          </div>

          {!watchApplyToAll && (
            <div className="pa-mb-4">
              <Controller name="child_id" control={control} rules={{ required: !watchApplyToAll }} render={({ field }) => <Select {...field} label="Player" options={children.map(c => ({value:c.id, label:`${c.first_name} ${c.last_name}`}))} required disabled={!watchTeamId} />} />
            </div>
          )}

          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller name="amount" control={control} rules={{ required: 'Amount is required' }} render={({ field }) => <Input {...field} label="Amount ($)" type="number" step="0.01" required />} />
            <Controller name="due_date" control={control} render={({ field }) => <Input {...field} label="Due Date" type="date" />} />
          </div>

          <div className="pa-mb-8">
            <Controller name="description" control={control} render={({ field }) => <Input {...field} label="Description" placeholder="e.g. Season registration fee" />} />
          </div>

          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="secondary" onClick={() => navigate('/admin/payments')}>Cancel</Button>
            <Button type="submit" loading={saving}>
              {watchApplyToAll ? `Create for ${children.length} players` : 'Create Fee'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
