/**
 * Defaults Settings Section
 *
 * Default values for new teams, seasons, and events.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateDefaultsSettings } from '../../../data/services/organizationSettingsService'
import { getSeasons } from '../../../data/services/seasonsService'
import { getSports } from '../../../data/services/sportsService'
import type { DefaultsSettings } from '../../../types/organizationSettings'
import { Button, Select, Checkbox } from '../../../components/platformAdmin'

const formSchema = z.object({
  default_season_id: z.string().nullable(),
  default_sport_id: z.string().nullable(),
  enable_practice: z.boolean(),
  enable_game: z.boolean(),
  enable_meeting: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface DefaultsSectionProps {
  settings: DefaultsSettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function DefaultsSection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: DefaultsSectionProps) {
  const { context } = useUserContext()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [seasons, setSeasons] = useState<Array<{ value: string; label: string }>>([])
  const [sports, setSports] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(true)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_season_id: settings.default_season_id,
      default_sport_id: settings.default_sport_id,
      enable_practice: settings.default_event_types?.includes('practice') ?? true,
      enable_game: settings.default_event_types?.includes('game') ?? true,
      enable_meeting: settings.default_event_types?.includes('meeting') ?? true,
    },
  })

  // Load seasons and sports
  useEffect(() => {
    if (!context) return

    async function loadOptions() {
      const [seasonsResult, sportsResult] = await Promise.all([
        getSeasons(context),
        getSports(context),
      ])

      if (seasonsResult.data) {
        setSeasons([
          { value: '', label: 'None' },
          ...seasonsResult.data.map((s) => ({ value: s.id, label: s.name })),
        ])
      }

      if (sportsResult.data) {
        setSports([
          { value: '', label: 'None' },
          ...sportsResult.data.map((s) => ({ value: s.id, label: s.name })),
        ])
      }

      setLoading(false)
    }

    loadOptions()
  }, [context])

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      default_season_id: settings.default_season_id,
      default_sport_id: settings.default_sport_id,
      enable_practice: settings.default_event_types?.includes('practice') ?? true,
      enable_game: settings.default_event_types?.includes('game') ?? true,
      enable_meeting: settings.default_event_types?.includes('meeting') ?? true,
    })
  }, [settings, reset])

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      // Build event types array
      const eventTypes: string[] = []
      if (data.enable_practice) eventTypes.push('practice')
      if (data.enable_game) eventTypes.push('game')
      if (data.enable_meeting) eventTypes.push('meeting')

      const { error: updateError } = await updateDefaultsSettings(
        context,
        {
          default_season_id: data.default_season_id || null,
          default_sport_id: data.default_sport_id || null,
          default_event_types: eventTypes,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving defaults settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
      onSaveEnd()
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading options...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Default Values</h3>
        <p className="text-sm text-gray-500">
          Set default values used when creating new teams, seasons, and events
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
          name="default_season_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value || ''}
              label="Default Season"
              options={seasons}
              error={errors.default_season_id?.message}
              helper="Pre-select this season when creating new teams or events"
            />
          )}
        />

        <Controller
          name="default_sport_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value || ''}
              label="Default Sport"
              options={sports}
              error={errors.default_sport_id?.message}
              helper="Pre-select this sport when creating new teams"
            />
          )}
        />

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Enabled Event Types
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Choose which event types are available when creating events
          </p>

          <Controller
            name="enable_practice"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Practice"
              />
            )}
          />

          <Controller
            name="enable_game"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Game"
              />
            )}
          />

          <Controller
            name="enable_meeting"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                label="Meeting"
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

