import { useState } from 'react'
import { updateAthlete } from '../../data/services/familyService'
import { uploadAthletePhoto, deleteAthletePhoto } from '../../data/services/athletePhotoService'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import { validateGuardianEmail } from '../../data/services/guardianService'
import { useUserContext } from '../../hooks/useUserContext'
import Button from '../portal/Button'
import { PortalDatePicker } from '../portal/DatePicker'
import { AthletePhotoUpload } from '../admin/AthletePhotoUpload'
import type { Athlete, Gender, UpdateAthleteDTO } from '../../types/family'

interface BasicInfoFormProps {
  athlete: Athlete
  onSave: (updatedAthlete: Athlete) => void
}

export function BasicInfoForm({ athlete, onSave }: BasicInfoFormProps) {
  const { context } = useUserContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: athlete.first_name || '',
    last_name: athlete.last_name || '',
    date_of_birth: athlete.date_of_birth || '',
    gender: (athlete.gender || '') as Gender | '',
    preferred_name: athlete.preferred_name || '',
    phone: athlete.phone || '',
    email: athlete.email || ''
  })

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrl] = useState<string | null>(null) // We don't have the URL here initially unless passed, but AthletePhotoUpload handles preview
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const errors: string[] = []

    if (!formData.first_name.trim()) {
      errors.push('First name is required.')
    }
    if (!formData.last_name.trim()) {
      errors.push('Last name is required.')
    }
    if (!formData.date_of_birth) {
      errors.push('Date of birth is required.')
    }

    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth)
      const today = new Date()
      // Basic age validation
      if (dob > today) {
        errors.push('Date of birth must be in the past.')
      }
    }

    if (formData.phone.trim()) {
      const phoneValidation = validatePhoneFormat(formData.phone.trim())
      if (!phoneValidation.valid) {
        errors.push(phoneValidation.error || 'Invalid phone number')
      }
    }

    if (formData.email.trim()) {
      if (!validateGuardianEmail(formData.email.trim())) {
        errors.push('Invalid email address')
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsSubmitting(true)
    setError(null)
    setValidationErrors([])
    setPhotoError(null)

    try {
      // 1. Handle Photo Changes
      if (photoRemoved) {
        const { error: deleteError } = await deleteAthletePhoto(context, athlete.id)
        if (deleteError) throw deleteError
      } else if (photoFile) {
        const { error: uploadError } = await uploadAthletePhoto(context, athlete.id, photoFile)
        if (uploadError) throw uploadError
      }

      // 2. Update Athlete Data
      const updateData: UpdateAthleteDTO = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        preferred_name: formData.preferred_name.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null
      }

      const { data: updatedAthlete, error: updateError } = await updateAthlete(context, athlete.id, updateData)
      
      if (updateError) throw updateError
      
      if (updatedAthlete) {
        onSave(updatedAthlete)
      }
      
      // Reset photo state
      setPhotoFile(null)
      setPhotoRemoved(false)
      
    } catch (err) {
      console.error('Error updating basic info:', err)
      setError(err instanceof Error ? err.message : 'Failed to update information')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="portal-form">
      {error && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Photo Upload */}
      <div className="field-group">
        <h3 className="form-section-title">Profile Photo</h3>
        <AthletePhotoUpload
          photoFile={photoFile}
          photoUrl={photoUrl ?? null}
          onPhotoSelect={(file) => {
            setPhotoFile(file)
            setPhotoRemoved(false)
            setPhotoError(null)
          }}
          onPhotoRemove={() => {
            setPhotoFile(null)
            setPhotoRemoved(true)
            setPhotoError(null)
          }}
          disabled={isSubmitting}
          error={photoError}
        />
      </div>

      <div className="form-fields">
        <div className="form-row form-grid form-grid-two-col">
          <div className="field-group form-field">
            <label htmlFor="first_name" className="form-label">
              First Name <span className="field-required">*</span>
            </label>
            <input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="form-input"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="field-group form-field">
            <label htmlFor="last_name" className="form-label">
              Last Name <span className="field-required">*</span>
            </label>
            <input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="form-input"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="form-row form-grid form-grid-two-col">
          <div className="field-group form-field">
            <PortalDatePicker
              label="Date of Birth *"
              value={formData.date_of_birth}
              onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
              required
            />
          </div>
          <div className="field-group form-field">
            <label htmlFor="gender" className="form-label">Gender</label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
              className="form-select"
              disabled={isSubmitting}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other/Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="preferred_name" className="form-label">Preferred Name</label>
          <input
            id="preferred_name"
            type="text"
            value={formData.preferred_name}
            onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
            className="form-input"
            placeholder="e.g. Mike"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-row form-grid form-grid-two-col">
          <div className="field-group form-field">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input"
              placeholder="(555) 123-4567"
              disabled={isSubmitting}
            />
          </div>
          <div className="field-group form-field">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              placeholder="athlete@example.com"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
