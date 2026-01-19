/**
 * GuardianMatchIndicator Component
 *
 * Visual indicator showing the status of guardian email matching:
 * - Green: Existing user, can link
 * - Yellow: New user, will send invite
 * - Gray: No email entered or checking
 * - Red: Error or invalid
 */

import { CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react'
import type { GuardianMatch } from '../../types/family'
import {
    formatLinkedAthletes
} from '../../utils/guardianMatching'

interface GuardianMatchIndicatorProps {
    match: GuardianMatch | null
    isLoading?: boolean
    error?: string | null
    className?: string
}

export function GuardianMatchIndicator({
    match,
    isLoading = false,
    error = null,
    className = ''
}: GuardianMatchIndicatorProps) {
    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
            </div>
        )
    }

    // No match yet (no email entered)
    if (!match) {
        return (
            <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
                <Mail className="w-4 h-4" />
                <span>Enter email to check</span>
            </div>
        )
    }

    // Existing user - can link
    if (match.exists) {
        const linkedAthletesText = formatLinkedAthletes(match)
        
        return (
            <div className={`${className}`}>
                <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Existing Guardian</span>
                </div>
                {linkedAthletesText && (
                    <div className="mt-1 text-xs text-gray-600 ml-6">
                        Currently linked to: <span className="font-medium">{linkedAthletesText}</span>
                    </div>
                )}
                {match.user && (
                    <div className="mt-1 text-xs text-gray-500 ml-6">
                        {match.user.display_name && <span>{match.user.display_name} • </span>}
                        {match.user.phone && <span>{match.user.phone}</span>}
                    </div>
                )}
            </div>
        )
    }

    // New user - will send invite
    return (
        <div className={`flex items-center gap-2 text-sm text-yellow-600 ${className}`}>
            <Mail className="w-4 h-4" />
            <span>New guardian - invite will be sent</span>
        </div>
    )
}

/**
 * Compact version for inline use
 */
export function GuardianMatchBadge({
    match,
    isLoading = false,
    error = null
}: GuardianMatchIndicatorProps) {
    if (isLoading) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking
            </span>
        )
    }

    if (error) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3" />
                Error
            </span>
        )
    }

    if (!match) {
        return null
    }

    if (match.exists) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                Will Link
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Mail className="w-3 h-3" />
            Will Invite
        </span>
    )
}
