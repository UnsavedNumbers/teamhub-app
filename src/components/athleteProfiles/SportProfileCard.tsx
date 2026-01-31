/**
 * SportProfileCard Component
 *
 * Consolidated card for sport-specific athlete profiles with tabbed navigation.
 * Combines Profile Information and Equipment & Gear into a single card.
 *
 * Design: Tabbed interface with consistent portal styling.
 */

import { useState, useEffect, useCallback } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../hooks/useAthleteSportProfile'
import Card from '../portal/Card'
import { CardTitle } from '../portal/Typography'
import Button from '../portal/Button'
import type { SportCode } from '../../types/sports'
import type { SportFieldDefinition } from '../../types/athleteSportProfiles'

interface SportProfileCardProps {
  /** Athlete ID */
  athleteId: string
  /** Sport code */
  sportCode: SportCode
  /** Callback after successful save */
  onSave?: () => void
  /** Callback on cancel */
  onCancel?: () => void
}

/**
 * SportProfileCard - Consolidated tabbed card for sport profiles
 */
export function SportProfileCard({
  athleteId,
  sportCode,
  onSave,
  onCancel,
}: SportProfileCardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'equipment'>('profile')

  // Fetch field definitions
  const { profileFields, equipmentFields, loading: fieldsLoading, error: fieldsError } =
    useSportFieldDefinitions(sportCode)

  // Fetch/update profile
  const { profile, loading: profileLoading, updating, updateProfile, error: profileError } =
    useAthleteSportProfile(athleteId, sportCode)

  // Form state
  const [profileData, setProfileData] = useState<Record<string, unknown>>({})
  const [equipmentData, setEquipmentData] = useState<Record<string, unknown>>({})
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [equipmentErrors, setEquipmentErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setProfileData(profile.profile_data || {})
      setEquipmentData(profile.equipment_data || {})
    }
  }, [profile])

  // Handle field change
  const handleProfileFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setProfileData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
    setHasChanges(true)
    setProfileErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  const handleEquipmentFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setEquipmentData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
    setHasChanges(true)
    setEquipmentErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newProfileErrors: Record<string, string> = {}
    const newEquipmentErrors: Record<string, string> = {}

    profileFields.forEach((field) => {
      const value = profileData[field.field_key]
      const isRequired = !field.is_optional
      if (isRequired && (value === null || value === undefined || value === '')) {
        newProfileErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    equipmentFields.forEach((field) => {
      const value = equipmentData[field.field_key]
      const isRequired = !field.is_optional
      if (isRequired && (value === null || value === undefined || value === '')) {
        newEquipmentErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    setProfileErrors(newProfileErrors)
    setEquipmentErrors(newEquipmentErrors)
    return Object.keys(newProfileErrors).length === 0 && Object.keys(newEquipmentErrors).length === 0
  }, [profileFields, equipmentFields, profileData, equipmentData])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    const success = await updateProfile(profileData, equipmentData)

    if (success) {
      setHasChanges(false)
      onSave?.()
    }
  }, [validateForm, updateProfile, profileData, equipmentData, onSave])

  // Render fields with layout
  const renderFieldsWithLayout = (
    fields: SportFieldDefinition[],
    data: Record<string, unknown>,
    onChange: (fieldKey: string, value: unknown) => void,
    errors: Record<string, string>,
    disabled: boolean
  ) => {
    const elements: JSX.Element[] = []
    let i = 0

    while (i < fields.length) {
      const field = fields[i]
      const nextField = fields[i + 1]
      const nextNextField = fields[i + 2]

      // Check for three-field groupings first
      const threeFieldGroup = getThreeFieldGroup(field, nextField, nextNextField)
      if (threeFieldGroup && nextField && nextNextField) {
        elements.push(
          <div key={`${field.field_key}-${nextField.field_key}-${nextNextField.field_key}`} className="form-row three-col-50-25-25">
            <div className="form-field">
              <FieldRenderer
                field={field}
                value={data[field.field_key]}
                onChange={(value) => onChange(field.field_key, value)}
                disabled={disabled}
                error={errors[field.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextField}
                value={data[nextField.field_key]}
                onChange={(value) => onChange(nextField.field_key, value)}
                disabled={disabled}
                error={errors[nextField.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextNextField}
                value={data[nextNextField.field_key]}
                onChange={(value) => onChange(nextNextField.field_key, value)}
                disabled={disabled}
                error={errors[nextNextField.field_key]}
              />
            </div>
          </div>
        )
        i += 3
        continue
      }

      // Check for two-field groupings
      const twoFieldGroup = getTwoFieldGroup(field, nextField)
      if (twoFieldGroup && nextField) {
        elements.push(
          <div key={`${field.field_key}-${nextField.field_key}`} className={`form-row ${twoFieldGroup.className}`}>
            <div className="form-field">
              <FieldRenderer
                field={field}
                value={data[field.field_key]}
                onChange={(value) => onChange(field.field_key, value)}
                disabled={disabled}
                error={errors[field.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextField}
                value={data[nextField.field_key]}
                onChange={(value) => onChange(nextField.field_key, value)}
                disabled={disabled}
                error={errors[nextField.field_key]}
              />
            </div>
          </div>
        )
        i += 2
        continue
      }

      // Single field
      elements.push(
        <FieldRenderer
          key={field.field_key}
          field={field}
          value={data[field.field_key]}
          onChange={(value) => onChange(field.field_key, value)}
          disabled={disabled}
          error={errors[field.field_key]}
        />
      )
      i += 1
    }

    return elements
  }

  // Helper to determine three-field groupings
  const getThreeFieldGroup = (field1: SportFieldDefinition, field2: SportFieldDefinition, field3: SportFieldDefinition): { className: string } | null => {
    if (!field2 || !field3) return null

    // City, state, zip pattern
    if (field1.field_key === 'city' && field2.field_key === 'state' && field3.field_key === 'zip_code') {
      return { className: 'three-col-50-25-25' }
    }

    // Years of experience, wingspan, vertical jump (equal thirds)
    if (field1.field_key === 'years_experience' && field2.field_key === 'wingspan_in' && field3.field_key === 'vertical_jump_in') {
      return { className: 'three-col-33' }
    }
    return null
  }

  // Helper to determine two-field groupings
  const getTwoFieldGroup = (field1: SportFieldDefinition, field2: SportFieldDefinition): { className: string } | null => {
    if (!field2) return null

    // Phone and extension
    if (field1.field_key === 'phone' && field2.field_key === 'extension') {
      return { className: 'two-col-75-25' }
    }

    // Height feet and inches
    if (field1.field_key === 'height_feet' && field2.field_key === 'height_inches') {
      return { className: 'two-col-equal' }
    }

    // Shoe size and width
    if (field1.field_key === 'shoe_size' && field2.field_key === 'shoe_width') {
      return { className: 'two-col-60-40' }
    }

    // Jersey and shorts size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Primary and secondary position
    if (field1.field_key === 'primary_position' && field2.field_key === 'secondary_position') {
      return { className: 'two-col-equal' }
    }

    // First and last name (if they appear in sport profiles)
    if (field1.field_key === 'first_name' && field2.field_key === 'last_name') {
      return { className: 'two-col-equal' }
    }

    return null
  }

  // Loading state
  if (fieldsLoading || profileLoading) {
    return (
      <Card className="p-6">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading sport profile...</p>
      </Card>
    )
  }

  // Error state
  if (fieldsError) {
    return (
      <Card className="p-6">
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{fieldsError.message}</span>
        </div>
      </Card>
    )
  }

  // No fields state
  if (profileFields.length === 0 && equipmentFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="empty-icon">sports</div>
        <p className="empty-text">No profile fields configured for this sport</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <CardTitle className="mb-2">
          {sportCode.replace('_', ' ')} Profile
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sport-specific details and equipment information
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-sm mr-2">person</span>
          Profile
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
            activeTab === 'equipment'
              ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-sm mr-2">inventory_2</span>
          Equipment
        </button>
      </div>

      {/* Error banner */}
      {profileError && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{profileError.message}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="form-fields">
          {profileFields.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">person</span>
              <p className="text-slate-500 dark:text-slate-400">No profile fields configured</p>
            </div>
          ) : (
            renderFieldsWithLayout(profileFields, profileData, handleProfileFieldChange, profileErrors, updating)
          )}
        </div>
      )}

      {activeTab === 'equipment' && (
        <>
          {/* Info callout */}
          <div className="form-info-banner mb-6">
            <span className="material-symbols-outlined">info</span>
            <span>
              Accurate equipment information helps coaches prepare for the season and ensures proper fit.
            </span>
          </div>

          <div className="form-fields">
            {equipmentFields.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">inventory_2</span>
                <p className="text-slate-500 dark:text-slate-400">No equipment fields configured</p>
              </div>
            ) : (
              renderFieldsWithLayout(equipmentFields, equipmentData, handleEquipmentFieldChange, equipmentErrors, updating)
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={updating}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={updating || !hasChanges}>
          {updating ? (
            <>
              <span className="btn-spinner"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              <span>Save</span>
            </>
          )}
        </Button>
      </div>

      {/* Unsaved changes warning */}
      {hasChanges && !updating && (
        <div className="form-unsaved-warning">
          <span className="material-symbols-outlined">info</span>
          <span>You have unsaved changes</span>
        </div>
      )}
    </Card>
  )
}