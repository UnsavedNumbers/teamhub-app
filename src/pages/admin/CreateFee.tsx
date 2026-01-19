import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { getTeams, getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
interface Child { id: string; first_name: string; last_name: string }
interface FeeFormData { 
  team_id: string
  season_id: string
  child_id: string
  amount: string
  description: string
  due_date: string
  applyToAll: boolean
}

export default function CreateFee() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const { control, handleSubmit, watch, setValue } = useForm<FeeFormData>({
    defaultValues: { 
      team_id: '', season_id: '', child_id: '', amount: '', 
      description: '', due_date: '', applyToAll: false 
    },
  })

  const watchTeamId = watch('team_id')
  const watchSeasonId = watch('season_id')
  const watchApplyToAll = watch('applyToAll')

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    const { data, error } = await getTeams(context, { activeOnly: true })
    if (!error) {
      setTeams(data.map(t => ({ id: t.id, name: t.name })))
    }
    setLoading(false)
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady) return
    
    const { data, error } = await getTeamDetails(context, teamId)
    if (!error && data?.seasons) {
      setSeasons(data.seasons.map(s => ({ id: s.id, name: s.name })))
    }
  }, [context, isReady])

  const fetchChildren = useCallback(async (teamId: string, seasonId: string) => {
    if (!isReady) return
    
    const { data, error } = await getTeamRoster(context, teamId, seasonId)
    if (!error) {
      // Transform roster to children list
      const childList: Child[] = data.map(member => ({
        id: member.child_id,
        first_name: getChildFirstName(member.child_id),
        last_name: getChildLastName(member.child_id),
      }))
      setChildren(childList)
    }
  }, [context, isReady])

  // Helper functions to get child names (in real implementation, comes from joined data)
  const getChildFirstName = (childId: string): string => {
    const names: Record<string, string> = {
      'child-emma-001': 'Emma',
      'child-liam-002': 'Liam',
      'child-sophia-003': 'Sophia',
      'child-jackson-004': 'Jackson',
    }
    return names[childId] ?? 'Child'
  }

  const getChildLastName = (childId: string): string => {
    const names: Record<string, string> = {
      'child-emma-001': 'Johnson',
      'child-liam-002': 'Williams',
      'child-sophia-003': 'Brown',
      'child-jackson-004': 'Davis',
    }
    return names[childId] ?? ''
  }

  useEffect(() => { 
    if (isReady) fetchTeams() 
  }, [isReady, fetchTeams])

  useEffect(() => { 
    if (watchTeamId && isReady) { 
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
      setValue('child_id', '')
      setChildren([])
    } 
  }, [watchTeamId, isReady, setValue, fetchSeasons])

  useEffect(() => {
    if (watchTeamId && watchSeasonId && isReady) {
      fetchChildren(watchTeamId, watchSeasonId)
    }
  }, [watchTeamId, watchSeasonId, isReady, fetchChildren])

  const onSubmit = async (data: FeeFormData) => {
    if (!data.team_id || !data.season_id || !data.amount) return
    
    setSaving(true)
    setError(null)
    

    
    try {
      // In fake data mode, just navigate back with success
      // TODO: Replace with real Supabase insert when migrating
      /*
      if (data.applyToAll) {
        const inserts = children.map(child => ({
          organization_id: currentOrganization?.id,
          child_id: child.id,
          amount_cents: amountCents,
          balance_cents: amountCents,
          paid_cents_total: 0,
          status: 'unpaid',
          due_date: data.due_date || null
        }))
        
        const { error } = await supabase.from('fee_assignments').insert(inserts)
        if (error) throw error
      } else {
        if (!data.child_id) {
          setError(t('errors.selectChildOrApplyToAll'))
          setSaving(false)
          return
        }
        
        const { error } = await supabase.from('fee_assignments').insert({
          organization_id: currentOrganization?.id,
          child_id: data.child_id,
          amount_cents: amountCents,
          balance_cents: amountCents,
          paid_cents_total: 0,
          status: 'unpaid',
          due_date: data.due_date || null
        })
        
        if (error) throw error
      }
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/admin/payments')
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to create fee') 
    } finally { 
      setSaving(false) 
    }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create Fee" 
        breadcrumbs={[
          { label: 'Payments', path: '/admin/payments' },
          { label: 'Create Fee' },
        ]}
      />
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
              <Controller name="child_id" control={control} rules={{ required: !watchApplyToAll }} render={({ field }) => <Select {...field} label="Player" options={children.map(c => ({value:c.id, label:`${c.first_name} ${c.last_name}`}))} required disabled={!watchSeasonId} />} />
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
