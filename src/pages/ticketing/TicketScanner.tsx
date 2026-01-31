/**
 * Ticket Scanner / Manual Validation Page
 * 
 * Allows gate staff to validate tickets by entering human-readable entry codes.
 * Works on any device with a browser (no camera required).
 * Supports both admin (logged-in) and staff link (no login) access.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getTicketedEvents, validateTicketScan, exchangeStaffLink } from '@/data/services'
import { useOffline } from '@/hooks/useOffline'
import type { ValidateScanResponse, TicketScanResult } from '@/types/ticketing'
import { formatEntryCode } from '@/types/ticketing'

interface ValidationResult {
  timestamp: Date
  code: string
  result: TicketScanResult
  message?: string
  ticketTypeName?: string
}

export default function TicketScanner() {
  const { token } = useParams<{ token?: string }>()
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [entryCode, setEntryCode] = useState('')
  const [validationResult, setValidationResult] = useState<ValidateScanResponse | null>(null)
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([])
  const [pendingValidation, setPendingValidation] = useState<{ code: string; eventId: string } | null>(null)
  const [sessionCounts, setSessionCounts] = useState({ validated: 0, remainingCapacity: null as number | null })
  const [staffLinkSession, setStaffLinkSession] = useState<any>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Load staff link session if token provided
  useEffect(() => {
    if (token) {
      exchangeStaffLink({ token })
        .then(({ data, error }) => {
          if (data && !error) {
            setStaffLinkSession(data)
            setSelectedEventId(data.ticketed_event_id)
          } else {
            navigate('/')
          }
        })
        .catch(() => navigate('/'))
    }
  }, [token, navigate])

  // Load events (admin route) or use fixed event (staff link)
  const { data: events } = useQuery({
    queryKey: ['ticketed-events', 'published'],
    queryFn: () => getTicketedEvents({ status: 'published', upcoming_only: true }),
    enabled: !token, // Only load if admin route
  })

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current && !validationResult) {
      inputRef.current.focus()
    }
  }, [validationResult])

  // Format entry code as user types
  const handleCodeChange = (value: string) => {
    // Remove non-alphanumeric, convert to uppercase
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Auto-format with dashes (e.g., XXXX-XXXX-XXXX)
    let formatted = cleaned
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
    }
    if (cleaned.length > 8) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`
    }
    setEntryCode(formatted)
  }

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!selectedEventId) throw new Error('No event selected')
      
      return validateTicketScan(
        {
          ticketed_event_id: selectedEventId,
          entry_code: code.replace(/[^A-Z0-9]/g, ''), // Normalize
        },
        token,
      )
    },
    onSuccess: ({ data, error }) => {
      if (error || !data) {
        setValidationResult({
          result: 'invalid',
          reason: 'not_found',
          message: error?.message || 'Validation failed',
        })
      } else {
        setValidationResult(data)
        
        // Update history
        setValidationHistory((prev) => [
          {
            timestamp: new Date(),
            code: entryCode,
            result: data.result,
            message: data.message,
            ticketTypeName: data.ticket_type_name || undefined,
          },
          ...prev.slice(0, 4), // Keep last 5
        ])

        // Update counts
        if (data.validated_count !== undefined) {
          setSessionCounts((prev) => ({
            ...prev,
            validated: data.validated_count || 0,
            remainingCapacity: data.remaining_capacity ?? null,
          }))
        }

        // Auto-clear input after delay
        setTimeout(() => {
          setEntryCode('')
          setValidationResult(null)
          inputRef.current?.focus()
        }, 3000)
      }
      setPendingValidation(null)
    },
    onError: (error: Error) => {
      setValidationResult({
        result: 'invalid',
        reason: 'not_found',
        message: error.message,
      })
      setPendingValidation(null)
    },
  })

  // Handle offline retry
  useEffect(() => {
    if (!isOffline && pendingValidation) {
      validateMutation.mutate(pendingValidation.code)
    }
  }, [isOffline, pendingValidation])

  // Submit validation
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      
      if (!selectedEventId || !entryCode.trim()) return
      if (isOffline) {
        setPendingValidation({ code: entryCode, eventId: selectedEventId })
        return
      }

      validateMutation.mutate(entryCode)
    },
    [selectedEventId, entryCode, isOffline, validateMutation],
  )

  // Handle Enter key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleSubmit])

  const currentEvent = token
    ? staffLinkSession
      ? { id: staffLinkSession.ticketed_event_id, title: staffLinkSession.event_title }
      : null
    : events?.data?.find((e) => e.id === selectedEventId)

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-2 uppercase tracking-tight">Ticket Validation</h1>
          {isOffline && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>Connection lost—waiting to verify.</strong> Your validation will be processed when connection is restored.
              </p>
            </div>
          )}
        </div>

        {/* Event Selector (admin route only) */}
        {!token && events?.data && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
              Select Event
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[#111418] dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
            >
              <option value="">Choose an event...</option>
              {events.data.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fixed Event Display (staff link) */}
        {token && currentEvent && (
          <div className="mb-6 bg-[#137fec]/10 border border-[#137fec]/20 rounded-lg p-4">
            <p className="text-sm text-[#137fec] font-medium">Validating for:</p>
            <p className="text-lg font-bold text-[#111418] dark:text-white">{currentEvent.title}</p>
          </div>
        )}

        {!selectedEventId && !token && (
          <div className="text-center py-12 text-gray-500">
            Please select an event to begin validation
          </div>
        )}

        {(selectedEventId || token) && (
          <>
            {/* Validation Input */}
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Enter Entry Code
                </label>
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={entryCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="flex-1 text-2xl font-mono text-center px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[#111418] dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec] uppercase tracking-wider"
                    maxLength={14} // XXXX-XXXX-XXXX
                    autoFocus
                    disabled={validateMutation.isPending || isOffline}
                  />
                  <button
                    type="submit"
                    disabled={!entryCode.trim() || validateMutation.isPending || isOffline}
                    className="px-8 py-4 bg-[#137fec] text-white font-black rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors uppercase tracking-wider shadow-[0_8px_15px_-3px_rgba(19,127,236,0.3),0_4px_6px_-2px_rgba(19,127,236,0.05)]"
                  >
                    {validateMutation.isPending ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                {pendingValidation && (
                  <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    Queued for validation when connection is restored...
                  </p>
                )}
              </div>
            </form>

            {/* Result Banner */}
            {validationResult && (
              <div
                className={`mb-6 rounded-xl p-6 ${
                  validationResult.result === 'valid'
                    ? 'bg-[#10b981]/10 border-2 border-[#10b981]'
                    : validationResult.result === 'already_used'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                }`}
              >
                <div className="flex items-center gap-4">
                  {validationResult.result === 'valid' && (
                    <div className="text-5xl text-[#10b981]">✓</div>
                  )}
                  {validationResult.result === 'already_used' && (
                    <div className="text-5xl text-orange-600">⚠</div>
                  )}
                  {validationResult.result === 'invalid' && (
                    <div className="text-5xl text-red-600">✗</div>
                  )}
                  <div className="flex-1">
                    <h3
                      className={`text-2xl font-black mb-1 uppercase tracking-tight ${
                        validationResult.result === 'valid'
                          ? 'text-[#10b981]'
                          : validationResult.result === 'already_used'
                          ? 'text-orange-900 dark:text-orange-200'
                          : 'text-red-900 dark:text-red-200'
                      }`}
                    >
                      {validationResult.result === 'valid'
                        ? 'VALID'
                        : validationResult.result === 'already_used'
                        ? 'ALREADY USED'
                        : 'INVALID'}
                    </h3>
                    {validationResult.ticket_type_name && (
                      <p className="text-lg text-[#111418] dark:text-white font-semibold">
                        {validationResult.ticket_type_name}
                      </p>
                    )}
                    {validationResult.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{validationResult.message}</p>
                    )}
                    {validationResult.used_at && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Originally used: {new Date(validationResult.used_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Session Counts */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-4">
                <p className="text-sm text-[#617589] dark:text-gray-400">Validated This Session</p>
                <p className="text-3xl font-black text-[#111418] dark:text-white">{sessionCounts.validated}</p>
              </div>
              {sessionCounts.remainingCapacity !== null && (
                <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-4">
                  <p className="text-sm text-[#617589] dark:text-gray-400">Remaining Capacity</p>
                  <p className="text-3xl font-black text-[#111418] dark:text-white">{sessionCounts.remainingCapacity}</p>
                </div>
              )}
            </div>

            {/* Last 5 Validations */}
            {validationHistory.length > 0 && (
              <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-4">
                <h3 className="text-lg font-black text-[#111418] dark:text-white mb-3 uppercase tracking-tight">Last 5 Validations</h3>
                <div className="space-y-2">
                  {validationHistory.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        result.result === 'valid'
                          ? 'bg-[#10b981]/10'
                          : result.result === 'already_used'
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#111418] dark:text-white">{result.code}</span>
                        <span className="text-sm text-[#617589] dark:text-gray-400">
                          {result.ticketTypeName && `(${result.ticketTypeName})`}
                        </span>
                      </div>
                      <div className="text-xs text-[#617589] dark:text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
