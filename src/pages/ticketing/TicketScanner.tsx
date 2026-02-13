/**
 * Ticket Scanner / Manual Validation Page
 * 
 * Unified ticket validation with camera QR scanning and manual entry.
 * Works on any device with a browser (camera optional).
 * Supports both admin (logged-in) and staff link (no login) access.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketedEvents, validateTicketScan, exchangeStaffLink } from '@/data/services'
import { useOffline } from '@/hooks/useOffline'
import { useT } from '@/i18n/useI18n'
import type { ValidateScanResponse, TicketScanResult, OrderContext } from '@/types/ticketing'
import { QRCodeScanner, type QRCodeScannerHandle } from '@/components/ticketing/QRCodeScanner'
import { ValidationResultBanner } from '@/components/ticketing/ValidationResultBanner'
import { OrderContextPanel } from '@/components/ticketing/OrderContextPanel'
import { queueValidation } from '@/features/tickets/utils/offlineQueue'
import { useMemoryMonitor } from '@/features/tickets/hooks/useMemoryMonitor'

interface ValidationResult {
  timestamp: Date
  code: string
  result: TicketScanResult
  message?: string
  ticketTypeName?: string
}

export default function TicketScanner() {
  const { token, eventId } = useParams<{ token?: string; eventId?: string }>()
  const directEventId = eventId?.trim() || null
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const t = useT()
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(directEventId)
  const [entryCode, setEntryCode] = useState('')
  const [validationResult, setValidationResult] = useState<ValidateScanResponse | { status: 'validating'; code?: string } | null>(null)
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([])
  const [pendingValidation, setPendingValidation] = useState<{ code: string; eventId: string } | null>(null)
  const [sessionCounts, setSessionCounts] = useState({ validated: 0, remainingCapacity: null as number | null })
  const [staffLinkSession, setStaffLinkSession] = useState<any>(null)
  const [orderContext, setOrderContext] = useState<OrderContext | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [pendingCount] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<QRCodeScannerHandle>(null)
  
  // Memory monitoring
  const { showWarning, heapSize, dismissWarning } = useMemoryMonitor(500)

  // No need for runtime detection - use CSS for responsive design

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

  // Event-scoped scanner route (/admin/ticketing/scanner/:eventId)
  useEffect(() => {
    if (!token && directEventId) {
      setSelectedEventId(directEventId)
    }
  }, [token, directEventId])

  // Load events (admin route) or use fixed event (staff link)
  const { data: events } = useQuery({
    queryKey: ['ticketed-events', 'published'],
    queryFn: () => getTicketedEvents({ status: 'published', upcoming_only: true }),
    enabled: !token, // Only load if admin route
  })
  const eventsAny = events as any
  const eventList = Array.isArray(eventsAny) ? eventsAny : eventsAny?.data || []

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current && !validationResult && !isValidating) {
      inputRef.current.focus()
    }
  }, [validationResult, isValidating])

  // Format entry code as user types
  const handleCodeChange = useCallback((value: string) => {
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
  }, [])

  // Handle QR scan
  const handleQRScan = useCallback(async (qrToken: string) => {
    if (!selectedEventId || isValidating) {
      return
    }

    if (isOffline) {
      await queueValidation({ qr_token: qrToken, selected_event_id: selectedEventId })
      setPendingValidation({ code: qrToken, eventId: selectedEventId })
      return
    }

    setIsValidating(true)
    setValidationResult({ status: 'validating', code: qrToken })

    try {
      const { data, error } = await validateTicketScan(
        {
          ticketed_event_id: selectedEventId,
          qr_token_raw: qrToken,
        },
        token,
      )

      if (error || !data) {
        setValidationResult({
          result: 'invalid',
          reason: 'not_found',
          message: error?.message || 'Validation failed',
        })
        setTimeout(() => {
          setValidationResult(null)
          scannerRef.current?.resume()
        }, 2000)
        return
      }

      // Handle event mismatch
      if (data.event_mismatch) {
        setValidationResult(data)
        // Don't auto-resume, wait for user decision
        return
      }

      // Handle normal results
      setValidationResult(data)

      // Set order context if multiple tickets
      if (data.order_context && data.order_context.remaining_active > 0) {
        setOrderContext(data.order_context)
      } else {
        setOrderContext(null)
      }

      // Update session counts
      if (data.validated_count !== undefined) {
        setSessionCounts((prev) => ({
          ...prev,
          validated: data.validated_count || 0,
          remainingCapacity: data.remaining_capacity ?? null,
        }))
      }

      // Add to history
      setValidationHistory((prev) => [
        {
          timestamp: new Date(),
          code: qrToken.slice(-8),
          result: data.result,
          message: data.message,
          ticketTypeName: data.ticket_type_name || undefined,
        },
        ...prev.slice(0, 49), // Keep last 50
      ])

      // Auto-clear and resume after delay
      setTimeout(() => {
        setValidationResult(null)
        scannerRef.current?.resume()
      }, 1500)
    } catch (error: any) {
      setValidationResult({
        result: 'invalid',
        reason: 'not_found',
        message: error.message || 'Validation failed',
      })
      setTimeout(() => {
        setValidationResult(null)
        scannerRef.current?.resume()
      }, 2000)
    } finally {
      setIsValidating(false)
    }
  }, [selectedEventId, isValidating, token])

  // Handle manual entry submission
  const handleManualSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!selectedEventId || !entryCode.trim() || isValidating) return
    const cleanCode = entryCode.replace(/[\s-]/g, '').toUpperCase()

    if (isOffline) {
      await queueValidation({ entry_code: cleanCode, selected_event_id: selectedEventId })
      setPendingValidation({ code: entryCode, eventId: selectedEventId })
      return
    }

    setIsValidating(true)
    setValidationResult({ status: 'validating', code: entryCode })

    try {
      const { data, error } = await validateTicketScan(
        {
          ticketed_event_id: selectedEventId,
          entry_code: cleanCode,
        },
        token,
      )

      if (error || !data) {
        setValidationResult({
          result: 'invalid',
          reason: 'not_found',
          message: error?.message || 'Validation failed',
        })
        setTimeout(() => {
          setValidationResult(null)
        }, 2000)
        return
      }

      // Handle event mismatch
      if (data.event_mismatch) {
        setValidationResult(data)
        return
      }

      // Handle normal results
      setValidationResult(data)

      // Set order context if multiple tickets
      if (data.order_context && data.order_context.remaining_active > 0) {
        setOrderContext(data.order_context)
      } else {
        setOrderContext(null)
      }

      // Update session counts
      if (data.validated_count !== undefined) {
        setSessionCounts((prev) => ({
          ...prev,
          validated: data.validated_count || 0,
          remainingCapacity: data.remaining_capacity ?? null,
        }))
      }

      // Add to history
      setValidationHistory((prev) => [
        {
          timestamp: new Date(),
          code: entryCode,
          result: data.result,
          message: data.message,
          ticketTypeName: data.ticket_type_name || undefined,
        },
        ...prev.slice(0, 49), // Keep last 50
      ])

      // Auto-clear input after delay
      setTimeout(() => {
        setEntryCode('')
        setValidationResult(null)
        inputRef.current?.focus()
      }, 1500)
    } catch (error: any) {
      setValidationResult({
        result: 'invalid',
        reason: 'not_found',
        message: error.message || 'Validation failed',
      })
      setTimeout(() => {
        setValidationResult(null)
      }, 2000)
    } finally {
      setIsValidating(false)
    }
  }, [selectedEventId, entryCode, isValidating, isOffline, token])

  // Handle event mismatch confirmation
  const handleAdmitAnyway = useCallback(async () => {
    if (!validationResult || 'status' in validationResult || !validationResult.event_mismatch) {
      return
    }

    // Get qr_token_raw from the pending validation or result
    const qrToken = validationResult.qr_token_raw
    if (!qrToken) {
      return
    }

    setIsValidating(true)

    try {
      const { data, error } = await validateTicketScan(
        {
          ticketed_event_id: selectedEventId!,
          qr_token_raw: qrToken,
        },
        token,
      )

      if (error || !data) {
        setValidationResult({
          result: 'invalid',
          reason: 'not_found',
          message: error?.message || 'Validation failed',
        })
        return
      }

      setValidationResult(data)

      // Update order context
      if (data.order_context && data.order_context.remaining_active > 0) {
        setOrderContext(data.order_context)
      } else {
        setOrderContext(null)
      }

      // Update counts
      if (data.validated_count !== undefined) {
        setSessionCounts((prev) => ({
          ...prev,
          validated: data.validated_count || 0,
          remainingCapacity: data.remaining_capacity ?? null,
        }))
      }

      // Add to history
      setValidationHistory((prev) => [
        {
          timestamp: new Date(),
          code: qrToken.slice(-8),
          result: data.result,
          message: data.message,
          ticketTypeName: data.ticket_type_name || undefined,
        },
        ...prev.slice(0, 49),
      ])

      setTimeout(() => {
        setValidationResult(null)
        scannerRef.current?.resume()
      }, 1500)
    } catch (error: any) {
      setValidationResult({
        result: 'invalid',
        reason: 'not_found',
        message: error.message || 'Validation failed',
      })
    } finally {
      setIsValidating(false)
    }
  }, [validationResult, selectedEventId, token])

  // Handle "Validate Next" for multi-ticket orders
  const handleValidateNext = useCallback(async () => {
    if (!orderContext?.next_ticket_id) {
      return
    }

    setIsValidating(true)

    try {
      // Note: This would require a new endpoint validateTicketById
      // For now, we'll use the existing endpoint with a workaround
      // In a real implementation, you'd call: validateTicketById({ ticket_id: orderContext.next_ticket_id })
      
      // For now, just clear the order context and let user scan/enter next ticket
      setOrderContext(null)
      setValidationResult(null)
    } catch (error: any) {
      setValidationResult({
        result: 'invalid',
        reason: 'not_found',
        message: error.message || 'Validation failed',
      })
    } finally {
      setIsValidating(false)
    }
  }, [orderContext])

  // Handle offline retry
  useEffect(() => {
    if (!isOffline && pendingValidation) {
      handleManualSubmit()
    }
  }, [isOffline, pendingValidation, handleManualSubmit])

  // Handle Enter key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        handleManualSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleManualSubmit])

  const currentEvent = token
    ? staffLinkSession
      ? { id: staffLinkSession.ticketed_event_id, title: staffLinkSession.event_title }
      : null
    : selectedEventId
      ? eventList.find((event: any) => event.id === selectedEventId) || (
        directEventId && selectedEventId === directEventId
          ? { id: directEventId, title: `Event ${directEventId.slice(0, 8)}` }
          : null
      )
      : null

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#111418] dark:text-white mb-2 uppercase tracking-tight">
            {t('ticketing.scanner.title')}
          </h1>
          {isOffline && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 mb-3 md:mb-4">
              <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
                <strong>{t('ticketing.scanner.connectionLost')}</strong> {t('ticketing.scanner.connectionLostDesc')}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {pendingCount} validation{pendingCount !== 1 ? 's' : ''} queued for sync
                </p>
              )}
            </div>
          )}
          
          {showWarning && heapSize !== null && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-sm sm:text-base text-orange-800 dark:text-orange-200">
                <strong>High memory usage:</strong> {heapSize}MB used. Consider refreshing the page.
              </p>
              <button
                onClick={dismissWarning}
                className="text-sm sm:text-base px-3 py-1.5 sm:px-0 sm:py-0 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Event Selector (admin route only) */}
        {!token && !directEventId && eventList.length > 0 && (
          <div className="mb-4 md:mb-6">
            <label className="block text-sm sm:text-base font-medium text-[#111418] dark:text-white mb-2">
              {t('ticketing.scanner.selectEvent')}
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 sm:py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[#111418] dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec]"
            >
              <option value="">{t('ticketing.scanner.chooseEvent')}</option>
              {eventList.map((event: any) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fixed Event Display (staff link or event-specific admin route) */}
        {(token || directEventId) && currentEvent && (
          <div className="mb-4 md:mb-6 bg-[#137fec]/10 border border-[#137fec]/20 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-[#137fec] font-medium">{t('ticketing.scanner.validatingFor')}</p>
            <p className="text-base sm:text-lg font-bold text-[#111418] dark:text-white">{currentEvent.title}</p>
          </div>
        )}

        {!selectedEventId && !token && (
          <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-gray-500">
            {t('ticketing.scanner.selectEventPrompt')}
          </div>
        )}

        {(selectedEventId || token) && (
          <>
            {/* Main scanner area - mobile-first responsive layout */}
            <div className="mb-4 md:mb-6 flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6">
              {/* Camera section */}
              <section className="order-1">
                <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm overflow-hidden">
                  <QRCodeScanner
                    ref={scannerRef}
                    onScan={handleQRScan}
                    onError={(error) => {
                      console.warn('Camera error:', error)
                    }}
                    isEnabled={!!selectedEventId && !isValidating}
                  />
                </div>
              </section>

              {/* Manual entry section */}
              <section className="order-2">
                <form onSubmit={handleManualSubmit} className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-4 sm:p-5 md:p-6">
                  <label className="block text-sm sm:text-base font-medium text-[#111418] dark:text-white mb-3">
                    Manual Entry
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={entryCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className="flex-1 text-xl sm:text-2xl font-mono text-center px-3 sm:px-4 py-4 sm:py-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-[#111418] dark:text-white focus:ring-2 focus:ring-[#137fec] focus:border-[#137fec] uppercase tracking-wider min-h-[56px]"
                      maxLength={14} // XXXX-XXXX-XXXX
                      disabled={!selectedEventId || isValidating || isOffline}
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                    <button
                      type="submit"
                      disabled={!selectedEventId || !entryCode.trim() || isValidating || isOffline}
                      className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-[#137fec] text-white font-black text-base sm:text-lg rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors uppercase tracking-wider shadow-[0_8px_15px_-3px_rgba(19,127,236,0.3),0_4px_6px_-2px_rgba(19,127,236,0.05)] min-h-[56px]"
                    >
                      {isValidating ? 'Validating...' : 'Validate'}
                    </button>
                  </div>
                  {pendingValidation && (
                    <p className="mt-2 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                      Queued for validation when connection is restored...
                    </p>
                  )}
                </form>
              </section>
            </div>

            {/* Validation result overlay */}
            {validationResult && (
              <ValidationResultBanner
                result={validationResult}
                onAdmitAnyway={'event_mismatch' in validationResult && validationResult.event_mismatch ? handleAdmitAnyway : undefined}
                onDismiss={() => {
                  setValidationResult(null)
                  scannerRef.current?.resume()
                }}
              />
            )}

            {/* Order context panel */}
            {orderContext && !validationResult && (
              <OrderContextPanel
                context={orderContext}
                onValidateNext={handleValidateNext}
              />
            )}

            {/* Session Counts */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 md:mb-6">
              <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-[#617589] dark:text-gray-400">{t('ticketing.scanner.validatedThisSession')}</p>
                <p className="text-2xl sm:text-3xl font-black text-[#111418] dark:text-white">{sessionCounts.validated}</p>
              </div>
              {sessionCounts.remainingCapacity !== null && (
                <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-[#617589] dark:text-gray-400">{t('ticketing.scanner.remainingCapacity')}</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#111418] dark:text-white">{sessionCounts.remainingCapacity}</p>
                </div>
              )}
            </div>

            {/* Validation History */}
            {validationHistory.length > 0 && (
              <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-black text-[#111418] dark:text-white mb-3 uppercase tracking-tight">
                  {t('ticketing.scanner.recentScans')}
                </h3>
                <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
                  {validationHistory.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 p-2.5 sm:p-2 rounded-lg ${
                        result.result === 'valid'
                          ? 'bg-[#10b981]/10'
                          : result.result === 'already_used'
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-mono text-sm sm:text-base font-bold text-[#111418] dark:text-white">{result.code}</span>
                        <span className="text-xs sm:text-sm text-[#617589] dark:text-gray-400">
                          {result.ticketTypeName && `(${result.ticketTypeName})`}
                        </span>
                      </div>
                      <div className="text-xs text-[#617589] dark:text-gray-500 sm:text-right">
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
