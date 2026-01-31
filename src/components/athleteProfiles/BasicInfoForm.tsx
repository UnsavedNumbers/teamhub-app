import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { updateAthlete } from '../../data/services/familyService'
import { uploadAthletePhoto, deleteAthletePhoto } from '../../data/services/athletePhotoService'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import { validateGuardianEmail } from '../../data/services/guardianService'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import Button from '../portal/Button'
import { PortalDatePicker } from '../portal/DatePicker'
import { AthletePhotoUpload } from '../admin/AthletePhotoUpload'
import Card from '../portal/Card'
import type { Athlete, Gender, UpdateAthleteDTO } from '../../types/family'

interface BasicInfoFormProps {
  athlete: Athlete
  onSave: (updatedAthlete: Athlete) => void
}

export function BasicInfoForm({ athlete, onSave }: BasicInfoFormProps) {
  const { context } = useUserContext()
  const t = useT()
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null) // We don't have the URL here initially unless passed, but AthletePhotoUpload handles preview
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
        </Card>
      )}

      {validationErrors.length > 0 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="text-red-600 dark:text-red-400 text-sm">{err}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Photo Upload */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Photo</h3>
        <AthletePhotoUpload
          photoFile={photoFile}
          photoUrl={photoUrl || undefined} // We rely on parent for initial URL or let upload component handle it if we passed it? 
          // Actually Upgrade: simpler to let parent handle URL or just pass null and let user upload new one. 
          // For now, simple upload logic.
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[44px]"
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[44px]"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <PortalDatePicker
          label="Date of Birth *"
          value={formData.date_of_birth}
          onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
          required
        />
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white min-h-[44px]"
            disabled={isSubmitting}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other/Prefer not to say</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          Preferred Name
        </label>
        <input
          type="text"
          value={formData.preferred_name}
          onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[44px]"
          placeholder="e.g. Mike"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[44px]"
            placeholder="(555) 123-4567"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[44px]"
            placeholder="athlete@example.com"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
