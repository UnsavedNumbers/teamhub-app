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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, Card, Input, Button, Select, ErrorState } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { createAthleteWithGuardians } from '../../data/services/familyService'
import { GuardianList } from '../../components/admin/GuardianInput'
import { useT } from '../../i18n/useI18n'
import type { Gender, GuardianFormData, CreateAthleteDTO } from '../../types/family'
import { createDefaultGuardians, validateGuardians, findDuplicateEmails } from '../../utils/guardianMatching'
import { AlertCircle } from 'lucide-react'

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
        jersey_number: '',
        medical_notes: '',
        allergies: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
    })

    const [guardians, setGuardians] = useState<GuardianFormData[]>(createDefaultGuardians())

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
                jersey_number: formData.jersey_number || null,
                medical_notes: formData.medical_notes || null,
                allergies: formData.allergies || null,
                emergency_contact_name: formData.emergency_contact_name || null,
                emergency_contact_phone: formData.emergency_contact_phone || null,
                guardians: guardians.filter(g => g.email.trim() !== '') // Only include guardians with emails
            }

            const { data, error: createError } = await createAthleteWithGuardians(context, dto)

            if (createError) throw createError

            // Success - navigate to athlete list or detail page
            if (data?.athlete_id) {
                navigate(`/admin/athletes`)
            } else {
                navigate(`/admin/athletes`)
            }
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
                subtitle="Create a new athlete profile and link guardians"
                breadcrumbs={[
                    { label: 'Athletes', path: '/admin/athletes' },
                    { label: 'Add Athlete', path: '#' }
                ]}
            />

            <div className="pa-form-container">
                    <form onSubmit={handleSubmit}>
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
                                <Input
                                    label="Date of Birth"
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
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
                                    label="Jersey Number (Optional)"
                                    value={formData.jersey_number}
                                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                                    placeholder="e.g. 23"
                                />
                            </div>

                            <h3 className="pa-h3 pa-mt-8 pa-mb-4">Medical & Emergency</h3>

                            <div className="pa-mb-4">
                                <Input
                                    label="Medical Notes (Optional)"
                                    value={formData.medical_notes}
                                    onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                                    placeholder="Any medical conditions coaches should know about"
                                    multiline
                                    rows={3}
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

                        {/* Submit Buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/admin/athletes')}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Athlete'}
                            </Button>
                        </div>
                    </form>
            </div>
        </div>
    )
}
