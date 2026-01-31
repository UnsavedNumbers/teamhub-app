/**
 * Attendance Settings Section
 *
 * Configure attendance requirements and parent visibility.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateAttendanceSettings } from '../../../data/services/organizationSettingsService'
import type { AttendanceSettings } from '../../../types/organizationSettings'
import { Button, Input, Checkbox } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'

const formSchema = z.object({
  required_for_practice: z.boolean(),
  required_for_game: z.boolean(),
  required_for_meeting: z.boolean(),
  submission_deadline_hours: z.number().int().min(0).max(168),
  lock_after_days: z.number().int().nullable(),
  allow_admin_override: z.boolean(),
  enable_coach_reminders: z.boolean(),
  parent_can_view_own_child: z.boolean(),
  parent_can_view_team_attendance: z.boolean(),
  parent_can_submit_attendance: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface AttendanceSectionProps {
  settings: AttendanceSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function AttendanceSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: AttendanceSectionProps) {
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
      required_for_practice: settings.required_for_practice,
      required_for_game: settings.required_for_game,
      required_for_meeting: settings.required_for_meeting,
      submission_deadline_hours: settings.submission_deadline_hours,
      lock_after_days: settings.lock_after_days,
      allow_admin_override: settings.allow_admin_override,
      enable_coach_reminders: settings.enable_coach_reminders,
      parent_can_view_own_child: settings.parent_visibility?.can_view_own_child ?? true,
      parent_can_view_team_attendance: settings.parent_visibility?.can_view_team_attendance ?? false,
      parent_can_submit_attendance: settings.parent_visibility?.can_submit_attendance ?? false,
    },
  })

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      required_for_practice: settings.required_for_practice,
      required_for_game: settings.required_for_game,
      required_for_meeting: settings.required_for_meeting,
      submission_deadline_hours: settings.submission_deadline_hours,
      lock_after_days: settings.lock_after_days,
      allow_admin_override: settings.allow_admin_override,
      enable_coach_reminders: settings.enable_coach_reminders,
      parent_can_view_own_child: settings.parent_visibility?.can_view_own_child ?? true,
      parent_can_view_team_attendance: settings.parent_visibility?.can_view_team_attendance ?? false,
      parent_can_submit_attendance: settings.parent_visibility?.can_submit_attendance ?? false,
    })
  }, [settings, reset])

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      const { error: updateError } = await updateAttendanceSettings(
        context,
        {
          required_for_practice: data.required_for_practice,
          required_for_game: data.required_for_game,
          required_for_meeting: data.required_for_meeting,
          submission_deadline_hours: data.submission_deadline_hours,
          lock_after_days: data.lock_after_days,
          allow_admin_override: data.allow_admin_override,
          enable_coach_reminders: data.enable_coach_reminders,
          parent_visibility: {
            can_view_own_child: data.parent_can_view_own_child,
            can_view_team_attendance: data.parent_can_view_team_attendance,
            can_submit_attendance: data.parent_can_submit_attendance,
          },
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      showSuccess('Attendance settings updated successfully!')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving attendance settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
      onSaveEnd()
    }
  }

  return (
    <div className="pa-form-container">
      <div>
        <h3 className="pa-h3 pa-mb-1">Attendance Settings</h3>
        <p className="pa-text-sm pa-text-slate-500">
          Configure attendance requirements and visibility rules
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="pa-form-grid">
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

        <div className="pa-checkbox-group">
          <h4 className="pa-h4 pa-mb-3">Attendance Requirements</h4>

          <div className="pa-checkbox-row">
            <Controller
              name="required_for_practice"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Require attendance submission for practices"
                />
              )}
            />
          </div>

          <div className="pa-checkbox-row">
            <Controller
              name="required_for_game"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Require attendance submission for games"
                />
              )}
            />
          </div>

          <div className="pa-checkbox-row">
            <Controller
              name="required_for_meeting"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Require attendance submission for meetings"
                />
              )}
            />
          </div>
        </div>

        <div>
          <h4 className="pa-h4 pa-mb-3">Submission & Locking</h4>

          <Controller
            name="submission_deadline_hours"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                label="Submission Deadline (hours before event)"
                min={0}
                max={168}
                error={errors.submission_deadline_hours?.message}
                helper="How many hours before event start attendance must be submitted"
              />
            )}
          />

          <Controller
            name="lock_after_days"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                {...field}
                type="number"
                label="Lock Attendance After (days)"
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
                error={errors.lock_after_days?.message}
                helper="Lock attendance records after this many days (leave empty for no lock)"
              />
            )}
          />
        </div>

        <div className="pa-checkbox-group">
          <div className="pa-checkbox-row">
            <Controller
              name="allow_admin_override"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Allow admins to override locked attendance"
                />
              )}
            />
          </div>

          <div className="pa-checkbox-row">
            <Controller
              name="enable_coach_reminders"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Send reminders to coaches for missing attendance"
                />
              )}
            />
          </div>
        </div>

        <div className="pa-checkbox-group">
          <h4 className="pa-h4 pa-mb-3">Parent Visibility</h4>

          <div className="pa-checkbox-row">
            <Controller
              name="parent_can_view_own_child"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Parents can view their own child's attendance"
                />
              )}
            />
          </div>

          <div className="pa-checkbox-row">
            <Controller
              name="parent_can_view_team_attendance"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Parents can view full team attendance"
                />
              )}
            />
          </div>

          <div className="pa-checkbox-row">
            <Controller
              name="parent_can_submit_attendance"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  {...field}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  label="Parents can submit attendance for their children"
                />
              )}
            />
          </div>
        </div>

        <div className="pa-form-actions">
          <Button
            type="button"
            variant="ghost"
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

