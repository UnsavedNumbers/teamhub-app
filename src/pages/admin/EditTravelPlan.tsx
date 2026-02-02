import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { startTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getTravelPlanById, updateTravelPlan, type UpdateTravelPlanDTO } from '../../data/services/travelService'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { isValidUUID } from '../../utils/uuid'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input,
  DatePicker 
} from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import { FileUpload } from '../../components/common/FileUpload'
import PlanTravelContacts from '../../components/admin/travel/PlanTravelContacts'
import { getOrganizationTravelContacts } from '../../data/services/organizationTravelContactsService'
import { TRAVEL_CONTACT_CATEGORIES, type TravelContactCategory, type OrganizationTravelContactRow, type TravelContactCategoryOrg } from '../../types/travelContacts'
import { getTravelPlanContacts, deleteTravelPlanContactsForPlan, insertTravelPlanContacts } from '../../data/services/travelService'

interface TravelFormData { 
  title: string
  location: string
  destination_city: string
  destination_state: string
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  venue_place_id: string
  venue_lat: number | ''
  venue_lng: number | ''
  hotel_name: string
  hotel_address: string
  hotel_phone: string
  hotel_confirmation: string
  maps_url: string
  notes: string
  contacts: {
    category: string
    is_custom: boolean
    first_name: string
    last_name: string
    email: string
    phone: string
  }[]
}

export default function EditTravelPlan() {
  const { id } = useParams<{ id: string }>()
  const componentIdRef = useRef(`EditTravelPlan-${Date.now()}-${Math.random()}`)
  const renderCountRef = useRef(0)
  const effectRunCountRef = useRef(0)
  const fetchPlanCountRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  const [isPastPlan, setIsPastPlan] = useState(false)
  const isMountedRef = useRef(true)

  const { context, isReady } = useUserContext()
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [orgContacts, setOrgContacts] = useState<Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null> | null>(null)

  renderCountRef.current++
  console.log(`[EditTravelPlan:${componentIdRef.current}] RENDER #${renderCountRef.current}`, {
    timestamp: new Date().toISOString(),
    id,
    isReady,
    contextOrgId: context?.orgId,
  })

  const defaultFormValues: TravelFormData = {
    title: '',
    location: '',
    destination_city: '',
    destination_state: '',
    start_date: '',
    end_date: '',
    venue_name: '',
    venue_address: '',
    venue_place_id: '',
    venue_lat: '',
    venue_lng: '',
    hotel_name: '',
    hotel_address: '',
    hotel_phone: '',
    hotel_confirmation: '',
    maps_url: '',
    notes: '',
    contacts: TRAVEL_CONTACT_CATEGORIES.map(cat => ({
      category: cat,
      is_custom: false,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    })),
  }

  const { control, handleSubmit, reset, setValue, watch } = useForm<TravelFormData>({
    defaultValues: defaultFormValues,
  })

  const [hasFormData, setHasFormData] = useState(false)

  useEffect(() => {
    const mountTime = new Date().toISOString()
    console.log(`[EditTravelPlan:${componentIdRef.current}] MOUNT`, { timestamp: mountTime })
    isMountedRef.current = true
    return () => {
      const unmountTime = new Date().toISOString()
      console.log(`[EditTravelPlan:${componentIdRef.current}] UNMOUNT`, {
        timestamp: unmountTime,
        mountTime,
        renderCount: renderCountRef.current,
        effectRuns: effectRunCountRef.current,
        fetchPlanCalls: fetchPlanCountRef.current,
      })
      isMountedRef.current = false
    }
  }, [])

  const fetchPlan = useCallback(async () => {
    fetchPlanCountRef.current++
    const fetchId = fetchPlanCountRef.current
    const fetchStartTime = Date.now()
    console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} START`, {
      timestamp: new Date().toISOString(),
      id,
      isReady,
      contextOrgId: context?.orgId,
      isMounted: isMountedRef.current,
    })

    if (!isReady || !id) {
      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Early return`, {
        reason: !isReady ? 'not ready' : 'no id',
      })
      return
    }

    if (!context) {
      if (isMountedRef.current) setLoading(false)
      return
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      console.warn(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Invalid UUID, navigating away`)
      if (isMountedRef.current) {
        navigate('/admin/travel')
      }
      return
    }
    
    if (!isMountedRef.current) {
      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Aborted (unmounted)`)
      return
    }
    
    if (isMountedRef.current) {
      setLoading(true)
    }
    
    try {
      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Calling getTravelPlanById`)
      const apiStartTime = Date.now()
      const { data, error } = await getTravelPlanById(context, id)
      const apiDuration = Date.now() - apiStartTime
      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - getTravelPlanById completed`, {
        duration: `${apiDuration}ms`,
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
      })
      
      if (!isMountedRef.current) {
        console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Aborted after API (unmounted)`)
        return
      }

      if (error || !data) {
        console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Error or no data, navigating away`)
        navigate('/admin/travel')
        return
      }

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await getTravelPlanContacts(context, id)
      if (contactsError) {
          console.error('Error fetching plan contacts', contactsError)
      }

      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Resetting form with data`)
      // Populate form with existing data
      reset({
        title: data.title,
        location: data.location,
        destination_city: data.destination_city ?? '',
        destination_state: data.destination_state ?? '',
        start_date: data.start_date,
        end_date: data.end_date,
        venue_name: data.venue_name ?? '',
        venue_address: data.venue_address ?? '',
        venue_place_id: data.venue_place_id ?? '',
        venue_lat: data.venue_lat ?? '',
        venue_lng: data.venue_lng ?? '',
        hotel_name: data.hotel_name ?? '',
        hotel_address: data.hotel_address ?? '',
        hotel_phone: data.hotel_phone ?? '',
        hotel_confirmation: data.hotel_confirmation ?? '',
        maps_url: data.maps_url ?? '',
        notes: data.notes ?? '',
        contacts: TRAVEL_CONTACT_CATEGORIES.map(cat => {
            const existing = contactsData?.[cat]
            return {
                category: cat,
                is_custom: existing?.is_custom ?? false,
                first_name: existing?.first_name || '',
                last_name: existing?.last_name || '',
                email: existing?.email || '',
                phone: existing?.phone || '',
            }
        })
      })
      setIsPastPlan(new Date(data.end_date) < new Date())
      if (isMountedRef.current) {
        setHasFormData(true)
        setError(null)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - Caught error:`, err)
      setError(getErrorMessage(err) || 'Failed to load travel plan')
    } finally {
      const totalDuration = Date.now() - fetchStartTime
      console.log(`[EditTravelPlan:${componentIdRef.current}] fetchPlan #${fetchId} - COMPLETE`, {
        duration: `${totalDuration}ms`,
        isMounted: isMountedRef.current,
      })
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [id, context.orgId, isReady, navigate, reset, context])
  
  // Fetch org contacts for preview
  useEffect(() => {
    if (isReady && context) {
        getOrganizationTravelContacts(context).then(res => {
            if (res.data) setOrgContacts(res.data)
        })
    }
  }, [isReady, context])

  useEffect(() => {
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[EditTravelPlan:${componentIdRef.current}] Effect #${effectId} - Trigger fetchPlan`, {
      timestamp: new Date().toISOString(),
      isReady,
      id,
      isMounted: isMountedRef.current,
    })
    if (!isReady) {
      return
    }
    if (!id) {
      setLoading(false)
      navigate('/admin/travel', { replace: true })
      return
    }
    if (!isValidUUID(id)) {
      setLoading(false)
      navigate('/admin/travel', { replace: true })
      return
    }
    console.log(`[EditTravelPlan:${componentIdRef.current}] Effect #${effectId} - Calling fetchPlan`)
    fetchPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id, navigate])

  const onSubmit = async (data: TravelFormData) => {
    const submitStartTime = Date.now()
    console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit START`, {
      timestamp: new Date().toISOString(),
      id,
      isMounted: isMountedRef.current,
    })

    if (!context) {
      setError('You must be signed in to save changes.')
      showError('You must be signed in to save changes.')
      return
    }

    if (!id || !isValidUUID(id)) {
      console.warn(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Invalid plan ID`)
      if (isMountedRef.current) {
        setError('Invalid plan ID')
      }
      return
    }

    if (!isMountedRef.current) {
      console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Aborted (unmounted)`)
      return
    }
    
    if (isMountedRef.current) {
      setSaving(true)
      setError(null)
    }
    
    try {
      // Map form data to DTO
      const updateData: UpdateTravelPlanDTO = {
        title: data.title,
        location: data.location,
        destination_city: data.destination_city || null,
        destination_state: data.destination_state || null,
        start_date: data.start_date,
        end_date: data.end_date,
        venue_name: data.venue_name || null,
        venue_address: data.venue_address || null,
        venue_place_id: data.venue_place_id || null,
        venue_lat: data.venue_lat !== '' && data.venue_lat != null && Number.isFinite(Number(data.venue_lat)) ? Number(data.venue_lat) : null,
        venue_lng: data.venue_lng !== '' && data.venue_lng != null && Number.isFinite(Number(data.venue_lng)) ? Number(data.venue_lng) : null,
        hotel_name: data.hotel_name || null,
        hotel_address: data.hotel_address || null,
        hotel_phone: data.hotel_phone || null,
        hotel_confirmation: data.hotel_confirmation || null,
        maps_url: data.maps_url || null,
        notes: data.notes || null,
        itinerary_file: itineraryFile,
      }

      console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Calling updateTravelPlan`)
      const apiStartTime = Date.now()
      const { data: updatedPlan, error: updateError } = await updateTravelPlan(context, id, updateData)
      const apiDuration = Date.now() - apiStartTime
      console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - updateTravelPlan completed`, {
        duration: `${apiDuration}ms`,
        hasData: !!updatedPlan,
        hasError: !!updateError,
        errorMessage: updateError?.message,
      })

      if (!isMountedRef.current) {
        console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Aborted after API (unmounted)`)
        return
      }

      if (updateError || !updatedPlan) {
        const errorMessage = updateError?.message || 'Failed to update travel plan'
        console.error(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Error:`, errorMessage)
        if (isMountedRef.current) {
          setError(errorMessage)
          showError(errorMessage)
        }
        
        // Handle optimistic locking error
        if (errorMessage.includes('modified by another user')) {
          console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Refreshing plan data due to optimistic locking error`)
          // Refresh plan data
          await fetchPlan()
        }
        return
      }

      // Save travel contacts (CRUD: delete all, then insert only custom overrides)
      if (data.contacts && id) {
        const { error: deleteError } = await deleteTravelPlanContactsForPlan(context, id)
        if (deleteError && isMountedRef.current) {
          setSaving(false)
          setError(deleteError.message)
          showError(deleteError.message)
          return
        }

        const customContacts = data.contacts.filter(
          c => c.is_custom && c.first_name?.trim() && c.last_name?.trim() && c.email?.trim()
        )
        if (customContacts.length > 0) {
          const { error: insertError } = await insertTravelPlanContacts(context, id, customContacts.map(c => ({
            category: c.category as TravelContactCategory,
            first_name: c.first_name!.trim(),
            last_name: c.last_name!.trim(),
            email: c.email!.trim(),
            phone: c.phone?.trim() || null,
          })))
          if (insertError && isMountedRef.current) {
            setSaving(false)
            setError(insertError.message)
            showError(insertError.message)
            return
          }
        }
      }

      console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Success, navigating away`)
      
      // Invalidate nearby amenities cache so it refetches with new location
      queryClient.invalidateQueries({ queryKey: ['nearbyAmenities'] })
      
      showSuccess('Travel plan updated successfully!')
      if (isMountedRef.current) {
        navigate('/admin/travel')
      }
    } catch (err: unknown) { 
      if (!isMountedRef.current) {
        console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Aborted during error handling (unmounted)`)
        return
      }
      console.error(`[EditTravelPlan:${componentIdRef.current}] onSubmit - Caught error:`, err)
      const errorMessage = getErrorMessage(err) || 'Failed to update travel plan'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      const totalDuration = Date.now() - submitStartTime
      console.log(`[EditTravelPlan:${componentIdRef.current}] onSubmit - COMPLETE`, {
        duration: `${totalDuration}ms`,
        isMounted: isMountedRef.current,
      })
      if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (loading) {
    return <div className="pa-root"><div className="pa-skeleton" style={{ height: '500px' }} /></div>
  }

  if (error && !hasFormData) {
    return (
      <div className="pa-root">
        <AdminPageHeader
          title="Edit Travel Plan"
          subtitle={t('admin.travel.editSubtitle')}
          breadcrumbs={[
            { label: 'Travel Plans', path: '/admin/travel' },
            { label: 'Edit Travel Plan' },
          ]}
        />
        <div className="pa-form-container">
          <Card>
            <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>
            <div className="pa-form-actions">
              <Button variant="secondary" onClick={() => navigate('/admin/travel')}>Back to Travel Plans</Button>
              <OrgAdminButton variant="primary" onClick={() => { setError(null); fetchPlan(); setLoading(true); }}>Retry</OrgAdminButton>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Edit Travel Plan" 
        subtitle={t('admin.travel.editSubtitle')}
        breadcrumbs={[
          { label: 'Travel Plans', path: '/admin/travel' },
          { label: 'Edit Travel Plan' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset disabled={isPastPlan}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            
            <div className="pa-mb-4">
              <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Trip Title" required />} />
            </div>

            <div className="pa-mb-4">
              <Controller name="location" control={control} rules={{ required: 'Location is required' }} render={({ field }) => <Input {...field} label="Location (city/state or details)" required />} />
            </div>

            <div className="pa-form-grid pa-form-grid-2 pa-gap-4 pa-mb-4">
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
            <div className="pa-form-grid pa-form-grid-2 pa-gap-4 pa-mb-4">
              <Controller
                name="venue_name"
                control={control}
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address, placeResult) => {
                      startTransition(() => {
                        // Use place name from PlaceResult if it exists and is not the same as the address
                        const placeName = placeResult?.name && placeResult.name !== address.formatted_address
                            ? placeResult.name
                            : ''

                        setValue('venue_name', placeName, { shouldValidate: false, shouldDirty: true })
                        setValue('venue_address', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                        // Persist venue coords/place_id so Nearby Amenities refetches for the new location
                        const loc = placeResult?.geometry?.location as { lat?: () => number; lng?: () => number } | { lat?: number; lng?: number } | undefined
                        const lat = loc && typeof (loc as { lat: () => number }).lat === 'function' ? (loc as { lat: () => number; lng: () => number }).lat() : (loc as { lat?: number })?.lat
                        const lng = loc && typeof (loc as { lng: () => number }).lng === 'function' ? (loc as { lat: () => number; lng: () => number }).lng() : (loc as { lng?: number })?.lng
                        setValue('venue_place_id', placeResult?.place_id ?? '', { shouldValidate: false, shouldDirty: true })
                        setValue('venue_lat', lat != null && Number.isFinite(lat) ? Number(lat) : '', { shouldValidate: false, shouldDirty: true })
                        setValue('venue_lng', lng != null && Number.isFinite(lng) ? Number(lng) : '', { shouldValidate: false, shouldDirty: true })
                        // Update the input display to show the place name (not address)
                        if (placeName) {
                          field.onChange(placeName)
                        }
                      })
                    }}
                    label="Venue Name"
                    placeholder="Search for venue..."
                    types={['establishment', 'geocode']}
                  />
                )}
              />
              <Controller name="venue_address" control={control} render={({ field }) => <Input {...field} label="Venue Address" />} />
              <Controller
                name="hotel_name"
                control={control}
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address, placeResult) => {
                      startTransition(() => {
                        // Use place name from PlaceResult if it exists and is not the same as the address
                        const placeName = placeResult?.name && placeResult.name !== address.formatted_address
                            ? placeResult.name
                            : ''
                        
                        setValue('hotel_name', placeName, { shouldValidate: false, shouldDirty: true })
                        setValue('hotel_address', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                        
                        // Update the input display to show the place name (not address)
                        if (placeName) {
                          field.onChange(placeName)
                        }
                      })
                    }}
                    label="Hotel Name"
                    placeholder="Search for hotel..."
                    types={['lodging']}
                  />
                )}
              />
              <Controller name="hotel_address" control={control} render={({ field }) => <Input {...field} label="Hotel Address" />} />
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

            <PlanTravelContacts 
                control={control} 
                name="contacts" 
                orgContacts={orgContacts} 
            />

            <div className="pa-form-actions">
              <OrgAdminButton variant="primary" onClick={() => navigate('/admin/travel')} disabled={saving} className="w-full sm:w-auto">Cancel</OrgAdminButton>
              <Button type="submit" loading={saving} disabled={isPastPlan || saving} className="pa-form-submit-btn w-full sm:w-auto">Save Changes</Button>
            </div>
            </fieldset>
          </form>
        </Card>
      </div>
    </div>
  )
}
