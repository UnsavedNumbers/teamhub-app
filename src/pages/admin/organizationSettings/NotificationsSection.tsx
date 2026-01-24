/**
 * Notifications Settings Section
 *
 * Configure notification preferences and delivery channels.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateNotificationSettings } from '../../../data/services/organizationSettingsService'
import type { NotificationSettings } from '../../../types/organizationSettings'
import { Button, Checkbox, Select } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'

const PAYMENT_BEHAVIORS = [
  { value: 'immediate', label: 'Send Immediately' },
  { value: 'daily_digest', label: 'Daily Digest' },
]

const formSchema = z.object({
  enable_email: z.boolean(),
  enable_sms: z.boolean(),
  enable_push: z.boolean(),
  enable_in_app: z.boolean(),
  attendance_reminders_enabled: z.boolean(),
  schedule_change_alerts_enabled: z.boolean(),
  payment_reminder_behavior: z.enum(['immediate', 'daily_digest']),
})

type FormData = z.infer<typeof formSchema>

interface NotificationsSectionProps {
  settings: NotificationSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function NotificationsSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: NotificationsSectionProps) {
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
      enable_email: settings.default_channels?.includes('email') ?? true,
      enable_sms: settings.default_channels?.includes('sms') ?? false,
      enable_push: settings.default_channels?.includes('push') ?? false,
      enable_in_app: settings.default_channels?.includes('in_app') ?? true,
      attendance_reminders_enabled: settings.attendance_reminders_enabled,
      schedule_change_alerts_enabled: settings.schedule_change_alerts_enabled,
      payment_reminder_behavior: settings.payment_reminder_behavior,
    },
  })

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      enable_email: settings.default_channels?.includes('email') ?? true,
      enable_sms: settings.default_channels?.includes('sms') ?? false,
      enable_push: settings.default_channels?.includes('push') ?? false,
      enable_in_app: settings.default_channels?.includes('in_app') ?? true,
      attendance_reminders_enabled: settings.attendance_reminders_enabled,
      schedule_change_alerts_enabled: settings.schedule_change_alerts_enabled,
      payment_reminder_behavior: settings.payment_reminder_behavior,
    })
  }, [settings, reset])

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      // Build channels array
      const channels: Array<'email' | 'sms' | 'push' | 'in_app'> = []
      if (data.enable_email) channels.push('email')
      if (data.enable_sms) channels.push('sms')
      if (data.enable_push) channels.push('push')
      if (data.enable_in_app) channels.push('in_app')

      const { error: updateError } = await updateNotificationSettings(
        context,
        {
          default_channels: channels,
          attendance_reminders_enabled: data.attendance_reminders_enabled,
          schedule_change_alerts_enabled: data.schedule_change_alerts_enabled,
          payment_reminder_behavior: data.payment_reminder_behavior,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      showSuccess('Notification settings updated successfully!')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving notification settings:', err)
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
        <h3 className="text-lg font-medium text-gray-900 mb-1">Notification Settings</h3>
        <p className="text-sm text-gray-500">
          Configure how and when notifications are sent to organization members
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
          <h4 className="font-medium text-gray-900">Notification Channels</h4>
          <p className="text-sm text-gray-500">
            Select default channels for sending notifications (users can override these in their
            preferences)
          </p>

          <Controller
            name="enable_email"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Email"
                helperText="Send notifications via email"
              />
            )}
          />

          <Controller
            name="enable_sms"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="SMS"
                helperText="Send notifications via text message (requires SMS service setup)"
              />
            )}
          />

          <Controller
            name="enable_push"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Push Notifications"
                helperText="Send push notifications to mobile apps (coming soon)"
              />
            )}
          />

          <Controller
            name="enable_in_app"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="In-App Notifications"
                helperText="Show notifications within the application"
              />
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-900">Notification Triggers</h4>

          <Controller
            name="attendance_reminders_enabled"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Send attendance reminders"
                helperText="Automatically remind coaches to submit attendance before deadline"
              />
            )}
          />

          <Controller
            name="schedule_change_alerts_enabled"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Send schedule change alerts"
                helperText="Notify users when events are created, updated, or cancelled"
              />
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-gray-900">Payment Reminders</h4>

          <Controller
            name="payment_reminder_behavior"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Payment Reminder Behavior"
                options={PAYMENT_BEHAVIORS}
                error={errors.payment_reminder_behavior?.message}
                helper="Choose when to send payment reminder notifications"
              />
            )}
          />
        </div>

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

