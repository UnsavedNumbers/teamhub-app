/**
 * Create Season Modal
 * 
 * Modal for creating a new Season inline from the Team form.
 */

import { useState, useEffect, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { createSeason } from '../../data/services/seasonsService'
import { getTeams } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import type { Season } from '../../data/types/organization'
import { Button, Input, DatePicker, Checkbox, Select } from '../platformAdmin'

interface Team { id: string; name: string }

interface CreateSeasonModalProps {
  open: boolean
  onClose: () => void
  onSeasonCreated: (season: Season) => void
}

export function CreateSeasonModal({
  open,
  onClose,
  onSeasonCreated,
}: CreateSeasonModalProps) {
  const t = useT()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Load teams when modal opens
  const fetchTeams = useCallback(async () => {
    if (!isReady || !open) return
    setLoadingTeams(true)
    setError(null)
    try {
      const { data, error } = await getTeams(context, { activeOnly: true })
      if (!error && data) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
      } else if (error) {
        console.error('[CreateSeasonModal] Error fetching teams:', error)
        setError('Unable to load teams. Please check your internet connection.')
      }
    } catch (err) {
      console.error('[CreateSeasonModal] Error fetching teams:', err)
      setError('Unable to load teams. Please check your internet connection.')
    } finally {
      setLoadingTeams(false)
    }
  }, [context, isReady, open])

  useEffect(() => {
    if (open && isReady) {
      fetchTeams()
    }
  }, [open, isReady, fetchTeams])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setName('')
      setStartDate('')
      setEndDate('')
      setIsActive(false)
      setTeamId('')
      setTeams([])
      setError(null)
      setTouched({})
    }
  }, [open])

  const markTouched = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  const nameError = touched.name && !name.trim()
    ? t('admin.structureForms.validation.seasonNameRequired')
    : undefined

  const teamError = touched.teamId && !teamId
    ? 'Team is required'
    : undefined

  const startError = touched.startDate && !startDate
    ? t('admin.structureForms.validation.seasonStartRequired')
    : undefined

  const endError = touched.endDate && !endDate
    ? t('admin.structureForms.validation.seasonEndRequired')
    : undefined

  const rangeError = touched.endDate && startDate && endDate && endDate < startDate
    ? t('admin.structureForms.validation.seasonRangeInvalid')
    : undefined

  const isSeasonRangeValid = !!startDate && !!endDate && endDate >= startDate
  const canCreate = !!name.trim() && isSeasonRangeValid && !!teamId && !loadingTeams && teams.length > 0

  const handleSubmit = async () => {
    if (!canCreate || !currentOrganization?.id || submitting || !isReady || !teamId) return

    setSubmitting(true)
    setError(null)

    try {
      // Create the season
      const result = await createSeason(context, {
        org_id: currentOrganization.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      })

      if (result.error) {
        setError(result.error.message || 'Failed to create season')
        setSubmitting(false)
        return
      }

      if (!result.data) {
        setError('Failed to create season. Please try again.')
        setSubmitting(false)
        return
      }

      // Create the team_seasons link
      const { error: linkError } = await supabase
        .from('team_seasons')
        .insert({
          team_id: teamId,
          season_id: result.data.id,
          is_active: isActive,
        })

      if (linkError) {
        // Handle duplicate entry (idempotent - treat as success)
        if (linkError.code === '23505') {
          // Unique constraint violation - link already exists, treat as success
          console.warn('[CreateSeasonModal] team_seasons link already exists:', linkError)
          // Proceed with success flow
        } else {
          // Other error - rollback by deleting the season
          console.error('[CreateSeasonModal] Error creating team_seasons link:', linkError)
          await supabase
            .from('seasons')
            .delete()
            .eq('id', result.data.id)
          
          // Determine specific error message
          if (linkError.message?.includes('network') || linkError.message?.includes('fetch')) {
            setError('Unable to connect. Please check your internet connection.')
          } else {
            setError('Season created but failed to link to team. Please try again.')
          }
          setSubmitting(false)
          return
        }
      }

      // Success - both season and link created
      onSeasonCreated(result.data)
      onClose()
    } catch (err) {
      console.error('[CreateSeasonModal] Error creating season:', err)
      
      // Determine specific error message
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Unable to connect. Please check your internet connection.')
        } else {
          setError(err.message || 'An unexpected error occurred')
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 20, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pa-card"
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: 'var(--pa-space-4)',
            padding: 0,
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
            <h2 className="pa-h2" style={{ margin: 0 }}>
              {t('admin.structureForms.pageTitle.add', { item: t('admin.structureForms.items.season') })}
            </h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              Create a new season for your organization
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            {error && (
              <div
                className="pa-card pa-mb-4"
                style={{
                  background: 'var(--pa-danger-bg)',
                  border: '1px solid var(--pa-danger)',
                  padding: 'var(--pa-space-3)',
                }}
              >
                <div className="pa-body-m pa-text-danger">{error}</div>
              </div>
            )}

            <div className="pa-flex pa-flex-col pa-gap-4">
              {teams.length === 0 && !loadingTeams && (
                <div
                  className="pa-card pa-mb-4"
                  style={{
                    background: 'var(--pa-warning-bg)',
                    border: '1px solid var(--pa-warning)',
                    padding: 'var(--pa-space-3)',
                  }}
                >
                  <div className="pa-body-m pa-text-warning">
                    No active teams available. Please create a team first.
                  </div>
                </div>
              )}

              <Select
                label="Team"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value)
                  setError(null)
                }}
                onBlur={() => markTouched('teamId')}
                options={loadingTeams 
                  ? [{ value: '', label: 'Loading teams...' }]
                  : teams.map(t => ({ value: t.id, label: t.name }))
                }
                required
                error={teamError}
                disabled={loadingTeams || submitting || teams.length === 0}
              />

              <Input
                label={t('admin.structureForms.fields.seasonName.label')}
                placeholder={t('admin.structureForms.fields.seasonName.placeholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                onBlur={() => markTouched('name')}
                required
                error={nameError}
                disabled={loadingTeams || submitting}
              />

              <div className="pa-grid pa-grid-2 pa-gap-4">
                <DatePicker
                  label={t('admin.structureForms.fields.seasonStart.label')}
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value)
                    setError(null)
                  }}
                  required
                  error={startError}
                  isDisabled={loadingTeams || submitting}
                />
                <DatePicker
                  label={t('admin.structureForms.fields.seasonEnd.label')}
                  value={endDate}
                  onChange={(value) => {
                    setEndDate(value)
                    setError(null)
                  }}
                  minValue={startDate}
                  required
                  error={endError || rangeError}
                  isDisabled={loadingTeams || submitting}
                />
              </div>

              <Checkbox
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                label={t('admin.structureForms.fields.seasonActive.label')}
                disabled={loadingTeams || submitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              padding: 'var(--pa-space-4) var(--pa-space-5)',
              borderTop: '1px solid var(--pa-n100)',
              display: 'flex',
              gap: 'var(--pa-space-3)',
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canCreate || submitting || loadingTeams}
              loading={submitting}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
