/**
 * Advanced Settings Section
 *
 * Advanced features like data retention, API access, and data export.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateAdvancedSettings } from '../../../data/services/organizationSettingsService'
import type { AdvancedSettings } from '../../../types/organizationSettings'
import { Button, Input, Checkbox } from '../../../components/platformAdmin'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { showSuccess, showError } from '../../../utils/toast'

const formSchema = z.object({
  data_retention_days: z.number().int().nullable(),
  enable_api_access: z.boolean(),
  api_rate_limit: z.number().int().nullable(),
  allow_data_export: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface AdvancedSectionProps {
  settings: AdvancedSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function AdvancedSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: AdvancedSectionProps) {
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
      data_retention_days: settings.data_retention_days,
      enable_api_access: settings.enable_api_access,
      api_rate_limit: settings.api_rate_limit,
      allow_data_export: settings.allow_data_export,
    },
  })

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      data_retention_days: settings.data_retention_days,
      enable_api_access: settings.enable_api_access,
      api_rate_limit: settings.api_rate_limit,
      allow_data_export: settings.allow_data_export,
    })
  }, [settings, reset])

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      const { error: updateError } = await updateAdvancedSettings(
        context,
        {
          data_retention_days: data.data_retention_days,
          enable_api_access: data.enable_api_access,
          api_rate_limit: data.api_rate_limit,
          allow_data_export: data.allow_data_export,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      showSuccess('Advanced settings updated successfully!')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving advanced settings:', err)
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
        <h3 className="text-lg font-medium text-gray-900 mb-1">Advanced Settings</h3>
        <p className="text-sm text-gray-500">
          Configure advanced features like data retention, API access, and exports
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
          <h4 className="font-medium text-gray-900">Data Retention</h4>

          <Controller
            name="data_retention_days"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                type="number"
                label="Data Retention Period (days)"
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
                error={errors.data_retention_days?.message}
                helper="Automatically delete data older than this many days (leave empty for no automatic deletion)"
              />
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-900">API Access</h4>

          <Controller
            name="enable_api_access"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Enable API access"
                helperText="Allow external applications to access organization data via API"
              />
            )}
          />

          <Controller
            name="api_rate_limit"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                type="number"
                label="API Rate Limit (requests per hour)"
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
                error={errors.api_rate_limit?.message}
                helper="Maximum number of API requests allowed per hour"
              />
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-900">Data Export</h4>

          <Controller
            name="allow_data_export"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Allow data export"
                helperText="Allow admins to export organization data to CSV/Excel files"
              />
            )}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> These are advanced settings that can affect data security
            and compliance. Only change these settings if you understand the implications.
          </p>
        </div>

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

