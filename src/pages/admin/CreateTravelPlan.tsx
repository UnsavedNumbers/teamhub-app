import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { startTransition } from 'react'

import { useUserContext } from '../../hooks/useUserContext'
import { getTeams, getTeamDetails } from '../../data/services/teamsService'
import { createTravelPlan, type CreateTravelPlanDTO } from '../../data/services/travelService'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  DatePicker 
} from '../../components/platformAdmin'
import { FileUpload } from '../../components/common/FileUpload'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
interface TravelFormData { 
  team_id: string
  season_id: string
  title: string
  location: string
  destination_city: string
  destination_state: string
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  hotel_name: string
  hotel_address: string
  hotel_phone: string
  hotel_confirmation: string
  maps_url: string
  notes: string
}

export default function CreateTravelPlan() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  const isMountedRef = useRef(true)

  const { context, isReady, isLoading: contextLoading } = useUserContext()
  const navigate = useNavigate()

  // Debug logging
  useEffect(() => {
    console.log('[CreateTravelPlan] State:', { 
      isReady, 
      contextLoading, 
      loading, 
      hasContext: !!context,
      orgId: context?.orgId,
      userId: context?.userId 
    })
  }, [isReady, contextLoading, loading, context])

  const { control, handleSubmit, watch, setValue } = useForm<TravelFormData>({
    defaultValues: { 
      team_id: '', season_id: '', title: '', location: '', destination_city: '', 
      destination_state: '', start_date: '', end_date: '', venue_name: '', venue_address: '', 
      hotel_name: '', hotel_address: '', hotel_phone: '', hotel_confirmation: '', 
      maps_url: '', notes: '' 
    },
  })

  const watchTeamId = watch('team_id')

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTeams = useCallback(async () => {
    console.log('[CreateTravelPlan] fetchTeams called:', { isReady, hasContext: !!context, orgId: context?.orgId })
    
    if (!isReady || !context) {
      console.log('[CreateTravelPlan] fetchTeams early return - not ready')
      // Set loading to false even if we can't fetch - prevents infinite loading
      if (isMountedRef.current) {
        setLoading(false)
      }
      return
    }
    
    try {
      console.log('[CreateTravelPlan] Fetching teams...')
      const { data, error } = await getTeams(context, { activeOnly: true })
      console.log('[CreateTravelPlan] Teams response:', { data, error })
      if (!isMountedRef.current) return
      
      if (!error && data) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error fetching teams:', err)
      }
    } finally {
      if (isMountedRef.current) {
        console.log('[CreateTravelPlan] Setting loading to false')
        setLoading(false)
      }
    }
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady || !teamId || !context) return
    
    try {
      const { data, error } = await getTeamDetails(context, teamId)
      if (!isMountedRef.current) return
      
      if (!error && data?.seasons) {
        setSeasons(data.seasons.map(s => ({ id: s.id, name: s.name })))
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error fetching seasons:', err)
      }
    }
  }, [context, isReady])

  useEffect(() => { 
    console.log('[CreateTravelPlan] useEffect triggered:', { isReady, hasContext: !!context, orgId: context?.orgId })
    if (isReady && context) {
      fetchTeams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, context?.orgId]) // Only re-run when orgId changes, not on every context object change

  // Handle case where context never becomes ready - stop loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !isReady) {
        console.warn('[CreateTravelPlan] Context not ready after timeout, stopping loader')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    return () => clearTimeout(timeout)
  }, [loading, isReady])

  useEffect(() => { 
    if (watchTeamId && isReady && context) { 
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    }
    // Only depend on watchTeamId, isReady, and context - fetchSeasons is stable when these don't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTeamId, isReady, context])

  const onSubmit = async (data: TravelFormData) => {
    if (!isMountedRef.current) return
    setSaving(true)
    setError(null)
    
    try {
      // Map form data to DTO
      const createData: CreateTravelPlanDTO = {
        team_id: data.team_id,
        season_id: data.season_id,
        title: data.title,
        location: data.location,
        destination_city: data.destination_city || null,
        destination_state: data.destination_state || null,
        start_date: data.start_date,
        end_date: data.end_date,
        venue_name: data.venue_name || null,
        venue_address: data.venue_address || null,
        hotel_name: data.hotel_name || null,
        hotel_address: data.hotel_address || null,
        hotel_phone: data.hotel_phone || null,
        hotel_confirmation: data.hotel_confirmation || null,
        maps_url: data.maps_url || null,
        notes: data.notes || null,
        itinerary_file: itineraryFile,
      }

      const { data: createdPlan, error: createError } = await createTravelPlan(context, createData)

      if (!isMountedRef.current) return

      if (createError || !createdPlan) {
        const errorMessage = createError?.message || 'Failed to create travel plan'
        setError(errorMessage)
        showError(errorMessage)
        return
      }

      showSuccess('Travel plan created successfully!')
      if (isMountedRef.current) {
        navigate('/admin/travel')
      }
    } catch (err: unknown) { 
      if (!isMountedRef.current) return
      const errorMessage = getErrorMessage(err) || 'Failed to create travel plan'
      setError(errorMessage)
      showError(errorMessage)
    } finally { 
      if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  if (!isReady || !context?.orgId) {
    return (
      <div className="pa-root">
        <AdminPageHeader 
          title="Create Travel Plan" 
          breadcrumbs={[
            { label: 'Travel Plans', path: '/admin/travel' },
            { label: 'Create Travel Plan' },
          ]}
        />
        <Card>
          <div className="pa-text-center pa-p-8">
            <p className="pa-text-danger">Unable to load organization context. Please make sure you have an organization selected.</p>
            <Button variant="blue" onClick={() => navigate('/admin/travel')} className="pa-mt-4">Back to Travel Plans</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create Travel Plan" 
        breadcrumbs={[
          { label: 'Travel Plans', path: '/admin/travel' },
          { label: 'Create Travel Plan' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required />} />
              <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
            </div>

            <div className="pa-mb-4">
              <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Trip Title" required />} />
            </div>

            <div className="pa-mb-4">
              <Controller name="location" control={control} rules={{ required: 'Location is required' }} render={({ field }) => <Input {...field} label="Location (city/state or details)" required />} />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="destination_city" control={control} render={({ field }) => <Input {...field} label="Destination City" />} />
              <Controller name="destination_state" control={control} render={({ field }) => <Input {...field} label="Destination State" />} />
              <Controller 
                name="start_date" 
                control={control} 
                rules={{ required: 'Start date is required' }} 
                render={({ field }) => <DatePicker {...field} label="Start Date" required />} 
              />
              <Controller 
                name="end_date" 
                control={control} 
                rules={{ 
                  required: 'End date is required',
                  validate: (value) => {
                    const startDate = watch('start_date')
                    if (startDate && value && value < startDate) {
                      return 'End date must be on or after start date'
                    }
                    return true
                  }
                }} 
                render={({ field, fieldState }) => (
                  <DatePicker 
                    {...field} 
                    label="End Date" 
                    required 
                    error={fieldState.error?.message}
                  />
                )} 
              />
            </div>

            <h3 className="pa-h3 pa-mb-4 pa-mt-6">VENUE & HOTEL</h3>
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="venue_name" control={control} render={({ field }) => <Input {...field} label="Venue Name" />} />
              <Controller
                name="venue_address"
                control={control}
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address) => {
                      startTransition(() => {
                        setValue('venue_address', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                      })
                    }}
                    label="Venue Address"
                    placeholder="Enter venue address"
                  />
                )}
              />
              <Controller name="hotel_name" control={control} render={({ field }) => <Input {...field} label="Hotel Name" />} />
              <Controller
                name="hotel_address"
                control={control}
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address) => {
                      startTransition(() => {
                        setValue('hotel_address', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                      })
                    }}
                    label="Hotel Address"
                    placeholder="Enter hotel address"
                  />
                )}
              />
              <Controller name="hotel_phone" control={control} render={({ field }) => <Input {...field} label="Hotel Phone" />} />
              <Controller name="hotel_confirmation" control={control} render={({ field }) => <Input {...field} label="Hotel Confirmation" />} />
            </div>

            <div className="pa-mb-6">
              <Controller name="maps_url" control={control} render={({ field }) => <Input {...field} label="Map Link URL" />} />
            </div>

            <h3 className="pa-h3 pa-mb-4">ITINERARY FILE</h3>
            <div className="pa-mb-6">
              <FileUpload
                label="Itinerary File"
                value={itineraryFile}
                onFileSelect={setItineraryFile}
                buttonText="Choose file"
                replaceText="Replace file"
                accept=".pdf,application/pdf"
                maxSize={10 * 1024 * 1024}
                fullWidth
              />
            </div>

            <div className="pa-mb-8">
              <textarea className="pa-input pa-textarea" placeholder="Trip Notes..." style={{ minHeight: '120px' }} value={watch('notes')} onChange={e => setValue('notes', e.target.value)} />
              <div className="pa-label">Notes</div>
            </div>

            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="blue" onClick={() => navigate('/admin/travel')} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={saving}>Create Draft Plan</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
