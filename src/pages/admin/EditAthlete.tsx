/**
 * EditAthlete Component
 *
 * Admin version of athlete editing for org admins and coaches.
 * Allows updating athlete information, sports preferences, and profile photo.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminPageHeader, Card, Input, Button, Select, DatePicker, ErrorState } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getAthleteById, updateAthlete } from '../../data/services/familyService'
import { updateAthleteSports } from '../../data/services/athleteSportsService'
import { getSystemSports } from '../../data/services/sportsService'
import { AthletePhotoUpload } from '../../components/admin/AthletePhotoUpload'
import { uploadAthletePhoto, deleteAthletePhoto, getAthletePhotoUrl } from '../../data/services/athletePhotoService'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import { validateGuardianEmail } from '../../data/services/guardianService'
import type { Gender, UpdateAthleteDTO } from '../../types/family'
import type { Sport } from '../../data/types/organization'
import { AlertCircle } from 'lucide-react'
import { getLink } from '../../utils/routes'

type SportType = 'plays' | 'interested'

// Memoized Sport Item Component
const SportItem = memo(({ 
    sport, 
    selectedSports, 
    onToggle 
}: { 
    sport: Sport
    selectedSports: Array<{ sport_id: string; sport_type: SportType }>
    onToggle: (sportId: string, sportType: SportType) => void
}) => {
    const isPlaysSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'plays')
    const isInterestedSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'interested')

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{sport.name}</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPlaysSelected}
                        onChange={() => onToggle(sport.id, 'plays')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Plays</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isInterestedSelected}
                        onChange={() => onToggle(sport.id, 'interested')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Interested</span>
                </label>
            </div>
        </div>
    )
})

SportItem.displayName = 'SportItem'

const initialFormData = {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '' as Gender | '',
    preferred_name: '',
    jersey_number: '',
    medical_notes: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    phone: '',  // Athlete phone number
    email: ''   // Athlete email address
}

export default function EditAthlete() {
    const navigate = useNavigate()
    const { id: athleteId } = useParams<{ id: string }>()
    const { context, isReady } = useUserContext()
    const t = useT()
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [notFound, setNotFound] = useState(false)

    // Form state
    const [formData, setFormData] = useState(initialFormData)

    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [photoPath, setPhotoPath] = useState<string | null>(null)
    const [photoError, setPhotoError] = useState<string | null>(null)
    const [photoRemoved, setPhotoRemoved] = useState(false)

    // Sports state
    const [sports, setSports] = useState<Sport[]>([])
    const [isLoadingSports, setIsLoadingSports] = useState(false)
    const [selectedSports, setSelectedSports] = useState<Array<{ sport_id: string; sport_type: SportType }>>([])

    // Refs for race condition and memory leak prevention
    const requestIdRef = useRef(0)
    const isMountedRef = useRef(true)
    const isLoadingSportsRef = useRef(false)
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }
        }
    }, [])

    // Reset form state and load athlete data when athleteId changes
    useEffect(() => {
        if (!isReady || !athleteId || !context.orgId) return

        // Reset all form state
        setFormData(initialFormData)
        setSelectedSports([])
        setValidationErrors([])
        setError(null)
        setNotFound(false)
        setLoading(true)
        setPhotoFile(null)
        setPhotoUrl(null)
        setPhotoPath(null)
        setPhotoError(null)
        setPhotoRemoved(false)

        const currentRequestId = ++requestIdRef.current

        // Load athlete data
        getAthleteById(context, athleteId)
            .then(({ data, error: fetchError }) => {
                // Only update if this is the latest request and component is mounted
                if (currentRequestId !== requestIdRef.current || !isMountedRef.current) return

                if (fetchError) {
                    setError(fetchError)
                    setLoading(false)
                    return
                }

                if (!data) {
                    setNotFound(true)
                    setLoading(false)
                    // Auto-redirect after 3 seconds
                    redirectTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            navigate(getLink('admin.athletes.list'))
                        }
                    }, 3000)
                    return
                }

                // Pre-populate form with athlete data - include all form fields including phone/email
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    date_of_birth: data.date_of_birth || '',
                    gender: data.gender || '',
                    preferred_name: data.preferred_name || '',
                    jersey_number: data.jersey_number || '',
                    medical_notes: data.medical_notes || '',
                    allergies: data.allergies || '',
                    emergency_contact_name: data.emergency_contact_name || '',
                    emergency_contact_phone: data.emergency_contact_phone || '',
                    phone: data.phone || '',  // NEW - explicit mapping
                    email: data.email || ''   // NEW - explicit mapping
                })

                // Load photo if exists (using new photo system)
                if (data.has_profile_photo && data.org_id && data.id) {
                    setPhotoPath('exists') // Flag that photo exists
                    // Get public URL (no signed URL needed)
                    const url = getAthletePhotoUrl(data.org_id, data.id, '512')
                    setPhotoUrl(url)
                } else {
                    setPhotoPath(null)
                    setPhotoUrl(null)
                }

                // Pre-populate sports
                if (data.sports && data.sports.length > 0) {
                    setSelectedSports(data.sports.map(s => ({
                        sport_id: s.sport_id,
                        sport_type: s.sport_type
                    })))
                }

                setLoading(false)
            })
            .catch((err) => {
                if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                    console.error('Error loading athlete:', err)
                    setError(err instanceof Error ? err : new Error('Failed to load athlete'))
                    setLoading(false)
                }
            })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [athleteId, isReady])

    // Load system sports on mount
    useEffect(() => {
        if (!isReady || isLoadingSportsRef.current) return

        isLoadingSportsRef.current = true
        setIsLoadingSports(true)

        getSystemSports()
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading sports:', error)
                    return
                }
                if (isMountedRef.current && data) {
                    setSports(data)
                }
            })
            .finally(() => {
                if (isMountedRef.current) {
                    setIsLoadingSports(false)
                    isLoadingSportsRef.current = false
                }
            })
    }, [isReady])

    // Memoized toggle handler for sports
    const handleSportToggle = useCallback((sportId: string, sportType: SportType) => {
        setSelectedSports(prev => {
            const exists = prev.some(s => s.sport_id === sportId && s.sport_type === sportType)
            if (exists) {
                return prev.filter(s => !(s.sport_id === sportId && s.sport_type === sportType))
            } else {
                return [...prev, { sport_id: sportId, sport_type: sportType }]
            }
        })
    }, [])

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

        // Date of birth validation
        if (formData.date_of_birth) {
            const dob = new Date(formData.date_of_birth)
            const today = new Date()
            const age = today.getFullYear() - dob.getFullYear()

            if (dob > today) {
                errors.push('Date of birth must be in the past.')
            } else if (age > 120) {
                errors.push('Date of birth must be reasonable (not more than 120 years ago).')
            }
        }

        // Phone validation - only if provided
        if (formData.phone.trim()) {
            const phoneValidation = validatePhoneFormat(formData.phone.trim())
            if (!phoneValidation.valid) {
                errors.push(phoneValidation.error || 'Invalid phone number')
            }
        }

        // Email validation - only if provided
        if (formData.email.trim()) {
            if (!validateGuardianEmail(formData.email.trim())) {
                errors.push('Invalid email address')
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors)
            return
        }

        if (!athleteId || !context.orgId) {
            setError(new Error('Missing required information. Please refresh and try again.'))
            return
        }

        setIsSubmitting(true)
        setError(null)
        setValidationErrors([])

        try {
            // Handle photo upload/removal
            // If photo was removed
            if (photoRemoved && photoPath) {
                // Delete from storage
                const { error: deleteError } = await deleteAthletePhoto(context, athleteId)
                if (deleteError) {
                    console.error('Error deleting photo:', deleteError)
                    setPhotoError(deleteError.message)
                    // Continue with update - photo deletion can be retried
                }
            }
            // If new photo was selected
            else if (photoFile) {
                // Upload new photo (includes resizing and DB update)
                const { error: uploadError } = await uploadAthletePhoto(
                    context,
                    athleteId,
                    photoFile
                )

                if (uploadError) {
                    // Log error but don't fail athlete update
                    console.error('Error uploading photo:', uploadError)
                    setPhotoError(uploadError.message)
                    // Continue with athlete update - photo can be fixed later
                } else {
                    setPhotoError(null)
                }
            }

            // Normalize form data before submission - include all updatable fields including phone/email
            // Note: photo_url is no longer stored - derived from storage
            const normalizedData: UpdateAthleteDTO = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                date_of_birth: formData.date_of_birth || undefined,
                gender: formData.gender || null,
                preferred_name: formData.preferred_name.trim() || null,
                jersey_number: formData.jersey_number.trim() || null,
                medical_notes: formData.medical_notes.trim() || null,
                allergies: formData.allergies.trim() || null,
                emergency_contact_name: formData.emergency_contact_name.trim() || null,
                emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
                phone: formData.phone.trim() || null,  // NEW - explicit
                email: formData.email.trim() || null   // NEW - explicit
            }

            // Sequential updates: athlete first, then sports
            const { error: athleteError } = await updateAthlete(context, athleteId, normalizedData)
            if (athleteError) {
                // Check for constraint violation (database-level validation)
                if ((athleteError as any).code === '23514') { // CHECK constraint violation
                    const errorMessage = (athleteError as any).message || ''
                    if (errorMessage.includes('email')) {
                        setValidationErrors(['Invalid email format'])
                    } else if (errorMessage.includes('phone')) {
                        setValidationErrors(['Invalid phone number format'])
                    } else {
                        throw athleteError
                    }
                    setIsSubmitting(false)
                    return
                }
                throw athleteError
            }

            // Then update sports
            const { error: sportsError } = await updateAthleteSports(athleteId, context.orgId, selectedSports)
            if (sportsError) throw sportsError

            // Success - navigate back to athletes list
            navigate('/admin/athletes')
        } catch (err) {
            console.error('Error updating athlete:', err)
            setError(err instanceof Error ? err : new Error('Failed to update athlete'))
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (!isReady || loading) {
        return <AdminLoadingSpinner />
    }

    // Not found or access denied
    if (notFound) {
        return (
            <div className="pa-root">
                <AdminPageHeader
                    title="Athlete Not Found"
                    subtitle="The athlete you're looking for doesn't exist or you don't have access."
                    breadcrumbs={[
                        { label: 'Organizations', path: getLink('admin.organization.structure') },
                        { label: 'Athletes', path: getLink('admin.athletes.list') },
                        { label: 'Edit Athlete', path: '#' }
                    ]}
                />
                <div className="pa-form-container">
                    <Card>
                        <div className="text-center py-12">
                            <p className="text-red-600 dark:text-red-400 font-bold mb-4">
                                Athlete not found or you don't have access.
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Redirecting to Athletes...
                            </p>
                            <Button variant="primary" onClick={() => navigate('/admin/athletes')}>
                                Back to Athletes
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="pa-root">
            <AdminPageHeader
                title="Edit Athlete"
                subtitle={t('admin.athletes.editSubtitle')}
                breadcrumbs={[
                    { label: 'Organizations', path: getLink('admin.organization.structure') },
                    { label: 'Athletes', path: getLink('admin.athletes.list') },
                    { label: 'Edit Athlete', path: '#' }
                ]}
            />

            <div className="pa-form-container">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <ErrorState
                            title="Update Failed"
                            message={error.message}
                            onRetry={() => setError(null)}
                        />
                    )}

                    {validationErrors.length > 0 && (
                        <Card className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                                            Please fix the following errors:
                                        </h3>
                                        <ul className="list-disc list-inside space-y-1">
                                            {validationErrors.map((err, idx) => (
                                                <li key={idx} className="text-sm text-red-700">
                                                    {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Profile Photo */}
                    <Card className="mb-6">
                        <h2 className="pa-h2 pa-mb-6">Profile Photo</h2>
                        <AthletePhotoUpload
                            photoFile={photoFile}
                            photoUrl={photoUrl}
                            onPhotoSelect={(file) => {
                                setPhotoFile(file)
                                setPhotoRemoved(false)
                                setPhotoError(null)
                            }}
                            onPhotoRemove={() => {
                                setPhotoFile(null)
                                setPhotoUrl(null)
                                setPhotoRemoved(true)
                                setPhotoError(null)
                            }}
                            disabled={isSubmitting}
                            error={photoError}
                        />
                    </Card>

                    {/* Athlete Information */}
                    <Card>
                        <h2 className="pa-h2 pa-mb-6">Athlete Information</h2>

                        <div className="pa-form-grid pa-form-grid-2 pa-gap-4 pa-mb-4">
                            <Input
                                label="First Name"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                            <Input
                                label="Last Name"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="pa-form-grid pa-form-grid-2 pa-gap-4 pa-mb-4">
                            <DatePicker
                                label="Date of Birth"
                                value={formData.date_of_birth}
                                onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
                                required
                            />
                            <Select
                                label="Gender"
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                                options={[
                                    { value: '', label: 'Select...' },
                                    { value: 'male', label: 'Male' },
                                    { value: 'female', label: 'Female' },
                                    { value: 'other', label: 'Other/Prefer not to say' }
                                ]}
                            />
                        </div>

                        <div className="pa-mb-6">
                            <Input
                                label="Preferred Name / Goes By (Optional)"
                                value={formData.preferred_name}
                                onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                                placeholder="e.g. Mike, Johnny, etc."
                            />
                        </div>

                        <div className="pa-mb-6">
                            <Input
                                label="Jersey Number (Optional)"
                                value={formData.jersey_number}
                                onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                                placeholder="e.g. 23"
                            />
                        </div>

                        <div className="pa-form-grid pa-form-grid-2 pa-gap-4 pa-mb-6">
                            <Input
                                label="Phone Number (Optional)"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(555) 123-4567"
                            />
                            <Input
                                label="Email Address (Optional)"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="athlete@example.com"
                            />
                        </div>

                        <h3 className="pa-h3 pa-mt-8 pa-mb-4">Medical & Emergency</h3>

                        <div className="pa-mb-4">
                            <Input
                                label="Medical Notes (Optional)"
                                value={formData.medical_notes}
                                onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                                placeholder="Any medical conditions coaches should know about"
                                multiple
                            />
                        </div>

                        <div className="pa-mb-4">
                            <Input
                                label="Allergies (Optional)"
                                value={formData.allergies}
                                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                placeholder="List any allergies"
                            />
                        </div>

                        <div className="pa-form-grid pa-form-grid-2 pa-gap-4">
                            <Input
                                label="Emergency Contact Name (Optional)"
                                value={formData.emergency_contact_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, emergency_contact_name: e.target.value })
                                }
                                placeholder="Contact name"
                            />
                            <Input
                                label="Emergency Contact Phone (Optional)"
                                value={formData.emergency_contact_phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, emergency_contact_phone: e.target.value })
                                }
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </Card>

                    {/* Sports Interests */}
                    <Card className="mt-6">
                        <h2 className="pa-h2 pa-mb-2">Sports Interests</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Select sports this athlete plays or is interested in playing. This is optional.
                        </p>

                        {isLoadingSports ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
                            </div>
                        ) : sports.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No sports available.</p>
                        ) : (
                            <div className="space-y-3">
                                {sports.map((sport) => (
                                    <SportItem
                                        key={sport.id}
                                        sport={sport}
                                        selectedSports={selectedSports}
                                        onToggle={handleSportToggle}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Submit Buttons */}
                    <div className="pa-form-actions mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate(getLink('admin.athletes.list'))}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="pa-form-submit-btn w-full sm:w-auto">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
