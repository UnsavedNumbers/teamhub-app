/**
 * MedicalInfoForm Component
 * 
 * Form for athlete medical information (protected data).
 * Permission-aware with clear access control messaging.
 * 
 * Design: Sensitive data requires extra care - clear labels, privacy indicators.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAthleteMedical } from '../../hooks/useAthleteMedical'
import type { EmergencyContact } from '../../types/athleteSportProfiles'

interface MedicalInfoFormProps {
  /** Athlete ID */
  athleteId: string
  /** Athlete name for display */
  athleteName: string
  /** Callback after successful save */
  onSave?: () => void
  /** Callback on cancel */
  onCancel?: () => void
}

/**
 * MedicalInfoForm - Permission-aware medical data form
 */
export function MedicalInfoForm({
  athleteId,
  athleteName,
  onSave,
  onCancel,
}: MedicalInfoFormProps) {
  const { medical, loading, updating, hasPermission, updateMedical, error } = 
    useAthleteMedical(athleteId)

  // Form state
  const [medicalNotes, setMedicalNotes] = useState<string>('')
  const [allergies, setAllergies] = useState<string>('')
  const [emergencyName, setEmergencyName] = useState<string>('')
  const [emergencyRelationship, setEmergencyRelationship] = useState<string>('')
  const [emergencyPhone, setEmergencyPhone] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data from medical record
  useEffect(() => {
    if (medical) {
      setMedicalNotes(medical.medical_notes || '')
      setAllergies(medical.allergies || '')
      setEmergencyName(medical.emergency_contact?.name || '')
      setEmergencyRelationship(medical.emergency_contact?.relationship || '')
      setEmergencyPhone(medical.emergency_contact?.phone || '')
    }
  }, [medical])

  // Mark as changed when any field changes
  useEffect(() => {
    setHasChanges(true)
  }, [medicalNotes, allergies, emergencyName, emergencyRelationship, emergencyPhone])

  // Handle save
  const handleSave = useCallback(async () => {
    const emergencyContact: EmergencyContact | null = 
      emergencyName && emergencyRelationship && emergencyPhone
        ? { name: emergencyName, relationship: emergencyRelationship, phone: emergencyPhone }
        : null

    const success = await updateMedical(
      medicalNotes || null,
      allergies || null,
      emergencyContact
    )

    if (success) {
      setHasChanges(false)
      onSave?.()
    }
  }, [updateMedical, medicalNotes, allergies, emergencyName, emergencyRelationship, emergencyPhone, onSave])

  // Loading state
  if (loading) {
    return (
      <div className="medical-form-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading medical information...</p>
      </div>
    )
  }

  // Permission denied state
  if (!hasPermission) {
    return (
      <div className="medical-form-permission-denied">
        <span className="material-symbols-outlined permission-icon">lock</span>
        <h3 className="permission-title">Access Restricted</h3>
        <p className="permission-text">
          You do not have permission to view or edit medical information for {athleteName}.
        </p>
        <p className="permission-detail">
          Medical data is only accessible to parents/guardians and authorized organization administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="medical-info-form">
      {/* Header */}
      <div className="form-header">
        <div className="form-header-content">
          <div className="form-title-row">
            <h2 className="form-title">Medical Information</h2>
            <div className="privacy-badge">
              <span className="material-symbols-outlined">lock</span>
              <span>Private</span>
            </div>
          </div>
          <p className="form-subtitle">
            Confidential health information for {athleteName}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{error.message}</span>
        </div>
      )}

      {/* Privacy notice */}
      <div className="form-privacy-notice">
        <span className="material-symbols-outlined">shield</span>
        <div className="privacy-notice-content">
          <p className="privacy-notice-title">Protected Health Information</p>
          <p className="privacy-notice-text">
            This information is kept confidential and only shared with authorized personnel.
            Access is controlled by organization settings and role permissions.
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="form-fields">
        {/* Medical Notes */}
        <div className="field-group">
          <label htmlFor="medical_notes" className="field-label">
            Medical Conditions & Notes
          </label>
          <textarea
            id="medical_notes"
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            disabled={updating}
            rows={4}
            className="field-textarea"
            placeholder="List any medical conditions, medications, or important health information coaches should know about..."
          />
          <p className="field-help">
            Include conditions like asthma, diabetes, seizures, or any medications taken regularly
          </p>
        </div>

        {/* Allergies */}
        <div className="field-group">
          <label htmlFor="allergies" className="field-label">
            Allergies
          </label>
          <textarea
            id="allergies"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            disabled={updating}
            rows={3}
            className="field-textarea"
            placeholder="List any known allergies (food, medication, environmental)..."
          />
          <p className="field-help">
            Include severity and typical reactions if known
          </p>
        </div>

        {/* Emergency Contact */}
        <div className="field-group-section">
          <h3 className="field-section-title">Emergency Contact</h3>
          <p className="field-section-subtitle">
            Primary contact to reach in case of medical emergency
          </p>

          <div className="field-group">
            <label htmlFor="emergency_name" className="field-label">
              Contact Name
              <span className="field-required">*</span>
            </label>
            <input
              id="emergency_name"
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              disabled={updating}
              className="field-input"
              placeholder="Full name"
            />
          </div>

          <div className="field-group">
            <label htmlFor="emergency_relationship" className="field-label">
              Relationship
              <span className="field-required">*</span>
            </label>
            <select
              id="emergency_relationship"
              value={emergencyRelationship}
              onChange={(e) => setEmergencyRelationship(e.target.value)}
              disabled={updating}
              className="field-select"
            >
              <option value="">Select relationship</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Guardian">Guardian</option>
              <option value="Grandparent">Grandparent</option>
              <option value="Aunt">Aunt</option>
              <option value="Uncle">Uncle</option>
              <option value="Sibling">Sibling</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="emergency_phone" className="field-label">
              Phone Number
              <span className="field-required">*</span>
            </label>
            <input
              id="emergency_phone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              disabled={updating}
              className="field-input"
              placeholder="(555) 123-4567"
            />
            <p className="field-help">
              Must be reachable during practices and games
            </p>
          </div>
        </div>
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
          disabled={updating || !hasChanges || !emergencyName || !emergencyRelationship || !emergencyPhone}
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
              <span>Save Medical Info</span>
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
