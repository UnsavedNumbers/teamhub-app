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
import type { StructuredAddress } from '../../types/location'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
interface TravelFormData { 
  team_id: string
  season_id: string
  title: string
  location: string
  destination_city: string
  destination_state: string
  destination_state_code: string
  destination_country: string
  destination_place_id: string | null
  destination_lat: number | null
  destination_lng: number | null
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  venue_place_id: string | null
  venue_lat: number | null
  venue_lng: number | null
  hotel_name: string
  hotel_address: string
  hotel_place_id: string | null
  hotel_lat: number | null
  hotel_lng: number | null
  hotel_phone: string
  hotel_confirmation: string
  maps_url: string
  notes: string
}

// Helper to extract state code from Google Place result
const extractStateCode = (placeResult?: google.maps.places.PlaceResult): string => {
  if (!placeResult?.address_components) return ''
  const stateComponent = placeResult.address_components.find(
    c => c.types?.includes('administrative_area_level_1')
  )
  return stateComponent?.short_name || ''
}

// Helper to validate and round coordinates
const validateCoordinate = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  // Round to 6 decimal places (≈0.1 meter precision)
  return Math.round(num * 1e6) / 1e6
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to add days to a date string (YYYY-MM-DD format)
const addDaysToDate = (dateString: string, days: number): string => {
  const date = new Date(dateString)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CreateTravelPlan() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  
  // UI State for Overrides
  const [destinationOverride, setDestinationOverride] = useState(false)
  
  const isMountedRef = useRef(true)
  // Refs to track previous place IDs to detect manual clearing
  const prevDestinationPlaceIdRef = useRef<string | null>(null)
  const prevVenuePlaceIdRef = useRef<string | null>(null)
  const prevHotelPlaceIdRef = useRef<string | null>(null)

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

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TravelFormData>({
    defaultValues: { 
      team_id: '', season_id: '', title: '', location: '', 
      destination_city: '', destination_state: '', destination_state_code: '', destination_country: '',
      destination_place_id: null, destination_lat: null, destination_lng: null,
      start_date: '', end_date: '', 
      venue_name: '', venue_address: '', venue_place_id: null, venue_lat: null, venue_lng: null,
      hotel_name: '', hotel_address: '', hotel_place_id: null, hotel_lat: null, hotel_lng: null,
      hotel_phone: '', hotel_confirmation: '', 
      maps_url: '', notes: '' 
    },
  })

  const watchTeamId = watch('team_id')
  const watchSeasonId = watch('season_id')
  
  // Watch inputs to detect clearing
  const watchLocation = watch('location')
  const watchVenueName = watch('venue_name')
  const watchHotelName = watch('hotel_name')
  const watchDestinationPlaceId = watch('destination_place_id')
  const watchVenuePlaceId = watch('venue_place_id')
  const watchHotelPlaceId = watch('hotel_place_id')

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Handle clearing of places when input text is cleared
  useEffect(() => {
    // Destination
    if (prevDestinationPlaceIdRef.current && !watchLocation && watchDestinationPlaceId) {
      if (isMountedRef.current) {
        setValue('destination_place_id', null)
        setValue('destination_city', '')
        setValue('destination_state', '')
        setValue('destination_state_code', '')
        setValue('destination_country', '')
        setValue('destination_lat', null)
        setValue('destination_lng', null)
        setDestinationOverride(false)
      }
      prevDestinationPlaceIdRef.current = null
    } else if (watchDestinationPlaceId) {
      prevDestinationPlaceIdRef.current = watchDestinationPlaceId
    }

    // Venue
    if (prevVenuePlaceIdRef.current && !watchVenueName && watchVenuePlaceId) {
      if (isMountedRef.current) {
        setValue('venue_place_id', null)
        setValue('venue_address', '')
        setValue('venue_lat', null)
        setValue('venue_lng', null)
      }
      prevVenuePlaceIdRef.current = null
    } else if (watchVenuePlaceId) {
      prevVenuePlaceIdRef.current = watchVenuePlaceId
    }

    // Hotel
    if (prevHotelPlaceIdRef.current && !watchHotelName && watchHotelPlaceId) {
      if (isMountedRef.current) {
        setValue('hotel_place_id', null)
        setValue('hotel_address', '')
        setValue('hotel_lat', null)
        setValue('hotel_lng', null)
        // Also clear derived hotel fields if they were auto-populated
        setValue('hotel_phone', '')
        setValue('maps_url', '')
      }
      prevHotelPlaceIdRef.current = null
    } else if (watchHotelPlaceId) {
      prevHotelPlaceIdRef.current = watchHotelPlaceId
    }
  }, [watchLocation, watchVenueName, watchHotelName, watchDestinationPlaceId, watchVenuePlaceId, watchHotelPlaceId, setValue])

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
        const teamList = data.map(t => ({ id: t.id, name: t.name }))
        setTeams(teamList)
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

  // Auto-select team if there's only one and none is selected
  useEffect(() => {
    if (teams.length === 1 && !watchTeamId && isReady && context) {
      console.log('[CreateTravelPlan] Auto-selecting single team:', teams[0].id)
      setValue('team_id', teams[0].id, { shouldValidate: false })
    }
  }, [teams, watchTeamId, isReady, context, setValue])

  // Fetch seasons when team is selected
  useEffect(() => { 
    if (watchTeamId && isReady && context) { 
      console.log('[CreateTravelPlan] Team selected, fetching seasons:', watchTeamId)
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    }
    // Only depend on watchTeamId, isReady, and context - fetchSeasons is stable when these don't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTeamId, isReady, context])

  // Auto-select season if there's only one and none is selected
  useEffect(() => {
    if (seasons.length === 1 && !watchSeasonId && isReady && context) {
      console.log('[CreateTravelPlan] Auto-selecting single season:', seasons[0].id)
      setValue('season_id', seasons[0].id, { shouldValidate: false })
    }
  }, [seasons, watchSeasonId, isReady, context, setValue])

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
        destination_state_code: data.destination_state_code || null,
        destination_country: data.destination_country || null,
        destination_place_id: data.destination_place_id || null,
        destination_lat: data.destination_lat || null,
        destination_lng: data.destination_lng || null,
        start_date: data.start_date,
        end_date: data.end_date,
        venue_name: data.venue_name || null,
        venue_address: data.venue_address || null,
        venue_place_id: data.venue_place_id || null,
        venue_lat: data.venue_lat || null,
        venue_lng: data.venue_lng || null,
        hotel_name: data.hotel_name || null,
        hotel_address: data.hotel_address || null,
        hotel_place_id: data.hotel_place_id || null,
        hotel_lat: data.hotel_lat || null,
        hotel_lng: data.hotel_lng || null,
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
              <Controller 
                name="location" 
                control={control} 
                rules={{ 
                    required: 'Location is required',
                    validate: (_value, formValues) => {
                        // User can enter text manually OR select a place.
                        // If they selected a place (place_id exists), we should have coordinates.
                        // If no place_id, we accept just text (manual entry fallback)
                        if (formValues.destination_place_id && (!formValues.destination_lat || !formValues.destination_lng)) {
                            return 'Invalid location data. Please re-select from the list or enter manually.'
                        }
                        return true
                    }
                }} 
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
                      startTransition(() => {
                        // 1. Set main text value
                        setValue('location', address.formatted_address, { shouldValidate: true, shouldDirty: true })
                        
                        // 2. Set derived fields
                        setValue('destination_place_id', address.place_id || null)
                        setValue('destination_city', address.city || '')
                        setValue('destination_state', address.state || '')
                        setValue('destination_country', address.country || '')
                        
                        // 3. Extract and set coordinates
                        setValue('destination_lat', validateCoordinate(address.latitude))
                        setValue('destination_lng', validateCoordinate(address.longitude))
                        
                        // 4. Extract state code from raw place result
                        const stateCode = extractStateCode(placeResult)
                        setValue('destination_state_code', stateCode)
                      })
                    }}
                    label="Location (city/state or details)"
                    placeholder="Search for a city or location..."
                    types={['geocode']} // Allow cities, regions, and addresses
                    required
                    error={errors.location?.message}
                  />
                )} 
              />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              {/* Destination City - Read Only with Override */}
              <Controller 
                name="destination_city" 
                control={control} 
                render={({ field }) => (
                  <div className="pa-form-group">
                      <label className="pa-label">Destination City</label>
                      {destinationOverride || !watchDestinationPlaceId ? (
                        <input {...field} className="pa-input" placeholder="City" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
                            <span className="pa-text-body">{field.value || '—'}</span>
                            <button 
                                type="button" 
                                className="pa-link-button" 
                                style={{ fontSize: '12px' }}
                                onClick={() => setDestinationOverride(true)}
                            >
                                Override
                            </button>
                        </div>
                      )}
                  </div>
                )} 
              />
              
              {/* Destination State - Read Only with Override */}
              <Controller 
                name="destination_state" 
                control={control} 
                render={({ field }) => (
                  <div className="pa-form-group">
                      <label className="pa-label">Destination State</label>
                      {destinationOverride || !watchDestinationPlaceId ? (
                        <input {...field} className="pa-input" placeholder="State/Province" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
                            <span className="pa-text-body">{field.value || '—'}</span>
                            {destinationOverride && (
                                <button type="button" onClick={() => setDestinationOverride(false)}>Cancel</button>
                            )}
                        </div>
                      )}
                  </div>
                )} 
              />
              
              <Controller 
                name="start_date" 
                control={control} 
                rules={{ required: 'Start date is required' }} 
                render={({ field }) => (
                  <DatePicker 
                    {...field} 
                    label="Start Date" 
                    required 
                    minValue={getTodayDate()}
                  />
                )} 
              />
              <Controller 
                name="end_date" 
                control={control} 
                rules={{ 
                  required: 'End date is required',
                  validate: (value) => {
                    const startDate = watch('start_date')
                    if (startDate && value) {
                      const minEndDate = addDaysToDate(startDate, 1)
                      if (value < minEndDate) {
                        return 'End date must be at least one day after start date'
                      }
                    }
                    return true
                  }
                }} 
                render={({ field, fieldState }) => {
                  const startDate = watch('start_date')
                  // Minimum end date is start date + 1 day, or today + 1 if no start date
                  const minEndDate = startDate 
                    ? addDaysToDate(startDate, 1)
                    : addDaysToDate(getTodayDate(), 1)
                  
                  return (
                    <DatePicker 
                      {...field} 
                      label="End Date" 
                      required 
                      minValue={minEndDate}
                      error={fieldState.error?.message}
                    />
                  )
                }} 
              />
            </div>

            <h3 className="pa-h3 pa-mb-4 pa-mt-6">VENUE & HOTEL</h3>
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller 
                name="venue_name" 
                control={control} 
                rules={{
                    // Optional field, but if place selected, validate coordinates often implies good data
                    validate: (_value, formValues) => {
                        if (formValues.venue_place_id && (!formValues.venue_lat || !formValues.venue_lng)) {
                             // This is a soft warning really, maybe we don't block
                             // But it's good to ensure data integrity
                             console.warn('Venue place selected but coordinates missing')
                        }
                        return true
                    }
                }}
                render={({ field }) => (
                    <LocationAutocomplete
                        value={field.value || ''}
                        onInputChange={field.onChange}
                        onChange={(address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
                            startTransition(() => {
                                // Use place name from PlaceResult if it exists and is not the same as the address
                                // If no name is available, leave it empty so user can enter a proper name
                                const placeName = placeResult?.name && placeResult.name !== address.formatted_address
                                    ? placeResult.name
                                    : ''

                                setValue('venue_name', placeName, { shouldValidate: true, shouldDirty: true })
                                setValue('venue_address', address.formatted_address)
                                setValue('venue_place_id', address.place_id || null)
                                setValue('venue_lat', validateCoordinate(address.latitude))
                                setValue('venue_lng', validateCoordinate(address.longitude))
                            })
                        }}
                        label="Venue Name"
                        placeholder="Search for venue..."
                        types={['establishment', 'geocode']}
                    />
                )} 
              />
              
              <Controller
                name="venue_address"
                control={control}
                render={({ field }) => <Input {...field} label="Venue Address" />}
              />
              
              <Controller 
                name="hotel_name" 
                control={control} 
                render={({ field }) => (
                    <LocationAutocomplete
                        value={field.value || ''}
                        onInputChange={field.onChange}
                        onChange={(address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
                            startTransition(() => {
                                // Use place name from PlaceResult if it exists and is not the same as the address
                                // If no name is available, leave it empty so user can enter a proper name
                                const placeName = placeResult?.name && placeResult.name !== address.formatted_address
                                    ? placeResult.name
                                    : ''
                                
                                setValue('hotel_name', placeName, { shouldValidate: true, shouldDirty: true })
                                setValue('hotel_address', address.formatted_address)
                                setValue('hotel_place_id', address.place_id || null)
                                setValue('hotel_lat', validateCoordinate(address.latitude))
                                setValue('hotel_lng', validateCoordinate(address.longitude))
                                
                                // Extract phone if available (PlaceResult might have it if requested)
                                if (placeResult?.formatted_phone_number) {
                                    setValue('hotel_phone', placeResult.formatted_phone_number)
                                }
                                
                                // Generate map URL
                                if (placeResult?.url) {
                                    setValue('maps_url', placeResult.url)
                                }
                            })
                        }}
                        label="Hotel Name"
                        placeholder="Search for hotel..."
                        types={['lodging']}
                    />
                )} 
              />
              
              <Controller
                name="hotel_address"
                control={control}
                render={({ field }) => <Input {...field} label="Hotel Address" />}
              />
              
              <Controller name="hotel_confirmation" control={control} render={({ field }) => <Input {...field} label="Hotel Confirmation" />} />
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
