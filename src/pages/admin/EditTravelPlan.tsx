import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { getTravelPlanById } from '../../data/services/travelService'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input,
  DatePicker 
} from '../../components/platformAdmin'

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
  const { planId } = useParams<{ planId: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const { control, handleSubmit, reset } = useForm<TravelFormData>()

  const fetchPlan = useCallback(async () => {
    if (!isReady || !planId) return
    
    setLoading(true)
    const { data, error } = await getTravelPlanById(context, planId)
    
    if (error || !data) {
      navigate('/admin/travel')
      return
    }

    // Populate form with existing data
    reset({
      title: data.title,
      location: data.location,
      destination_city: data.destination_city || '',
      destination_state: data.destination_state || '',
      start_date: data.start_date,
      end_date: data.end_date,
      venue_name: data.venue_name || '',
      venue_address: data.venue_address || '',
      hotel_name: data.hotel_name || '',
      hotel_address: data.hotel_address || '',
      hotel_phone: data.hotel_phone || '',
      hotel_confirmation: data.hotel_confirmation || '',
      maps_url: data.maps_url || '',
      notes: data.notes || '',
    })

    setLoading(false)
  }, [context, isReady, planId, navigate, reset])

  useEffect(() => { 
    if (isReady && planId) fetchPlan() 
  }, [isReady, planId, fetchPlan])

  const onSubmit = async (_data: TravelFormData) => {
    setSaving(true)
    setError(null)
    
    try {
      // In fake data mode, just navigate back with success
      // TODO: Replace with real Supabase update when migrating
      /*
      const { error: updateError } = await supabase
        .from('travel_plans')
        .update({
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
        })
        .eq('id', planId)
      
      if (updateError) throw updateError
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      showSuccess('Travel plan updated successfully!')
      navigate('/admin/travel')
    } catch (err: unknown) { 
      const errorMessage = getErrorMessage(err) || 'Failed to update travel plan'
      setError(errorMessage)
      showError(errorMessage)
    } finally { 
      setSaving(false) 
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
              <Controller name="start_date" control={control} rules={{ required: 'Start date is required' }} render={({ field }) => <DatePicker {...field} label="Start Date" required />} />
              <Controller name="end_date" control={control} rules={{ required: 'End date is required' }} render={({ field }) => <DatePicker {...field} label="End Date" required />} />
            </div>

            <h3 className="pa-h3 pa-mb-4 pa-mt-6">VENUE & HOTEL</h3>
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="venue_name" control={control} render={({ field }) => <Input {...field} label="Venue Name" />} />
              <Controller name="venue_address" control={control} render={({ field }) => <Input {...field} label="Venue Address" />} />
              <Controller name="hotel_name" control={control} render={({ field }) => <Input {...field} label="Hotel Name" />} />
              <Controller name="hotel_address" control={control} render={({ field }) => <Input {...field} label="Hotel Address" />} />
              <Controller name="hotel_phone" control={control} render={({ field }) => <Input {...field} label="Hotel Phone" />} />
              <Controller name="hotel_confirmation" control={control} render={({ field }) => <Input {...field} label="Hotel Confirmation" />} />
            </div>

            <div className="pa-mb-6">
              <Controller name="maps_url" control={control} render={({ field }) => <Input {...field} label="Map Link URL" />} />
            </div>

            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="blue" onClick={() => navigate('/admin/travel')}>Cancel</Button>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
