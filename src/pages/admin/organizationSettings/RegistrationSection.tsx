/**
 * Registration Settings Section
 *
 * Configure player registration requirements and form fields.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateRegistrationSettings } from '../../../data/services/organizationSettingsService'
import type { RegistrationSettings } from '../../../types/organizationSettings'
import { Button, Checkbox } from '../../../components/platformAdmin'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { showSuccess, showError } from '../../../utils/toast'
import { useFeatureGate } from '../../../lib/featureGate'

const AVAILABLE_FIELDS = [
  { id: 'first_name', label: 'First Name', required: true },
  { id: 'last_name', label: 'Last Name', required: true },
  { id: 'date_of_birth', label: 'Date of Birth', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'phone', label: 'Phone Number', required: false },
  { id: 'address', label: 'Address', required: false },
  { id: 'emergency_contact', label: 'Emergency Contact', required: false },
  { id: 'medical_info', label: 'Medical Information', required: false },
]

const formSchema = z.object({
  required_fields: z.array(z.string()),
  allow_players_without_guardians: z.boolean(),
  allow_guardian_self_invite: z.boolean(),
  medical_form_required: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface RegistrationSectionProps {
  settings: RegistrationSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function RegistrationSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: RegistrationSectionProps) {
  const { context } = useUserContext()
  const medicalGate = useFeatureGate('medical_enabled')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      required_fields: settings.required_fields || [],
      allow_players_without_guardians: settings.allow_players_without_guardians,
      allow_guardian_self_invite: settings.allow_guardian_self_invite,
      medical_form_required: settings.medical_form_required,
    },
  })

  const requiredFields = watch('required_fields')

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      required_fields: settings.required_fields || [],
      allow_players_without_guardians: settings.allow_players_without_guardians,
      allow_guardian_self_invite: settings.allow_guardian_self_invite,
      medical_form_required: settings.medical_form_required,
    })
  }, [settings, reset])

  const toggleField = (fieldId: string) => {
    const current = requiredFields || []
    if (current.includes(fieldId)) {
      setValue('required_fields', current.filter((f) => f !== fieldId), { shouldDirty: true })
    } else {
      setValue('required_fields', [...current, fieldId], { shouldDirty: true })
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      const { error: updateError } = await updateRegistrationSettings(
        context,
        {
          required_fields: data.required_fields,
          allow_players_without_guardians: data.allow_players_without_guardians,
          allow_guardian_self_invite: data.allow_guardian_self_invite,
          medical_form_required: data.medical_form_required,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      showSuccess('Registration settings updated successfully!')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving registration settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
      onSaveEnd()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Registration Settings</h3>
        <p className="text-sm text-gray-500">
          Configure required fields and registration policies
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            Settings saved successfully!
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Required Fields</h4>
          <p className="text-sm text-gray-500">
            Select which fields are required when registering a new player
          </p>

          {AVAILABLE_FIELDS.map((field) => (
            <div key={field.id} className="flex items-center">
              <Checkbox
                checked={requiredFields?.includes(field.id) ?? false}
                onChange={() => toggleField(field.id)}
                label={field.label}
                disabled={field.required}
              />
              {field.required && (
                <span className="ml-2 text-xs text-gray-500">(always required)</span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-900">Guardian Settings</h4>

          <Controller
            name="allow_players_without_guardians"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Allow players to be added without guardians"
                helperText="If disabled, every player must have at least one guardian linked"
              />
            )}
          />

          <Controller
            name="allow_guardian_self_invite"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Allow guardians to request access via invite link"
                helperText="Guardians can join using a shared invite code"
              />
            )}
          />
        </div>

        {medicalGate.allowed && !medicalGate.loading && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900">Medical Forms</h4>

            <Controller
              name="medical_form_required"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Require medical form before participation"
                  helperText="Players cannot be added to teams until medical form is submitted"
                />
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <OrgAdminButton
            type="button"
            variant="primary"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            Reset
          </OrgAdminButton>
          <Button type="submit" loading={saving} disabled={!isDirty || isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}

