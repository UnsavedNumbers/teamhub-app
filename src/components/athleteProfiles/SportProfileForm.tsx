/**
 * SportProfileForm Component
 * 
 * Dynamic form for sport-specific athlete profile data.
 * Renders fields based on sport field definitions.
 * 
 * Design: Clean, organized sections with generous spacing.
 * Premium feel with subtle interactions and clear hierarchy.
 */

import { useState, useEffect, useCallback } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../hooks/useAthleteSportProfile'
import type { SportCode } from '../../types/sports'

interface SportProfileFormProps {
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
 * SportProfileForm - Dynamic form for sport-specific profile data
 */
export function SportProfileForm({
  athleteId,
  sportCode,
  onSave,
  onCancel,
}: SportProfileFormProps) {
  // Fetch field definitions
  const { profileFields, loading: fieldsLoading, error: fieldsError } = 
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
      setFormData(profile.profile_data || {})
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

    profileFields.forEach((field) => {
      const value = formData[field.field_key]
      const isRequired = !field.is_optional

      if (isRequired && (value === null || value === undefined || value === '')) {
        newErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [profileFields, formData])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    const success = await updateProfile(formData, profile?.equipment_data || {})

    if (success) {
      setHasChanges(false)
      onSave?.()
    }
  }, [validateForm, updateProfile, formData, profile, onSave])

  // Loading state
  if (fieldsLoading || profileLoading) {
    return (
      <div className="profile-form-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading profile fields...</p>
      </div>
    )
  }

  // Error state
  if (fieldsError) {
    return (
      <div className="profile-form-error">
        <span className="material-symbols-outlined error-icon">error</span>
        <p className="error-text">Failed to load profile fields</p>
        <p className="error-detail">{fieldsError.message}</p>
      </div>
    )
  }

  // No fields state
  if (profileFields.length === 0) {
    return (
      <div className="profile-form-empty">
        <span className="material-symbols-outlined empty-icon">sports</span>
        <p className="empty-text">No profile fields configured for this sport</p>
      </div>
    )
  }

  return (
    <div className="sport-profile-form">
      {/* Header */}
      <div className="form-header">
        <div className="form-header-content">
          <h2 className="form-title">Profile Information</h2>
          <p className="form-subtitle">
            Sport-specific details for {sportCode.replace('_', ' ')}
          </p>
        </div>
        {profile?.last_verified_at && (
          <div className="form-verified-badge">
            <span className="material-symbols-outlined verified-icon">verified</span>
            <span className="verified-text">
              Verified {new Date(profile.last_verified_at).toLocaleDateString()}
            </span>
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

      {/* Fields */}
      <div className="form-fields">
        {profileFields.map((field) => (
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
              <span>Save Profile</span>
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
