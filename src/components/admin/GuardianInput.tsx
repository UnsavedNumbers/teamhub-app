/**
 * GuardianInput Component
 *
 * Reusable component for entering guardian information with:
 * - Email input with debounced lookup
 * - Real-time guardian matching
 * - Relationship type selector
 * - Optional contact info fields
 * - Remove button
 */

import { useState, useEffect, useCallback } from 'react'
import { X, User } from 'lucide-react'
import type { GuardianFormData, GuardianMatch } from '../../types/family'
import { GuardianMatchIndicator } from './GuardianMatchIndicator'
import {
    checkGuardianMatch,
    debounce,
    validateGuardianEmail
} from '../../utils/guardianMatching'

interface GuardianInputProps {
    value: GuardianFormData
    onChange: (data: GuardianFormData) => void
    onRemove: () => void
    orgId: string
    existingAthleteId?: string
    index: number
    canRemove?: boolean
    showOptionalFields?: boolean
}

export function GuardianInput({
    value,
    onChange,
    onRemove,
    orgId,
    existingAthleteId,
    index,
    canRemove = true,
    showOptionalFields = false
}: GuardianInputProps) {
    const [match, setMatch] = useState<GuardianMatch | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [emailTouched, setEmailTouched] = useState(false)

    // Debounced email lookup
    const debouncedCheckEmail = useCallback(
        debounce(async (email: string, orgId: string) => {
            if (!email || !validateGuardianEmail(email)) {
                setMatch(null)
                setIsChecking(false)
                return
            }

            setIsChecking(true)
            setError(null)

            try {
                const result = await checkGuardianMatch(email, orgId)
                
                // Filter out current athlete from linked athletes if editing
                if (result && existingAthleteId) {
                    result.linkedAthletes = result.linkedAthletes.filter(
                        a => a.id !== existingAthleteId
                    )
                }
                
                setMatch(result)
            } catch (err) {
                console.error('Error checking guardian:', err)
                setError('Failed to check guardian')
            } finally {
                setIsChecking(false)
            }
        }, 300),
        [existingAthleteId]
    )

    // Check email when it changes
    useEffect(() => {
        if (emailTouched && value.email) {
            debouncedCheckEmail(value.email, orgId)
        }
    }, [value.email, orgId, emailTouched, debouncedCheckEmail])

    const handleEmailChange = (email: string) => {
        setEmailTouched(true)
        onChange({ ...value, email })
    }

    const handleFieldChange = (field: keyof GuardianFormData, fieldValue: any) => {
        onChange({ ...value, [field]: fieldValue })
    }

    const emailError = emailTouched && value.email && !validateGuardianEmail(value.email)
        ? 'Invalid email format'
        : null

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            {/* Header with Remove Button */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900">
                        Guardian {index + 1}
                    </h4>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Remove guardian"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Email Field with Match Indicator */}
            <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    value={value.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        emailError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="guardian@example.com"
                    required
                />
                {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                )}
                
                {/* Match Indicator */}
                {emailTouched && value.email && !emailError && (
                    <GuardianMatchIndicator
                        match={match}
                        isLoading={isChecking}
                        error={error}
                        className="mt-2"
                    />
                )}
            </div>

            {/* Relationship Type */}
            <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                    Relationship <span className="text-red-500">*</span>
                </label>
                <select
                    value={value.relationship_type}
                    onChange={(e) => handleFieldChange('relationship_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                >
                    <option value="parent">Parent</option>
                    <option value="guardian">Legal Guardian</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* Optional Fields (collapsed by default) */}
            {showOptionalFields && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            First Name <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={value.first_name || ''}
                            onChange={(e) => handleFieldChange('first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="First name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Last Name <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={value.last_name || ''}
                            onChange={(e) => handleFieldChange('last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Last name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Phone <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                            type="tel"
                            value={value.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(555) 123-4567"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * Guardian List Component
 * Manages multiple guardian inputs
 */
interface GuardianListProps {
    guardians: GuardianFormData[]
    onChange: (guardians: GuardianFormData[]) => void
    orgId: string
    existingAthleteId?: string
    showOptionalFields?: boolean
    minGuardians?: number
}

export function GuardianList({
    guardians,
    onChange,
    orgId,
    existingAthleteId,
    showOptionalFields = false,
    minGuardians = 0
}: GuardianListProps) {
    const handleAddGuardian = () => {
        onChange([
            ...guardians,
            {
                email: '',
                relationship_type: 'parent'
            }
        ])
    }

    const handleRemoveGuardian = (index: number) => {
        onChange(guardians.filter((_, i) => i !== index))
    }

    const handleUpdateGuardian = (index: number, data: GuardianFormData) => {
        const updated = [...guardians]
        updated[index] = data
        onChange(updated)
    }

    return (
        <div className="space-y-4">
            {/* Info Banner */}
            {guardians.length === 0 && minGuardians === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This athlete will have no guardians linked. 
                        They won't appear in parent dashboards until guardians are added.
                    </p>
                </div>
            )}

            {/* Guardian Inputs */}
            {guardians.map((guardian, index) => (
                <GuardianInput
                    key={index}
                    value={guardian}
                    onChange={(data) => handleUpdateGuardian(index, data)}
                    onRemove={() => handleRemoveGuardian(index)}
                    orgId={orgId}
                    existingAthleteId={existingAthleteId}
                    index={index}
                    canRemove={guardians.length > minGuardians}
                    showOptionalFields={showOptionalFields}
                />
            ))}

            {/* Add Guardian Button */}
            <button
                type="button"
                onClick={handleAddGuardian}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
                + Add Guardian
            </button>
        </div>
    )
}
