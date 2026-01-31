/**
 * RequestAthleteAttachment Component
 *
 * Allows guardians to search for existing athletes and request attachment.
 * Requires admin approval.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useUserContext } from '../hooks/useUserContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { searchAthletesForAttachment, submitGuardianAttachmentRequest, getGuardianAttachmentRequests } from '../data/services/guardianService'
import type { AthleteSearchResult, GuardianAttachmentRequest } from '../data/services/guardianService'
import { hasRole } from '../utils/roleHelpers'
import { calculateAge } from '../utils/athleteHelpers'

export default function RequestAthleteAttachment() {
    const { isReady } = useUserContext()
    const { organizations } = useOrganization()
    
    // Filter organizations where user has parent role
    const parentOrgs = organizations.filter(org => hasRole(org, 'parent'))
    
    // State
    const [selectedOrgId, setSelectedOrgId] = useState<string>('')
    const [searchText, setSearchText] = useState('')
    const [searchResults, setSearchResults] = useState<AthleteSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [existingRequests, setExistingRequests] = useState<Map<string, GuardianAttachmentRequest>>(new Map())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submittingAthleteId, setSubmittingAthleteId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    
    // Refs for debouncing and race condition prevention
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const requestIdRef = useRef(0)
    const isMountedRef = useRef(true)
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])
    
    // Set default org when parent orgs are loaded
    useEffect(() => {
        if (parentOrgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(parentOrgs[0].id)
        }
    }, [parentOrgs, selectedOrgId])
    
    // Load existing requests when org changes
    useEffect(() => {
        if (!selectedOrgId || !isReady) return
        
        const loadRequests = async () => {
            const { data, error: reqError } = await getGuardianAttachmentRequests(selectedOrgId)
            
            if (!isMountedRef.current) return
            
            if (reqError) {
                console.error('Error loading existing requests:', reqError)
                return
            }
            
            if (data) {
                const requestsMap = new Map<string, GuardianAttachmentRequest>()
                data.forEach(req => {
                    requestsMap.set(req.athlete_id, req)
                })
                setExistingRequests(requestsMap)
            }
        }
        
        loadRequests()
    }, [selectedOrgId, isReady])
    
    // Debounced search
    const performSearch = useCallback(async (text: string, orgId: string) => {
        if (!text || text.trim().length < 2 || !orgId) {
            setSearchResults([])
            setIsSearching(false)
            return
        }
        
        const currentRequestId = ++requestIdRef.current
        setIsSearching(true)
        setError(null)
        
        try {
            const { data, error: searchError } = await searchAthletesForAttachment(orgId, text)
            
            if (!isMountedRef.current) return
            
            if (currentRequestId !== requestIdRef.current) return
            
            if (searchError) {
                setError(searchError.message || 'Failed to search athletes')
                setSearchResults([])
            } else if (data) {
                setSearchResults(data)
            } else {
                setSearchResults([])
            }
        } catch (err) {
            console.error('Error searching athletes:', err)
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setError('An error occurred while searching')
                setSearchResults([])
            }
        } finally {
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setIsSearching(false)
            }
        }
    }, [])
    
    // Handle search text change with debouncing
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        
        if (!selectedOrgId) {
            setSearchResults([])
            return
        }
        
        if (searchText.trim().length < 2) {
            setSearchResults([])
            setIsSearching(false)
            return
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(searchText, selectedOrgId)
        }, 300)
        
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [searchText, selectedOrgId, performSearch])
    
    // Handle request submission
    const handleRequestAttachment = useCallback(async (athleteId: string) => {
        if (!selectedOrgId || isSubmitting) return
        
        const currentRequestId = ++requestIdRef.current
        setIsSubmitting(true)
        setSubmittingAthleteId(athleteId)
        setError(null)
        setSuccessMessage(null)
        
        try {
            const { data, error: submitError } = await submitGuardianAttachmentRequest(athleteId, selectedOrgId)
            
            if (!isMountedRef.current) return
            if (currentRequestId !== requestIdRef.current) return
            
            if (submitError) {
                setError(submitError.message || 'Failed to submit request')
            } else if (data) {
                setSuccessMessage('Request submitted successfully! An admin will review it.')
                // Update existing requests map
                const newRequests = new Map(existingRequests)
                newRequests.set(athleteId, data)
                setExistingRequests(newRequests)
            }
        } catch (err) {
            console.error('Error submitting request:', err)
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setError('An error occurred while submitting the request')
            }
        } finally {
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setIsSubmitting(false)
                setSubmittingAthleteId(null)
            }
        }
    }, [selectedOrgId, isSubmitting, existingRequests])
    
    // Get request status for an athlete
    const getRequestStatus = (athleteId: string): GuardianAttachmentRequest | null => {
        return existingRequests.get(athleteId) || null
    }
    
    // Format expiration date
    const formatExpirationDate = (expiresAt: string): string => {
        try {
            const date = new Date(expiresAt)
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            })
        } catch {
            return expiresAt
        }
    }
    
    // Check if request is expired
    const isRequestExpired = (expiresAt: string): boolean => {
        try {
            return new Date(expiresAt) <= new Date()
        } catch {
            return false
        }
    }
    
    if (!isReady) {
        return (
            <PortalLayout>
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                </div>
            </PortalLayout>
        )
    }
    
    if (parentOrgs.length === 0) {
        return (
            <PortalLayout
                breadcrumbs={[
                    { label: 'Home', path: '/portal/dashboard' },
                    { label: 'Request Athlete Attachment' },
                ]}
            >
                <Card className="text-center py-12">
                    <Icon name="info" className="mx-auto mb-4 text-slate-400 text-5xl" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Organizations Found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        You need to have a parent role in at least one organization to request athlete attachment.
                    </p>
                </Card>
            </PortalLayout>
        )
    }
    
    return (
        <PortalLayout
            breadcrumbs={[
                { label: 'Home', path: '/portal/dashboard' },
                { label: 'My Athletes', path: '/portal/athletes' },
                { label: 'Request Athlete Attachment' },
            ]}
        >
            <div className="mb-8">
                <PageTitle>Request Athlete Attachment</PageTitle>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
                    Search for an existing athlete and request to attach yourself as a guardian.
                </p>
            </div>
            
            {/* Error/Success Messages */}
            {error && (
                <Card className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                        <Icon name="error" className="text-red-600 dark:text-red-400" />
                        <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                </Card>
            )}
            
            {successMessage && (
                <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <Icon name="check_circle" className="text-green-600 dark:text-green-400" />
                        <p className="text-green-800 dark:text-green-200">{successMessage}</p>
                    </div>
                </Card>
            )}
            
            {/* Org Selector */}
            {parentOrgs.length > 1 && (
                <Card className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Organization
                    </label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => {
                            setSelectedOrgId(e.target.value)
                            setSearchText('')
                            setSearchResults([])
                        }}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)] focus:border-transparent"
                    >
                        {parentOrgs.map(org => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        ))}
                    </select>
                </Card>
            )}
            
            {/* Search Input */}
            <Card className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search Athletes
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => {
                            const value = e.target.value
                            // Limit to reasonable length
                            if (value.length <= 100) {
                                setSearchText(value)
                            }
                        }}
                        placeholder="Enter athlete's first or last name (minimum 2 characters)"
                        className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)] focus:border-transparent"
                        disabled={!selectedOrgId}
                    />
                    <Icon 
                        name="search" 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" 
                        size="20"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                        </div>
                    )}
                </div>
                {searchText.length > 0 && searchText.length < 2 && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Please enter at least 2 characters to search
                    </p>
                )}
            </Card>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Search Results ({searchResults.length})
                    </h3>
                    <div className="space-y-4">
                        {searchResults.map(athlete => {
                            const existingRequest = getRequestStatus(athlete.id)
                            const isExpired = existingRequest ? isRequestExpired(existingRequest.expires_at) : false
                            const isSubmittingThis = submittingAthleteId === athlete.id
                            const age = athlete.birthdate ? calculateAge(athlete.birthdate) : null
                            const ageDisplay = age !== null ? String(age) : null
                            
                            return (
                                <div
                                    key={athlete.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                                                {athlete.first_name} {athlete.last_name}
                                            </h4>
                                            {athlete.gender && (
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {athlete.gender}
                                                </span>
                                            )}
                                            {ageDisplay && (
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    Age {ageDisplay}
                                                </span>
                                            )}
                                        </div>
                                        {athlete.birthdate && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Born: {new Date(athlete.birthdate).toLocaleDateString()}
                                            </p>
                                        )}
                                        {existingRequest && (
                                            <div className="mt-2">
                                                {existingRequest.status === 'pending' && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                                                            Pending
                                                        </span>
                                                        {!isExpired && (
                                                            <span className="text-slate-500 dark:text-slate-400">
                                                                Expires: {formatExpirationDate(existingRequest.expires_at)}
                                                            </span>
                                                        )}
                                                        {isExpired && (
                                                            <span className="text-red-600 dark:text-red-400">
                                                                Expired - You can resubmit
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {existingRequest.status === 'approved' && (
                                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-sm">
                                                        Approved
                                                    </span>
                                                )}
                                                {existingRequest.status === 'denied' && (
                                                    <div className="text-sm">
                                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                                                            Denied
                                                        </span>
                                                        {existingRequest.decision_reason && (
                                                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                                Reason: {existingRequest.decision_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        {existingRequest?.status === 'approved' ? (
                                            <Button variant="secondary" disabled>
                                                Already Attached
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                onClick={() => handleRequestAttachment(athlete.id)}
                                                disabled={isSubmitting || isSubmittingThis}
                                            >
                                                {isSubmittingThis ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 inline-block"></div>
                                                        Submitting...
                                                    </>
                                                ) : existingRequest?.status === 'pending' && !isExpired ? (
                                                    'Request Pending'
                                                ) : existingRequest?.status === 'denied' || isExpired ? (
                                                    'Resubmit Request'
                                                ) : (
                                                    'Request Attachment'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}
            
            {searchText.length >= 2 && !isSearching && searchResults.length === 0 && (
                <Card className="text-center py-12">
                    <Icon name="search_off" className="mx-auto mb-4 text-slate-400" size="48" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Athletes Found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        No athletes found matching "{searchText}". Try a different search term.
                    </p>
                </Card>
            )}
        </PortalLayout>
    )
}
