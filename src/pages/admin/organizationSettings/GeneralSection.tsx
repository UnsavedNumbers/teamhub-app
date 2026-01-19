/**
 * General Settings Section
 *
 * Basic organization information, timezone, and status settings.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateGeneralSettings } from '../../../data/services/organizationSettingsService'
import type { GeneralSettings } from '../../../types/organizationSettings'
import { Button, Input, Select } from '../../../components/platformAdmin'

// Common US timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (AZ)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HI)' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const formSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  status: z.enum(['active', 'inactive']),
})

type FormData = z.infer<typeof formSchema>

interface GeneralSectionProps {
  settings: GeneralSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function GeneralSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: GeneralSectionProps) {
  const { context } = useUserContext()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization_name: settings.organization_name,
      timezone: settings.timezone,
      status: settings.status,
    },
  })

  // Track dirty state (Issue 10)
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      organization_name: settings.organization_name,
      timezone: settings.timezone,
      status: settings.status,
    })
  }, [settings, reset])

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      const { error: updateError } = await updateGeneralSettings(
        context,
        {
          organization_name: data.organization_name,
          timezone: data.timezone,
          status: data.status,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Refresh settings and reset form (Issue 2)
      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving general settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
      onSaveEnd()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">General Settings</h3>
        <p className="text-sm text-gray-500">
          Basic organization information and configuration
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

        <Controller
          name="organization_name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Organization Name"
              required
              error={errors.organization_name?.message}
              helper="The official name of your organization"
            />
          )}
        />

        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Timezone"
              required
              options={TIMEZONES}
              error={errors.timezone?.message}
              helper="Default timezone for all events and schedules"
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Organization Status"
              required
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              helper="Set to inactive to disable all organization features"
            />
          )}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            Reset
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty || isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}

