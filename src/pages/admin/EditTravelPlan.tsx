import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { startTransition } from 'react'

import { useUserContext } from '../../hooks/useUserContext'
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
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import { FileUpload } from '../../components/common/FileUpload'

interface TravelFormData { 
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

export default function EditTravelPlan() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  const isMountedRef = useRef(true)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const { control, handleSubmit, reset, setValue, watch } = useForm<TravelFormData>()

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchPlan = useCallback(async () => {
    if (!isReady || !id) return
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      if (isMountedRef.current) {
        navigate('/admin/travel')
      }
      return
    }
    
    if (!isMountedRef.current) return
    setLoading(true)
    
    try {
      const { data, error } = await getTravelPlanById(context, id)
      
      if (!isMountedRef.current) return

      if (error || !data) {
        navigate('/admin/travel')
        return
      }

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
        hotel_name: data.hotel_name ?? '',
        hotel_address: data.hotel_address ?? '',
        hotel_phone: data.hotel_phone ?? '',
        hotel_confirmation: data.hotel_confirmation ?? '',
        maps_url: data.maps_url ?? '',
        notes: data.notes ?? '',
      })
    } catch (err) {
      if (isMountedRef.current) {
        setError(getErrorMessage(err) || 'Failed to load travel plan')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady, id, navigate, reset])

  useEffect(() => { 
    if (isReady && id) fetchPlan() 
  }, [isReady, id, fetchPlan])

  const onSubmit = async (data: TravelFormData) => {
    if (!id || !isValidUUID(id)) {
      setError('Invalid plan ID')
      return
    }

    if (!isMountedRef.current) return
    setSaving(true)
    setError(null)
    
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
        hotel_name: data.hotel_name || null,
        hotel_address: data.hotel_address || null,
        hotel_phone: data.hotel_phone || null,
        hotel_confirmation: data.hotel_confirmation || null,
        maps_url: data.maps_url || null,
        notes: data.notes || null,
        itinerary_file: itineraryFile,
      }

      const { data: updatedPlan, error: updateError } = await updateTravelPlan(context, id, updateData)

      if (!isMountedRef.current) return

      if (updateError || !updatedPlan) {
        const errorMessage = updateError?.message || 'Failed to update travel plan'
        setError(errorMessage)
        showError(errorMessage)
        
        // Handle optimistic locking error
        if (errorMessage.includes('modified by another user')) {
          // Refresh plan data
          await fetchPlan()
        }
        return
      }

      showSuccess('Travel plan updated successfully!')
      if (isMountedRef.current) {
        navigate('/admin/travel')
      }
    } catch (err: unknown) { 
      if (!isMountedRef.current) return
      const errorMessage = getErrorMessage(err) || 'Failed to update travel plan'
      setError(errorMessage)
      showError(errorMessage)
    } finally { 
      if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Edit Travel Plan" 
        breadcrumbs={[
          { label: 'Travel Plans', path: '/admin/travel' },
          { label: 'Edit Travel Plan' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            
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

            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="blue" onClick={() => navigate('/admin/travel')} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
