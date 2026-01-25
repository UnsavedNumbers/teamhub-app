/**
 * Create Season Modal
 * 
 * Modal for creating a new Season inline from the Team form.
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { createSeason } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { Button, Input, Checkbox } from '../platformAdmin'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setName('')
      setStartDate('')
      setEndDate('')
      setIsActive(false)
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
  const canCreate = !!name.trim() && isSeasonRangeValid

  const handleSubmit = async () => {
    if (!canCreate || !currentOrganization?.id || submitting || !isReady) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await createSeason(context, {
        org_id: currentOrganization.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      })

      if (result.error) {
        setError(result.error.message || 'Failed to create season')
      } else if (result.data) {
        // Call the callback with the newly created season
        onSeasonCreated(result.data)
        // Close modal - form will be reset by useEffect
        onClose()
      }
    } catch (err) {
      console.error('[CreateSeasonModal] Error creating season:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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
              />

              <div className="pa-grid pa-grid-2 pa-gap-4">
                <Input
                  label={t('admin.structureForms.fields.seasonStart.label')}
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setError(null)
                  }}
                  onBlur={() => markTouched('startDate')}
                  required
                  error={startError}
                />
                <Input
                  label={t('admin.structureForms.fields.seasonEnd.label')}
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setError(null)
                  }}
                  onBlur={() => markTouched('endDate')}
                  required
                  error={endError || rangeError}
                />
              </div>

              <Checkbox
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                label={t('admin.structureForms.fields.seasonActive.label')}
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
              disabled={!canCreate || submitting}
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
