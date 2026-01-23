/**
 * SportUniformForm Component
 * 
 * Main form component that adapts based on sport selection.
 * Handles both org-level and team-level uniform creation.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useUserContext } from '../../hooks/useUserContext'
import { getSports } from '../../data/services/sportsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getTeams } from '../../data/services/teamsService'
import { getUniformConfigForSport } from '../../config/uniformFieldConfigs'
import { Input, Select, Button, Card } from '../platformAdmin'
import { SportFieldRenderer } from './SportFieldRenderer'
import { UniformPartsSelector } from './UniformPartsSelector'
import type { CreateUniformKitDTO } from '../../types/uniforms'
import type { Sport, Season, Team } from '../../data/types/organization'

interface SportUniformFormProps {
  onSubmit: (data: CreateUniformKitDTO) => Promise<void>
  initialData?: Partial<CreateUniformKitDTO>
  isOrgLevel?: boolean
  teamId?: string | null
}

export function SportUniformForm({ 
  onSubmit, 
  initialData,
  isOrgLevel = false,
  teamId = null
}: SportUniformFormProps) {
  const { context, isReady } = useUserContext()
  const [sports, setSports] = useState<Sport[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; sport_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateUniformKitDTO & {
    sport_name: string
    program_id_select: string
    season_id_select: string
    team_id_select: string
    selectedParts: string[]
  }>({
    defaultValues: {
      name: initialData?.name || '',
      sport_id: initialData?.sport_id || '',
      program_id: initialData?.program_id || null,
      season_id: initialData?.season_id || null,
      team_id: teamId || initialData?.team_id || null,
      org_id: context?.orgId || '',
      primary_color: initialData?.primary_color || null,
      secondary_color: initialData?.secondary_color || null,
      accent_color: initialData?.accent_color || null,
      vendor: initialData?.vendor || null,
      notes: initialData?.notes || null,
      status: initialData?.status || 'active',
      deadline_at: initialData?.deadline_at || null,
      sport_specific_fields: initialData?.sport_specific_fields || {},
      sport_name: '',
      program_id_select: '',
      season_id_select: '',
      team_id_select: teamId || '',
      selectedParts: [],
    },
  })

  const selectedSportName = watch('sport_name')
  const selectedSportId = watch('sport_id')
  const selectedProgramId = watch('program_id_select')
  const selectedTeamId = watch('team_id_select')
  const selectedParts = watch('selectedParts')

  // Load initial data
  useEffect(() => {
    if (!isReady || !context) return

    async function loadData() {
      setLoading(true)
      try {
        const [sportsResult, seasonsResult, teamsResult] = await Promise.all([
          getSports(context),
          getSeasons(context),
          isOrgLevel ? Promise.resolve({ data: [], error: null }) : getTeams(context, { activeOnly: true }),
        ])

        if (sportsResult.data) {
          setSports(sportsResult.data)
          // Set initial sport if provided
          if (initialData?.sport_id) {
            const sport = sportsResult.data.find(s => s.id === initialData.sport_id)
            if (sport) {
              setValue('sport_name', sport.name)
            }
          }
        }

        if (seasonsResult.data) {
          setSeasons(seasonsResult.data)
          if (initialData?.season_id) {
            setValue('season_id_select', initialData.season_id)
          }
        }

        if (teamsResult.data) {
          setTeams(teamsResult.data)
        }
      } catch (err) {
        console.error('Error loading form data:', err)
        setError('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isReady, context, isOrgLevel, initialData, setValue])

  // Load programs when sport changes
  useEffect(() => {
    if (!selectedSportId || !context) return

    async function loadPrograms() {
      // In a real implementation, fetch programs for the selected sport
      // For now, we'll derive from teams or leave empty
      setPrograms([])
    }

    loadPrograms()
  }, [selectedSportId, context])

  // Update sport_id when sport name changes
  useEffect(() => {
    if (selectedSportName) {
      const sport = sports.find(s => s.name.toLowerCase() === selectedSportName.toLowerCase())
      if (sport) {
        setValue('sport_id', sport.id)
      }
    }
  }, [selectedSportName, sports, setValue])

  // Update program_id when program selection changes
  useEffect(() => {
    if (selectedProgramId) {
      setValue('program_id', selectedProgramId || null)
    }
  }, [selectedProgramId, setValue])

  const selectedSeasonId = watch('season_id_select')
  
  // Update season_id when season selection changes
  useEffect(() => {
    if (selectedSeasonId) {
      setValue('season_id', selectedSeasonId || null)
    }
  }, [selectedSeasonId, setValue])

  // Update team_id when team selection changes
  useEffect(() => {
    if (selectedTeamId && !isOrgLevel) {
      setValue('team_id', selectedTeamId)
    } else if (isOrgLevel) {
      setValue('team_id', null)
    }
  }, [selectedTeamId, isOrgLevel, setValue])

  const sportConfig = selectedSportName ? getUniformConfigForSport(selectedSportName) : null

  const onFormSubmit = async (data: CreateUniformKitDTO & {
    sport_name: string
    program_id_select: string
    season_id_select: string
    team_id_select: string
    selectedParts: string[]
  }) => {
    setSubmitting(true)
    setError(null)

    try {
      // Build sport_specific_fields from form data
      const sportSpecificFields: Record<string, any> = {}
      if (sportConfig) {
        sportConfig.fields.forEach(field => {
          const fieldValue = data[field.key as keyof typeof data]
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            sportSpecificFields[field.key] = fieldValue
          }
        })
      }

      const submitData: CreateUniformKitDTO = {
        name: data.name,
        sport_id: data.sport_id,
        program_id: data.program_id || null,
        season_id: isOrgLevel ? null : data.season_id,
        team_id: isOrgLevel ? null : data.team_id,
        org_id: context?.orgId || '',
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        accent_color: data.accent_color || null,
        vendor: data.vendor || null,
        notes: data.notes || null,
        status: data.status || 'active',
        deadline_at: data.deadline_at || null,
        sport_specific_fields: sportSpecificFields,
      }

      await onSubmit(submitData)
    } catch (err) {
      console.error('Error submitting form:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {error && (
        <div className="pa-alert pa-alert--error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <Card title="Basic Information">
        <Controller
          name="sport_name"
          control={control}
          rules={{ required: 'Sport is required' }}
          render={({ field, fieldState }) => (
            <Select
              label="Sport"
              required
              error={fieldState.error?.message}
              options={sports.map(s => ({ value: s.name, label: s.name }))}
              {...field}
            />
          )}
        />

        {!isOrgLevel && (
          <Controller
            name="team_id_select"
            control={control}
            rules={{ required: !isOrgLevel ? 'Team is required' : false }}
            render={({ field, fieldState }) => (
              <Select
                label="Team"
                required={!isOrgLevel}
                error={fieldState.error?.message}
                options={teams.map(t => ({ value: t.id, label: t.name }))}
                {...field}
              />
            )}
          />
        )}

        <Controller
          name="program_id_select"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              label="Program (Optional)"
              error={fieldState.error?.message}
              options={[
                { value: '', label: 'None' },
                ...programs.map(p => ({ value: p.id, label: p.name }))
              ]}
              {...field}
            />
          )}
        />

        {!isOrgLevel && (
          <Controller
            name="season_id_select"
            control={control}
            rules={{ required: !isOrgLevel ? 'Season is required' : false }}
            render={({ field, fieldState }) => (
              <Select
                label="Season"
                required={!isOrgLevel}
                error={fieldState.error?.message}
                options={seasons.map(s => ({ value: s.id, label: s.name }))}
                {...field}
              />
            )}
          />
        )}

        <Controller
          name="name"
          control={control}
          rules={{ required: 'Uniform name is required' }}
          render={({ field, fieldState }) => (
            <Input
              label="Uniform Name"
              required
              error={fieldState.error?.message}
              placeholder="e.g., Home, Away, Alternate"
              {...field}
            />
          )}
        />
      </Card>

      {sportConfig && selectedSportName && (
        <>
          <UniformPartsSelector
            config={sportConfig}
            selectedParts={selectedParts}
            onPartsChange={(parts) => setValue('selectedParts', parts)}
          />

          <Card title="Sport-Specific Fields">
            {sportConfig.fields.map(field => (
              <SportFieldRenderer
                key={field.key}
                field={field}
                name={`sport_specific_fields.${field.key}`}
              />
            ))}

            {sportConfig.optionalSections?.map(section => (
              <div key={section.key} style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                  {section.label}
                </h3>
                {section.fields.map(field => (
                  <SportFieldRenderer
                    key={field.key}
                    field={field}
                    name={`sport_specific_fields.${section.key}.${field.key}`}
                  />
                ))}
              </div>
            ))}
          </Card>
        </>
      )}

      <Card title="Common Fields">
        <Controller
          name="primary_color"
          control={control}
          render={({ field }) => (
            <Input
              label="Primary Color"
              type="color"
              {...field}
              value={field.value || '#000000'}
            />
          )}
        />

        <Controller
          name="secondary_color"
          control={control}
          render={({ field }) => (
            <Input
              label="Secondary Color"
              type="color"
              {...field}
              value={field.value || '#000000'}
            />
          )}
        />

        <Controller
          name="accent_color"
          control={control}
          render={({ field }) => (
            <Input
              label="Accent Color (Optional)"
              type="color"
              {...field}
              value={field.value || '#000000'}
            />
          )}
        />

        <Controller
          name="vendor"
          control={control}
          render={({ field }) => (
            <Input
              label="Vendor (Optional)"
              {...field}
            />
          )}
        />

        <Controller
          name="deadline_at"
          control={control}
          render={({ field }) => (
            <Input
              label="Order Deadline (Optional)"
              type="datetime-local"
              {...field}
            />
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <div className="pa-form-group">
              <label className="pa-label">Notes (Admin Only)</label>
              <textarea
                className="pa-input pa-textarea"
                rows={4}
                {...field}
                placeholder="Internal notes about this uniform..."
              />
            </div>
          )}
        />
      </Card>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Uniform'}
        </Button>
      </div>
    </form>
  )
}

export default SportUniformForm
