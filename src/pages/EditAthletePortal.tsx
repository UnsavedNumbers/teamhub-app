/**
 * EditAthletePortal Component
 *
 * Portal version of athlete editing for parents/guardians.
 * Allows updating athlete information and sports preferences.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import { PortalDatePicker } from '../components/portal/DatePicker'
import { useUserContext } from '../hooks/useUserContext'
import { getAthleteById, updateAthlete } from '../data/services/familyService'
import { updateAthleteSports } from '../data/services/athleteSportsService'
import { getSystemSports } from '../data/services/sportsService'
import { AthletePhotoUpload } from '../components/admin/AthletePhotoUpload'
import { uploadAthletePhoto, deleteAthletePhoto, getAthletePhotoUrl } from '../data/services/athletePhotoService'
import type { Gender, UpdateAthleteDTO } from '../types/family'
import type { Sport } from '../data/types/organization'

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
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{sport.name}</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPlaysSelected}
                        onChange={() => onToggle(sport.id, 'plays')}
                        className="w-4 h-4 text-[var(--org-link-color)] border-slate-300 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Plays</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isInterestedSelected}
                        onChange={() => onToggle(sport.id, 'interested')}
                        className="w-4 h-4 text-[var(--org-link-color)] border-slate-300 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Interested</span>
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
    medical_notes: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
}

export default function EditAthletePortal() {
    const navigate = useNavigate()
    const { id: athleteId } = useParams<{ id: string }>()
    const { context, isReady } = useUserContext()
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
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
    const contextRef = useRef(context)

    // Update context ref when context changes
    useEffect(() => {
        contextRef.current = context
    }, [context])

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
        console.log('[EditAthletePortal] Effect triggered:', { isReady, athleteId })
        if (!isReady || !athleteId) {
            console.log('[EditAthletePortal] Not ready or no athleteId, skipping')
            return
        }

        // Reset all form state
        setFormData(initialFormData)
        setSelectedSports([])
        setValidationErrors([])
        setError(null)
        setNotFound(false)
        setLoading(true)

        const currentRequestId = ++requestIdRef.current
        console.log('[EditAthletePortal] Starting athlete fetch, requestId:', currentRequestId, 'athleteId:', athleteId)

        // Load athlete data (use contextRef to avoid stale closure)
        getAthleteById(contextRef.current, athleteId)
            .then(({ data, error: fetchError }) => {
                console.log('[EditAthletePortal] Received athlete data:', { data, error: fetchError })
                // Only update if this is the latest request and component is mounted
                if (currentRequestId !== requestIdRef.current || !isMountedRef.current) {
                    console.log('[EditAthletePortal] Request stale or unmounted, skipping update')
                    return
                }

                if (fetchError) {
                    console.error('[EditAthletePortal] Fetch error:', fetchError)
                    setError(fetchError.message)
                    setLoading(false)
                    return
                }

                if (!data) {
                    console.log('[EditAthletePortal] No data found, athlete not found')
                    setNotFound(true)
                    setLoading(false)
                    // Auto-redirect after 3 seconds
                    redirectTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            navigate('/portal/athletes')
                        }
                    }, 3000)
                    return
                }

                console.log('[EditAthletePortal] Populating form with athlete data:', data)

                // Pre-populate form with athlete data
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    date_of_birth: data.date_of_birth || '',
                    gender: data.gender || '',
                    preferred_name: data.preferred_name || '',
                    medical_notes: data.medical_notes || '',
                    allergies: data.allergies || '',
                    emergency_contact_name: data.emergency_contact_name || '',
                    emergency_contact_phone: data.emergency_contact_phone || '',
                })

                // Load photo if exists
                if (data.photo_url) {
                    console.log('[EditAthletePortal] Loading photo URL:', data.photo_url)
                    setPhotoPath(data.photo_url)
                    // Generate signed URL for display
                    getAthletePhotoUrl(data.photo_url).then(({ url, error }) => {
                        if (url && !error) {
                            console.log('[EditAthletePortal] Photo URL loaded successfully')
                            setPhotoUrl(url)
                        } else {
                            console.error('[EditAthletePortal] Error loading photo URL:', error)
                        }
                    })
                } else {
                    console.log('[EditAthletePortal] No photo URL')
                    setPhotoPath(null)
                    setPhotoUrl(null)
                }

                // Pre-populate sports
                if (data.sports && data.sports.length > 0) {
                    console.log('[EditAthletePortal] Pre-populating sports:', data.sports)
                    setSelectedSports(data.sports.map(s => ({
                        sport_id: s.sport_id,
                        sport_type: s.sport_type
                    })))
                }

                console.log('[EditAthletePortal] Setting loading to false')
                setLoading(false)
            })
            .catch((err) => {
                console.error('[EditAthletePortal] Exception:', err)
                if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                    console.error('Error loading athlete:', err)
                    setError(err instanceof Error ? err.message : 'Failed to load athlete')
                    setLoading(false)
                }
            })
    }, [isReady, athleteId, navigate])

    // Debug: Log state changes
    useEffect(() => {
        console.log('[EditAthletePortal] State update:', { 
            loading, 
            error, 
            notFound, 
            hasFormData: !!formData.first_name,
            sportsCount: selectedSports.length 
        })
    }, [loading, error, notFound, formData, selectedSports])

    // Load system sports on mount
    useEffect(() => {
        console.log('[EditAthletePortal] Sports loading effect:', { isReady, isLoadingSportsRef: isLoadingSportsRef.current })
        if (!isReady || isLoadingSportsRef.current) return

        isLoadingSportsRef.current = true
        setIsLoadingSports(true)
        console.log('[EditAthletePortal] Loading system sports...')

        getSystemSports()
            .then(({ data, error }) => {
                console.log('[EditAthletePortal] Sports loaded:', { data: data?.length, error })
                if (error) {
                    console.error('[EditAthletePortal] Error loading sports:', error)
                    return
                }
                if (isMountedRef.current && data) {
                    console.log('[EditAthletePortal] Setting sports:', data.length)
                    setSports(data)
                }
            })
            .finally(() => {
                if (isMountedRef.current) {
                    console.log('[EditAthletePortal] Sports loading complete')
                    setIsLoadingSports(false)
                    isLoadingSportsRef.current = false
                }
            })
    }, [isReady])

    // Memoized toggle handler for sports (functional update to prevent stale closures)
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

        if (errors.length > 0) {
            setValidationErrors(errors)
            return
        }

        if (!athleteId || !context.orgId) {
            setError('Missing required information. Please refresh and try again.')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setValidationErrors([])

        try {
            // Normalize form data before submission
            const normalizedData: UpdateAthleteDTO = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                date_of_birth: formData.date_of_birth || undefined,
                gender: formData.gender || null,
                preferred_name: formData.preferred_name.trim() || null,
                medical_notes: formData.medical_notes.trim() || null,
                allergies: formData.allergies.trim() || null,
                emergency_contact_name: formData.emergency_contact_name.trim() || null,
                emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
            }

            // Handle photo changes
            let newPhotoPath: string | null = photoPath

            // If photo was removed
            if (photoRemoved && photoPath) {
                // Delete from storage
                await deleteAthletePhoto(context, athleteId)
                newPhotoPath = null
            }
            // If new photo was selected
            else if (photoFile) {
                // Upload new photo
                const { path: uploadedPath, error: uploadError } = await uploadAthletePhoto(
                    context,
                    athleteId,
                    photoFile
                )

                if (uploadError) {
                    // Log error but don't fail athlete update
                    console.error('Error uploading photo:', uploadError)
                    setPhotoError(uploadError.message)
                    // Continue with athlete update - photo can be fixed later
                } else if (uploadedPath) {
                    newPhotoPath = uploadedPath
                    setPhotoError(null)
                }
            }

            // Update athlete data (including photo_url if changed)
            const updateData: UpdateAthleteDTO = {
                ...normalizedData,
                photo_url: newPhotoPath
            }

            // Sequential updates: athlete first, then sports
            const { error: athleteError } = await updateAthlete(context, athleteId, updateData)
            if (athleteError) throw athleteError

            // Then update sports
            const { error: sportsError } = await updateAthleteSports(athleteId, context.orgId, selectedSports)
            if (sportsError) throw sportsError

            // Success - navigate back to athletes list
            navigate('/portal/athletes')
        } catch (err) {
            console.error('Error updating athlete:', err)
            setError(err instanceof Error ? err.message : 'Failed to update athlete')
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (!isReady || loading) {
        return (
            <PortalLayout
                breadcrumbs={[
                    { label: 'Home', path: '/portal/dashboard' },
                    { label: 'My Athletes', path: '/portal/athletes' },
                    { label: 'Edit Athlete' }
                ]}
            >
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                </div>
            </PortalLayout>
        )
    }

    // Not found or access denied
    if (notFound) {
        return (
            <PortalLayout
                breadcrumbs={[
                    { label: 'Home', path: '/portal/dashboard' },
                    { label: 'My Athletes', path: '/portal/athletes' },
                    { label: 'Edit Athlete' }
                ]}
            >
                <Card className="p-6 mt-6">
                    <div className="text-center py-12">
                        <p className="text-red-600 dark:text-red-400 font-bold mb-4">
                            Athlete not found or you don't have access.
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Redirecting to My Athletes...
                        </p>
                        <Button variant="primary" onClick={() => navigate('/portal/athletes')}>
                            Back to My Athletes
                        </Button>
                    </div>
                </Card>
            </PortalLayout>
        )
    }

    const isFormValid = formData.first_name.trim() && formData.last_name.trim() && formData.date_of_birth

    return (
        <PortalLayout
            breadcrumbs={[
                { label: 'Home', path: '/portal/dashboard' },
                { label: 'My Athletes', path: '/portal/athletes' },
                { label: 'Edit Athlete' }
            ]}
        >
            <div className="mb-12">
                <PageTitle>Edit Athlete</PageTitle>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
                    Update athlete information and preferences.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Error Messages */}
                {error && (
                    <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
                        <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
                    </Card>
                )}

                {validationErrors.length > 0 && (
                    <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
                        <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-2">
                            Please fix the following errors:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((err, idx) => (
                                <li key={idx} className="text-red-600 dark:text-red-400 text-sm">
                                    {err}
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

                {/* Profile Photo */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Profile Photo</h2>
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

                {/* Basic Information */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
                        Basic Information
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                First Name *
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="First name"
                                required
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
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="Last name"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <PortalDatePicker
                            label="Date of Birth"
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
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
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
                            Preferred Name / Goes By
                        </label>
                        <input
                            type="text"
                            value={formData.preferred_name}
                            onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="e.g. Mike, Johnny, etc."
                        />
                    </div>
                </Card>

                {/* Medical & Emergency */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
                        Medical & Emergency
                    </h2>

                    <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Medical Notes
                        </label>
                        <textarea
                            value={formData.medical_notes}
                            onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Any medical conditions coaches should know about"
                            rows={3}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Allergies
                        </label>
                        <input
                            type="text"
                            value={formData.allergies}
                            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="List any allergies"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                Emergency Contact Name
                            </label>
                            <input
                                type="text"
                                value={formData.emergency_contact_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, emergency_contact_name: e.target.value })
                                }
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="Contact name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                Emergency Contact Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.emergency_contact_phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, emergency_contact_phone: e.target.value })
                                }
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </div>
                </Card>

                {/* Sports Interests */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sports Interests</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Select sports this athlete plays or is interested in playing. This is optional.
                    </p>

                    {isLoadingSports ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                        </div>
                    ) : sports.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No sports available.</p>
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
                <div className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/portal/athletes')}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting || !isFormValid}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </PortalLayout>
    )
}
