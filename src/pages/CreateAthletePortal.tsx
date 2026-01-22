/**
 * CreateAthletePortal Component
 *
 * Portal version of athlete creation for parents/guardians.
 * Automatically links current user as guardian and allows adding one additional guardian.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import { useUserContext } from '../hooks/useUserContext'
import { createAthleteWithGuardians } from '../data/services/familyService'
import { checkGuardianMatch, normalizeEmail, validateGuardianEmail } from '../utils/guardianMatching'
import type { Gender, CreateAthleteDTO, GuardianMatch, RelationshipType } from '../types/family'

export default function CreateAthletePortal() {
    const navigate = useNavigate()
    const { context, isReady } = useUserContext()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    // Form state - single object for all fields
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '' as Gender | '',
        preferred_name: '',
        medical_notes: '',
        allergies: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        additionalGuardianEmail: '',
        additionalGuardianRelationship: 'parent' as RelationshipType
    })

    // Guardian matching state
    const [isCheckingGuardian, setIsCheckingGuardian] = useState(false)
    const [guardianMatch, setGuardianMatch] = useState<GuardianMatch | null>(null)
    const [emailTouched, setEmailTouched] = useState(false)

    // Refs for race condition and memory leak prevention
    const requestIdRef = useRef(0)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isMountedRef = useRef(true)
    const isCheckingRef = useRef(false)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    // Debounced guardian lookup
    const debouncedGuardianLookup = useCallback(
        (email: string) => {
            // Clear previous timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            // Skip if already checking (React Strict Mode double render prevention)
            if (isCheckingRef.current) return

            // Skip if email is empty or invalid
            if (!email || !validateGuardianEmail(email)) {
                setGuardianMatch(null)
                setIsCheckingGuardian(false)
                return
            }

            // Skip if not touched yet
            if (!emailTouched) return

            // Set checking state
            setIsCheckingGuardian(true)
            isCheckingRef.current = true

            // Debounce the lookup
            timeoutRef.current = setTimeout(async () => {
                const currentRequestId = ++requestIdRef.current

                try {
                    const match = await checkGuardianMatch(email, context.orgId || '')

                    // Only update state if this is the latest request and component is still mounted
                    if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                        setGuardianMatch(match)
                        setIsCheckingGuardian(false)
                        isCheckingRef.current = false
                    }
                } catch (err) {
                    console.error('Error checking guardian match:', err)
                    if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                        setGuardianMatch(null)
                        setIsCheckingGuardian(false)
                        isCheckingRef.current = false
                    }
                }
            }, 300)
        },
        [context.orgId, emailTouched]
    )

    // Trigger guardian lookup when email changes
    useEffect(() => {
        if (emailTouched) {
            debouncedGuardianLookup(formData.additionalGuardianEmail)
        }
    }, [formData.additionalGuardianEmail, emailTouched, debouncedGuardianLookup])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Early return check: if no email, show error
        if (!context.email) {
            setError('Unable to create athlete: Your account email is missing. Please contact support.')
            return
        }

        // Validate form
        const errors: string[] = []

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

        // Duplicate guardian email validation
        if (formData.additionalGuardianEmail.trim()) {
            const normalizedAdditional = normalizeEmail(formData.additionalGuardianEmail)
            const normalizedCurrent = normalizeEmail(context.email)

            if (normalizedAdditional === normalizedCurrent) {
                errors.push('You are already linked as a guardian. Please enter a different email address.')
            }

            // Validate email format
            if (!validateGuardianEmail(formData.additionalGuardianEmail)) {
                errors.push('Additional guardian email is invalid.')
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors)
            return
        }

        setIsSubmitting(true)
        setError(null)
        setValidationErrors([])

        try {
            // Build guardians array
            const guardians = [
                {
                    email: context.email,
                    relationship_type: 'parent' as RelationshipType
                }
            ]

            // Add additional guardian if provided
            if (formData.additionalGuardianEmail.trim()) {
                guardians.push({
                    email: formData.additionalGuardianEmail.trim(),
                    relationship_type: formData.additionalGuardianRelationship
                })
            }

            // Build DTO
            const dto: CreateAthleteDTO = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender || null,
                preferred_name: formData.preferred_name.trim() || null,
                medical_notes: formData.medical_notes.trim() || null,
                allergies: formData.allergies.trim() || null,
                emergency_contact_name: formData.emergency_contact_name.trim() || null,
                emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
                guardians
            }

            const { error: createError } = await createAthleteWithGuardians(context, dto)

            if (createError) throw createError

            // Success - navigate back to athletes list
            navigate('/portal/athletes')
        } catch (err) {
            console.error('Error creating athlete:', err)
            setError(err instanceof Error ? err.message : 'Failed to create athlete')
            setIsSubmitting(false)
        }
    }

    // Show error if context email is missing
    if (isReady && !context.email) {
        return (
            <PortalLayout
                breadcrumbs={[
                    { label: 'Home', path: '/portal/dashboard' },
                    { label: 'Teams', path: '/portal/athletes' },
                    { label: 'Add Athlete' }
                ]}
            >
                <PageTitle>Add Athlete</PageTitle>
                <Card className="p-6 mt-6">
                    <div className="text-center py-12">
                        <p className="text-red-600 dark:text-red-400 font-bold mb-4">
                            Unable to create athlete: Your account email is missing.
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                            Please contact support to resolve this issue.
                        </p>
                    </div>
                </Card>
            </PortalLayout>
        )
    }

    // Loading state
    if (!isReady) {
        return (
            <PortalLayout
                breadcrumbs={[
                    { label: 'Home', path: '/portal/dashboard' },
                    { label: 'Teams', path: '/portal/athletes' },
                    { label: 'Add Athlete' }
                ]}
            >
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                </div>
            </PortalLayout>
        )
    }

    const isFormValid = formData.first_name.trim() && formData.last_name.trim() && formData.date_of_birth

    return (
        <PortalLayout
            breadcrumbs={[
                { label: 'Home', path: '/portal/dashboard' },
                { label: 'Teams', path: '/portal/athletes' },
                { label: 'Add Athlete' }
            ]}
        >
            <div className="mb-12">
                <PageTitle>Add Athlete</PageTitle>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
                    Create a new athlete profile. You will be automatically linked as a guardian.
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
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                Date of Birth *
                            </label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                                required
                            />
                        </div>
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

                {/* Guardians */}
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Guardians</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        You will be automatically linked as a guardian. You can add one additional guardian below.
                    </p>

                    {/* Current User Info */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-bold">
                            You ({context.email}) will be linked as a guardian (Parent)
                        </p>
                    </div>

                    {/* Additional Guardian */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Additional Guardian Email (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.additionalGuardianEmail}
                                onChange={(e) => {
                                    setFormData({ ...formData, additionalGuardianEmail: e.target.value })
                                    if (!emailTouched) setEmailTouched(true)
                                }}
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="guardian@example.com"
                            />
                            {isCheckingGuardian && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#137fec]"></div>
                                </div>
                            )}
                        </div>

                        {/* Guardian Match Indicator */}
                        {guardianMatch && formData.additionalGuardianEmail.trim() && (
                            <div className="mt-2">
                                {guardianMatch.exists ? (
                                    <p className="text-sm text-green-600 dark:text-green-400 font-bold">
                                        ✓ Account exists - will link
                                    </p>
                                ) : (
                                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mt-2">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                            This email doesn't have an account. An invitation will be sent to link them as a guardian.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Relationship Type
                        </label>
                        <select
                            value={formData.additionalGuardianRelationship}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    additionalGuardianRelationship: e.target.value as RelationshipType
                                })
                            }
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                        >
                            <option value="parent">Parent</option>
                            <option value="guardian">Guardian</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
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
                        {isSubmitting ? 'Creating...' : 'Create Athlete'}
                    </Button>
                </div>
            </form>
        </PortalLayout>
    )
}
