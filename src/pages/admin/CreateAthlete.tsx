/**
 * CreateAthlete Component
 *
 * New athlete-centric creation flow:
 * 1. Athlete Information (name, DOB, etc.)
 * 2. Guardian Information (with email matching)
 * 3. Optional: Team Assignment
 *
 * Replaces the old family-first CreateChild flow.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, Card, Input, Button, Select, DatePicker, ErrorState } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { createAthleteWithGuardians } from '../../data/services/familyService'
import { GuardianList } from '../../components/admin/GuardianInput'
import { AthletePhotoUpload } from '../../components/admin/AthletePhotoUpload'
import { getSystemSports } from '../../data/services/sportsService'
import { uploadAthletePhoto } from '../../data/services/athletePhotoService'
import type { Gender, GuardianFormData, CreateAthleteDTO } from '../../types/family'
import type { Sport } from '../../data/types/organization'
import { createDefaultGuardians, validateGuardians, findDuplicateEmails } from '../../utils/guardianMatching'
import { validatePhoneFormat } from '../../utils/phoneValidation'
import { validateGuardianEmail } from '../../data/services/guardianService'
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

export default function CreateAthlete() {
    const navigate = useNavigate()
    const { context, isReady } = useUserContext()
    const t = useT()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    const [formData, setFormData] = useState({
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
    })

    const [guardians, setGuardians] = useState<GuardianFormData[]>(createDefaultGuardians())

    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoError, setPhotoError] = useState<string | null>(null)

    // Sports state
    const [sports, setSports] = useState<Sport[]>([])
    const [isLoadingSports, setIsLoadingSports] = useState(false)
    const [selectedSports, setSelectedSports] = useState<Array<{ sport_id: string; sport_type: SportType }>>([])
    const isLoadingSportsRef = useRef(false)
    const isMountedRef = useRef(true)

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

        return () => {
            isMountedRef.current = false
        }
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
        if (!isReady) return

        // Validate guardians
        const errors: string[] = []
        
        // Check for duplicate emails
        const duplicateIndexes = findDuplicateEmails(guardians)
        if (duplicateIndexes.length > 0) {
            errors.push('Duplicate guardian emails detected. Each guardian must have a unique email.')
        }

        // Validate guardian data
        const guardianValidation = validateGuardians(guardians)
        if (!guardianValidation.isValid) {
            Object.entries(guardianValidation.errors).forEach(([index, errs]) => {
                errs.forEach(err => {
                    errors.push(`Guardian ${parseInt(index) + 1}: ${err}`)
                })
            })
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

        setLoading(true)
        setError(null)
        setValidationErrors([])

        try {
            const dto: CreateAthleteDTO = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender || null,
                preferred_name: formData.preferred_name || null,
                jersey_number: formData.jersey_number || null,
                medical_notes: formData.medical_notes || null,
                allergies: formData.allergies || null,
                emergency_contact_name: formData.emergency_contact_name || null,
                emergency_contact_phone: formData.emergency_contact_phone || null,
                phone: formData.phone.trim() || null,  // Athlete phone number
                email: formData.email.trim() || null,   // Athlete email address
                guardians: guardians.filter(g => g.email.trim() !== ''), // Only include guardians with emails
                sports: selectedSports.length > 0 ? selectedSports : undefined
            }

            const { data, error: createError } = await createAthleteWithGuardians(context, dto)

            if (createError) {
                // Check for constraint violation (database-level validation)
                if ((createError as any).code === '23514') { // CHECK constraint violation
                    const errorMessage = (createError as any).message || ''
                    if (errorMessage.includes('email')) {
                        setValidationErrors(['Invalid email format'])
                    } else if (errorMessage.includes('phone')) {
                        setValidationErrors(['Invalid phone number format'])
                    } else {
                        throw createError
                    }
                    setLoading(false)
                    return
                }
                throw createError
            }

            // If athlete was created and photo was selected, upload photo
            if (data?.athlete_id && photoFile) {
                const { error: uploadError } = await uploadAthletePhoto(
                    context,
                    data.athlete_id,
                    photoFile
                )

                if (uploadError) {
                    // Log error but don't fail athlete creation
                    console.error('Error uploading photo:', uploadError)
                    setPhotoError(uploadError.message)
                    // Continue - athlete was created successfully, photo can be added later
                } else {
                    // Photo upload succeeded (includes DB update)
                    setPhotoError(null)
                }
            }

            // Success - navigate to athlete list
            navigate(getLink('admin.athletes.list'))
        } catch (err) {
            console.error('Error creating athlete:', err)
            setError(err instanceof Error ? err : new Error('Failed to create athlete'))
            setLoading(false)
        }
    }

    // If we are waiting for User/Org context, show platform-level spinner
    if (!isReady) return <AdminLoadingSpinner />

    const hasNoGuardians = guardians.filter(g => g.email.trim() !== '').length === 0

    return (
        <div className="pa-root">
            <AdminPageHeader
                title="Add Athlete"
                subtitle={t('admin.athletes.createSubtitle')}
                breadcrumbs={[
                    { label: 'Organizations', path: getLink('admin.organization.structure') },
                    { label: 'Athletes', path: getLink('admin.athletes.list') },
                    { label: 'Add Athlete', path: '#' }
                ]}
            />

            <div className="pa-form-container">
                    <form onSubmit={handleSubmit}>
                        {/* Profile Photo */}
                        <Card className="mb-6">
                            <h2 className="pa-h2 pa-mb-6">Profile Photo</h2>
                            <AthletePhotoUpload
                                photoFile={photoFile}
                                photoUrl={null}
                                onPhotoSelect={setPhotoFile}
                                onPhotoRemove={() => {
                                    setPhotoFile(null)
                                    setPhotoError(null)
                                }}
                                disabled={loading}
                                error={photoError}
                            />
                        </Card>

                        {/* Athlete Information */}
                        <Card>
                            <h2 className="pa-h2 pa-mb-6">Athlete Information</h2>

                            {error && (
                                <ErrorState
                                    title="Creation Failed"
                                    message={error.message}
                                    onRetry={() => setError(null)}
                                />
                            )}

                            {validationErrors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
                            )}

                            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
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

                            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
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

                            <div className="pa-grid pa-grid-2 pa-gap-4">
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

                        {/* Guardian Information */}
                        <Card className="mt-6">
                            <h2 className="pa-h2 pa-mb-2">Guardians</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Add parent or guardian email addresses. If they already have an account, they'll be
                                linked automatically. Otherwise, they'll receive an invitation to join.
                            </p>

                            {hasNoGuardians && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                                                No Guardians Added
                                            </h3>
                                            <p className="text-sm text-yellow-700">
                                                This athlete will have no guardians linked. They won't appear in parent
                                                dashboards until guardians are added. You can add guardians later if needed.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <GuardianList
                                guardians={guardians}
                                onChange={setGuardians}
                                orgId={context.orgId || ''}
                                minGuardians={0}
                            />
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
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="pa-form-submit-btn w-full sm:w-auto">
                                {loading ? 'Creating...' : 'Create Athlete'}
                            </Button>
                        </div>
                    </form>
            </div>
        </div>
    )
}
