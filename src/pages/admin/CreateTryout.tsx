import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { startTransition } from 'react'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { createTryout } from '../../data/services/tryoutsService'
import type { Tryout } from '../../data/services/tryoutsService'
import {
  AdminPageHeader,
  Card,
  Button,
  Input,
  Select,
  DatePicker,
  TimePicker
} from '../../components/platformAdmin'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'

interface TryoutFormData {
  title: string
  description: string
  location: string
  age_group: string
  entry_fee: number
  start_at: string
  type: string
  registration_deadline_at: string
  capacity: number
}

const TRYOUT_TYPE_OPTIONS = [
  { value: 'open', label: 'Open Tryout' },
  { value: 'invitation_only', label: 'Invitation Only' },
  { value: 'make_up', label: 'Make-up Tryout' },
  { value: 'evaluation_clinic', label: 'Evaluation Clinic' }
]

export default function CreateTryout() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<TryoutFormData>({
    defaultValues: {
      title: '',
      description: '',
      location: '',
      age_group: '',
      entry_fee: 0,
      start_at: '',
      type: 'open',
      registration_deadline_at: '',
      capacity: 0
    }
  })

  const onSubmit = useCallback(async (data: TryoutFormData) => {
    if (!isReady || !currentOrganization) return

    setSaving(true)
    setError(null)

    try {
      const tryoutData: Partial<Tryout> = {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        age_group: data.age_group,
        entry_fee: data.entry_fee,
        start_at: data.start_at || null,
        type: data.type,
        org_id: currentOrganization.id
      }

      // Add optional fields if provided
      const extendedTryoutData: any = tryoutData
      if (data.registration_deadline_at) {
        extendedTryoutData.registration_deadline_at = data.registration_deadline_at
      }
      if (data.capacity > 0) {
        extendedTryoutData.capacity = data.capacity
      }

      const { data: createdTryout, error: createError } = await createTryout(context, tryoutData)

      if (createError) throw createError

      // Navigate to the created tryout's detail page
      navigate(`/admin/tryouts/${createdTryout!.id}`)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to create tryout')
    } finally {
      setSaving(false)
    }
  }, [context, isReady, currentOrganization, navigate])

  if (!isReady || !currentOrganization) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <AdminPageHeader
        title="Create Tryout"
        breadcrumbs={[
          { label: 'Tryouts', path: '/admin/tryouts' },
          { label: 'Create Tryout' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
                {error}
              </div>
            )}

            {/* SECTION 1: BASIC INFO */}
            <div className="pa-mb-4">
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Title is required' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Tryout Title"
                    required
                    error={errors.title?.message}
                  />
                )}
              />
            </div>

            <div className="pa-mb-4">
              <label className="pa-label">Description/Notes</label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="pa-input pa-textarea"
                    placeholder="Optional notes and instructions for participants"
                    rows={3}
                  />
                )}
              />
            </div>

            {/* SECTION 2: TYPE AND AGE GROUP */}
            <div className="pa-grid pa-grid-2 pa-mb-4 pa-gap-4">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value || ''}
                    label="Tryout Type"
                    options={TRYOUT_TYPE_OPTIONS}
                  />
                )}
              />
              <Controller
                name="age_group"
                control={control}
                rules={{ required: 'Age group is required' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Age Group"
                    placeholder="e.g. U12, 10-12 years"
                    required
                    error={errors.age_group?.message}
                  />
                )}
              />
            </div>

            {/* SECTION 3: LOCATION AND FEE */}
            <div className="pa-grid pa-grid-2 pa-mb-4 pa-gap-4">
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <LocationAutocomplete
                    value={field.value || ''}
                    onInputChange={field.onChange}
                    onChange={(address) => {
                      startTransition(() => {
                        setValue('location', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                      })
                    }}
                    label="Location"
                    placeholder="Enter tryout location"
                  />
                )}
              />
              <Controller
                name="entry_fee"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Entry Fee ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            {/* SECTION 4: DATES AND TIMES */}
            <div className="pa-mb-4">
              <div className="pa-form-grid pa-form-grid-3 pa-form-grid-tablet-2col">
                <Controller
                  name="start_at"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Tryout Date"
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(date) => {
                        const time = field.value?.split('T')[1] || '09:00'
                        field.onChange(`${date}T${time}`)
                      }}
                    />
                  )}
                />
                <div className="pa-max-w-xs">
                  <Controller
                    name="start_at"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        label="Start Time"
                        value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                        onChange={(time) => {
                          const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                          field.onChange(`${date}T${time}`)
                        }}
                      />
                    )}
                  />
                </div>
                <div className="pa-max-w-xs">
                  <Controller
                    name="registration_deadline_at"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        label="Registration Deadline"
                        value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                        onChange={(time) => {
                          const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                          field.onChange(time ? `${date}T${time}` : '')
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5: CAPACITY */}
            <div className="pa-mb-4">
              <Controller
                name="capacity"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Capacity (Max Spots)"
                    type="number"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            {/* FORM ACTIONS */}
            <div className="pa-flex pa-justify-end pa-gap-3 pa-mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/admin/tryouts')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Tryout'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}