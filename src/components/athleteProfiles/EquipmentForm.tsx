/**
 * EquipmentForm Component
 * 
 * Dynamic form for sport-specific equipment data.
 * Renders fields based on sport field definitions.
 * 
 * Design: Clean, organized equipment tracking with visual clarity.
 */

import { useState, useEffect, useCallback } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../hooks/useAthleteSportProfile'
import type { SportCode } from '../../types/sports'

interface EquipmentFormProps {
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
 * EquipmentForm - Dynamic form for sport-specific equipment data
 */
export function EquipmentForm({
  athleteId,
  sportCode,
  onSave,
  onCancel,
}: EquipmentFormProps) {
  // Fetch field definitions
  const { equipmentFields, loading: fieldsLoading, error: fieldsError } = 
    useSportFieldDefinitions(sportCode)

  // Fetch/update profile
  const { profile, loading: profileLoading, updating, updateProfile, error: profileError } = 
    useAthleteSportProfile(athleteId, sportCode)

  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData(profile.equipment_data || {})
    }
  }, [profile])

  // Handle field change
  const handleFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
    setHasChanges(true)
    
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    equipmentFields.forEach((field) => {
      const value = formData[field.field_key]
      const isRequired = !field.is_optional

      if (isRequired && (value === null || value === undefined || value === '')) {
        newErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [equipmentFields, formData])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    const success = await updateProfile(profile?.profile_data || {}, formData)

    if (success) {
      setHasChanges(false)
      onSave?.()
    }
  }, [validateForm, updateProfile, formData, profile, onSave])

  // Loading state
  if (fieldsLoading || profileLoading) {
    return (
      <div className="equipment-form-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading equipment fields...</p>
      </div>
    )
  }

  // Error state
  if (fieldsError) {
    return (
      <div className="equipment-form-error">
        <span className="material-symbols-outlined error-icon">error</span>
        <p className="error-text">Failed to load equipment fields</p>
        <p className="error-detail">{fieldsError.message}</p>
      </div>
    )
  }

  // No fields state
  if (equipmentFields.length === 0) {
    return (
      <div className="equipment-form-empty">
        <span className="material-symbols-outlined empty-icon">inventory_2</span>
        <p className="empty-text">No equipment fields configured for this sport</p>
        <p className="empty-detail">
          Equipment tracking helps ensure athletes have the right gear for practices and games.
        </p>
      </div>
    )
  }

  return (
    <div className="equipment-form">
      {/* Header */}
      <div className="form-header">
        <div className="form-header-content">
          <h2 className="form-title">Equipment & Gear</h2>
          <p className="form-subtitle">
            Track sizes and equipment needs for {sportCode.replace('_', ' ')}
          </p>
        </div>
        {profile && profile.completeness_score > 0 && (
          <div className="form-completeness-badge">
            <div className="completeness-circle">
              <svg className="completeness-svg" viewBox="0 0 36 36">
                <path
                  className="completeness-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="completeness-fill"
                  strokeDasharray={`${profile.completeness_score}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="completeness-text">{profile.completeness_score}%</span>
            </div>
            <span className="completeness-label">Complete</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {profileError && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{profileError.message}</span>
        </div>
      )}

      {/* Info banner */}
      <div className="form-info-banner">
        <span className="material-symbols-outlined">info</span>
        <span>
          Accurate equipment information helps coaches prepare for the season and ensures proper fit.
        </span>
      </div>

      {/* Fields */}
      <div className="form-fields">
        {equipmentFields.map((field) => (
          <FieldRenderer
            key={field.field_key}
            field={field}
            value={formData[field.field_key]}
            onChange={(value) => handleFieldChange(field.field_key, value)}
            disabled={updating}
            error={errors[field.field_key]}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={updating || !hasChanges}
          className="btn-primary"
        >
          {updating ? (
            <>
              <span className="btn-spinner"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              <span>Save Equipment</span>
            </>
          )}
        </button>
      </div>

      {/* Unsaved changes warning */}
      {hasChanges && !updating && (
        <div className="form-unsaved-warning">
          <span className="material-symbols-outlined">info</span>
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  )
}
