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
import { getLink, RouteKeys } from '@/utils/routes'
import type { ValidateScanResponse, TicketScanResult, OrderContext } from '@/types/ticketing'
import { QRCodeScanner, type QRCodeScannerHandle } from '@/components/ticketing/QRCodeScanner'
import { ValidationResultBanner } from '@/components/ticketing/ValidationResultBanner'
import { OrderContextPanel } from '@/components/ticketing/OrderContextPanel'
import { queueValidation } from '@/features/tickets/utils/offlineQueue'
import { useMemoryMonitor } from '@/features/tickets/hooks/useMemoryMonitor'
import { unlockAudio } from '@/utils/audio'

interface ValidationResult {
  timestamp: Date
  code: string
  result: TicketScanResult
  message?: string
  ticketTypeName?: string
}

type ScannerMode = 'physical' | 'camera'

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
  const [scannerMode, setScannerMode] = useState<ScannerMode>('physical')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
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
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['ticketed-events', 'published', 'scanner'],
    queryFn: () => getTicketedEvents({ status: 'published', upcoming_only: true }),
    enabled: !token, // Only load if admin route
  })
  const eventsAny = events as any
  const eventList = Array.isArray(eventsAny) ? eventsAny : eventsAny?.data || []

  // Auto-focus input
  useEffect(() => {
    if (scannerMode === 'physical' && inputRef.current && !validationResult && !isValidating && !isOffline) {
      inputRef.current.focus()
    }
  }, [scannerMode, validationResult, isValidating, isOffline])

  useEffect(() => {
    if (scannerMode === 'physical' && isCameraOpen) {
      setIsCameraOpen(false)
    }
  }, [scannerMode, isCameraOpen])

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
          message: error?.message || t('ticketing.validation.validationFailed'),
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
        message: error.message || t('ticketing.validation.validationFailed'),
      })
      setTimeout(() => {
        setValidationResult(null)
        scannerRef.current?.resume()
      }, 2000)
    } finally {
      setIsValidating(false)
    }
  }, [selectedEventId, isValidating, token, t])

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
          message: error?.message || t('ticketing.validation.validationFailed'),
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
        message: error.message || t('ticketing.validation.validationFailed'),
      })
      setTimeout(() => {
        setValidationResult(null)
      }, 2000)
    } finally {
      setIsValidating(false)
    }
  }, [selectedEventId, entryCode, isValidating, isOffline, token, t])

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
          force_validate: true,
          cross_event_admission: true,
        },
        token,
      )

      if (error || !data) {
        setValidationResult({
          result: 'invalid',
          reason: 'not_found',
          message: error?.message || t('ticketing.validation.validationFailed'),
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
        message: error.message || t('ticketing.validation.validationFailed'),
      })
    } finally {
      setIsValidating(false)
    }
  }, [validationResult, selectedEventId, token, t])

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
        message: error.message || t('ticketing.validation.validationFailed'),
      })
    } finally {
      setIsValidating(false)
    }
  }, [orderContext, t])

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
      ? eventList.find((event: any) => event.id === selectedEventId) || null
      : null

  const scannerColorRoles = {
    '--scanner-color-primary': 'var(--org-color-primary, var(--org-btn-primary-bg))',
    '--scanner-color-primary-hover': 'var(--org-btn-primary-hover)',
    '--scanner-color-primary-active': 'var(--org-btn-primary-active)',
    '--scanner-color-on-primary': 'var(--org-btn-primary-text)',
    '--scanner-color-secondary': 'var(--org-color-secondary, var(--org-link-color))',
    '--scanner-color-secondary-hover': 'var(--org-color-tertiary, var(--org-link-hover))',
    '--scanner-color-tertiary': 'var(--org-color-tertiary, var(--org-border-active))',
    '--scanner-color-tertiary-bg': 'color-mix(in srgb, var(--org-color-tertiary, #64748b) 14%, transparent)',
  } as React.CSSProperties

  return (
    <div
      style={scannerColorRoles}
      className="min-h-screen bg-[var(--org-surface-page,#f6f7f8)] text-[var(--org-text-primary,#111418)] p-3 sm:p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6 rounded-2xl border border-[var(--org-border-default,#dce7f6)] bg-[var(--org-surface-card,#fff)] p-4 sm:p-6 shadow-sm">
          <div className="h-1.5 w-16 rounded-full bg-[var(--scanner-color-secondary)] mb-4" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--org-text-primary,#111418)] uppercase tracking-tight">
            {t('ticketing.scanner.title')}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--org-text-secondary,#617589)]">
            {t('ticketing.scanner.subtitle')}
          </p>
          {eventsLoading && directEventId ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--org-surface-card-header,#f3f4f6)] border border-[var(--org-border-default,#dce7f6)] px-3 py-1.5 text-sm">
              <span className="h-4 w-24 rounded bg-[var(--org-border-default,#dce7f6)] animate-pulse" />
              <span className="h-4 w-40 rounded bg-[var(--org-border-default,#dce7f6)] animate-pulse" />
            </div>
          ) : currentEvent && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--org-surface-card-header,#f3f4f6)] border border-[var(--org-border-default,#dce7f6)] px-3 py-1.5 text-sm">
                <span className="font-medium text-[var(--scanner-color-secondary)]">{t('ticketing.scanner.validatingFor')}</span>
                <span className="font-semibold text-[var(--org-text-primary,#111418)]">{currentEvent.title}</span>
              </div>
              {!token && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(null)
                    setValidationResult(null)
                    setOrderContext(null)
                    setEntryCode('')
                    setScannerMode('physical')
                    setIsCameraOpen(false)
                    navigate(getLink(RouteKeys.ADMIN_TICKETING_SCANNER))
                  }}
                  className="inline-flex items-center rounded-full border border-[var(--org-border-default,#dce7f6)] bg-[var(--org-surface-card,#fff)] px-3 py-1.5 text-sm font-semibold text-[var(--scanner-color-secondary)] hover:text-[var(--scanner-color-secondary-hover)] hover:bg-[var(--scanner-color-tertiary-bg)] transition-colors"
                >
                  {t('ticketing.scanner.switchEvents')}
                </button>
              )}
            </div>
          )}
        </div>

        {isOffline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 sm:p-4 mb-3 md:mb-4">
            <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
              <strong>{t('ticketing.scanner.connectionLost')}</strong> {t('ticketing.scanner.connectionLostDesc')}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t('ticketing.scanner.queuedCount', {
                  count: pendingCount,
                  plural: pendingCount === 1 ? '' : 's',
                })}
              </p>
            )}
          </div>
        )}

        {showWarning && heapSize !== null && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 sm:p-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-sm sm:text-base text-orange-800 dark:text-orange-200">
              <strong>{t('ticketing.scanner.memoryWarningTitle')}</strong> {t('ticketing.scanner.memoryWarningDesc', { heapSize })}
            </p>
            <button
              onClick={dismissWarning}
              className="text-sm sm:text-base px-3 py-1.5 sm:px-0 sm:py-0 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 whitespace-nowrap"
            >
              {t('ticketing.scanner.dismissMemoryWarning')}
            </button>
          </div>
        )}

        {!token && !directEventId && eventList.length > 0 && (
          <div className="mb-4 md:mb-6 rounded-xl border border-[var(--org-border-default,#dce7f6)] bg-[var(--org-surface-card,#fff)] p-4 shadow-sm">
            <label className="block text-sm sm:text-base font-medium text-[var(--scanner-color-secondary)] mb-2">
              {t('ticketing.scanner.selectEvent')}
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => {
                const nextEventId = e.target.value
                setSelectedEventId(nextEventId || null)
                navigate(
                  nextEventId
                    ? getLink(RouteKeys.ADMIN_TICKETING_SCANNER_EVENT, { eventId: nextEventId })
                    : getLink(RouteKeys.ADMIN_TICKETING_SCANNER),
                )
              }}
              className="w-full px-3 sm:px-4 py-3 sm:py-2.5 text-base border border-[var(--org-border-default,#d1d5db)] rounded-lg bg-[var(--org-surface-primary,#fff)] text-[var(--org-text-primary,#111418)] focus:ring-2 focus:ring-[var(--scanner-color-tertiary-bg)] focus:border-[var(--scanner-color-tertiary)]"
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

        {!selectedEventId && !token && (
          <div className="text-center py-10 sm:py-14 text-sm sm:text-base text-[var(--org-text-secondary,#64748b)] bg-[var(--org-surface-card,#fff)] rounded-xl border border-dashed border-[var(--org-border-default,#d1d5db)]">
            {t('ticketing.scanner.selectEventPrompt')}
          </div>
        )}

        {(selectedEventId || token) && (
          <>
            <section className="mb-4 md:mb-6 rounded-2xl border border-[var(--org-border-default,#dce7f6)] bg-[var(--org-surface-card,#fff)] p-4 sm:p-5 md:p-6 shadow-sm">
              <form onSubmit={handleManualSubmit}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <label className="text-sm sm:text-base font-bold text-[var(--scanner-color-secondary)] uppercase tracking-wide">
                    {t('ticketing.scanner.manualEntry')}
                  </label>
                  <span className="inline-flex items-center rounded-full border border-[var(--org-border-default,#dce7f6)] bg-[var(--scanner-color-tertiary-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--scanner-color-secondary)]">
                    {scannerMode === 'physical' ? t('ticketing.scanner.physicalScanner') : t('ticketing.scanner.phoneCamera')}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={entryCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onBlur={() => {
                      if (scannerMode === 'physical' && !isValidating && !isOffline) {
                        window.setTimeout(() => inputRef.current?.focus(), 0)
                      }
                    }}
                    placeholder={t('ticketing.scanner.entryCodePlaceholder')}
                    className="flex-1 text-xl sm:text-2xl font-mono text-center px-3 sm:px-4 py-4 border-2 border-[var(--org-border-default,#c9daee)] rounded-lg bg-[var(--org-surface-primary,#fff)] text-[var(--org-text-primary,#111418)] focus:ring-2 focus:ring-[var(--scanner-color-tertiary-bg)] focus:border-[var(--scanner-color-tertiary)] uppercase tracking-wider min-h-[56px] transition-all"
                    maxLength={14}
                    disabled={!selectedEventId || isValidating || isOffline}
                    autoComplete="off"
                    autoCapitalize="characters"
                    aria-label={t('ticketing.scanner.manualEntry')}
                  />
                  <button
                    type="submit"
                    disabled={!selectedEventId || !entryCode.trim() || isValidating || isOffline}
                    className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-[var(--scanner-color-primary)] text-[var(--scanner-color-on-primary)] font-black text-base sm:text-lg rounded-lg hover:bg-[var(--scanner-color-primary-hover)] active:bg-[var(--scanner-color-primary-active)] disabled:bg-[var(--org-btn-disabled-bg,#94a3b8)] disabled:text-[var(--org-btn-disabled-text,#e2e8f0)] disabled:cursor-not-allowed transition-colors uppercase tracking-wider shadow-sm min-h-[56px]"
                  >
                    {isValidating ? t('ticketing.scanner.validating') : t('ticketing.scanner.validate')}
                  </button>
                </div>
                {pendingValidation && (
                  <p className="mt-2 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                    {t('ticketing.scanner.queuedForValidation')}
                  </p>
                )}
              </form>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
              <section className="xl:col-span-7 space-y-4">
                <div className="rounded-2xl border border-[var(--org-border-default,#dce7f6)] bg-[var(--org-surface-card,#fff)] p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-[var(--scanner-color-secondary)]">
                      {t('ticketing.scanner.scannerMode')}
                    </p>
                    <div className="inline-flex rounded-lg bg-[var(--org-surface-card-header,#eef4fc)] p-1 border border-[var(--org-border-default,#dce7f6)]">
                      <button
                        type="button"
                        onClick={() => setScannerMode('physical')}
                        className={`px-3 sm:px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                          scannerMode === 'physical'
                            ? 'bg-[var(--org-surface-primary,#fff)] text-[var(--scanner-color-primary)] shadow-sm border-b-2 border-[var(--scanner-color-secondary)]'
                            : 'text-[var(--org-text-secondary,#64748b)] hover:text-[var(--scanner-color-secondary-hover)] hover:bg-[var(--scanner-color-tertiary-bg)]'
                        }`}
                        aria-pressed={scannerMode === 'physical'}
                      >
                        {t('ticketing.scanner.physicalScanner')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          unlockAudio()
                          setScannerMode('camera')
                        }}
                        className={`px-3 sm:px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                          scannerMode === 'camera'
                            ? 'bg-[var(--org-surface-primary,#fff)] text-[var(--scanner-color-primary)] shadow-sm border-b-2 border-[var(--scanner-color-secondary)]'
                            : 'text-[var(--org-text-secondary,#64748b)] hover:text-[var(--scanner-color-secondary-hover)] hover:bg-[var(--scanner-color-tertiary-bg)]'
                        }`}
                        aria-pressed={scannerMode === 'camera'}
                      >
                        {t('ticketing.scanner.phoneCamera')}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--org-text-secondary,#617589)] mb-4">
                    {scannerMode === 'physical'
                      ? t('ticketing.scanner.modePhysicalDescription')
                      : t('ticketing.scanner.modeCameraDescription')}
                  </p>

                  {scannerMode === 'physical' ? (
                    <div className="rounded-xl border border-[var(--scanner-color-tertiary)] bg-[var(--scanner-color-tertiary-bg)] p-4">
                      <p className="text-sm font-bold text-[var(--org-text-primary,#111418)] mb-1">
                        {t('ticketing.scanner.physicalReadyTitle')}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--org-text-secondary,#617589)]">
                        {t('ticketing.scanner.physicalReadyDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!isCameraOpen ? (
                        <div className="rounded-xl border border-dashed border-[var(--scanner-color-tertiary)] bg-[var(--scanner-color-tertiary-bg)] p-5 text-center">
                          <p className="text-sm font-semibold text-[var(--org-text-primary,#111418)] mb-1">
                            {t('ticketing.scanner.cameraReadyTitle')}
                          </p>
                          <p className="text-xs sm:text-sm text-[var(--org-text-secondary,#617589)] mb-4">
                            {t('ticketing.scanner.cameraReadyDesc')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              unlockAudio()
                              setIsCameraOpen(true)
                            }}
                            className="inline-flex items-center justify-center px-5 py-2.5 border border-[var(--org-btn-secondary-border,#cbd5e1)] bg-[var(--org-btn-secondary-bg,transparent)] text-[var(--org-btn-secondary-text,var(--org-text-primary,#111418))] font-bold rounded-lg hover:bg-[var(--org-btn-secondary-hover,var(--scanner-color-tertiary-bg))] transition-colors"
                          >
                            {t('ticketing.scanner.openCamera')}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden border border-[var(--org-border-default,#dce7f6)]">
                          <div className="flex items-center justify-between px-3 py-2 bg-[var(--org-surface-card-header,#f2f7fe)] border-b border-[var(--org-border-default,#dce7f6)]">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--scanner-color-secondary)]">
                              {t('ticketing.scanner.cameraHint')}
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsCameraOpen(false)}
                              className="text-xs sm:text-sm text-[var(--scanner-color-secondary)] hover:text-[var(--scanner-color-secondary-hover)] font-semibold"
                            >
                              {t('ticketing.scanner.closeCamera')}
                            </button>
                          </div>
                          <QRCodeScanner
                            ref={scannerRef}
                            onScan={handleQRScan}
                            onError={(error) => {
                              console.warn('Camera error:', error)
                            }}
                            isEnabled={Boolean(selectedEventId) && !isValidating && scannerMode === 'camera' && isCameraOpen}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {validationResult && (
                  <ValidationResultBanner
                    result={validationResult}
                    onAdmitAnyway={
                      'event_mismatch' in validationResult &&
                      validationResult.event_mismatch &&
                      Boolean(validationResult.qr_token_raw)
                        ? handleAdmitAnyway
                        : undefined
                    }
                    onDismiss={() => {
                      setValidationResult(null)
                      scannerRef.current?.resume()
                    }}
                  />
                )}

                {orderContext && !validationResult && (
                  <OrderContextPanel
                    context={orderContext}
                    onValidateNext={handleValidateNext}
                  />
                )}
              </section>

              <aside className="xl:col-span-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
                  <div className="bg-[var(--org-surface-card,#fff)] rounded-xl border border-[var(--org-border-default,#dce7f6)] shadow-sm p-4">
                    <p className="text-xs sm:text-sm text-[var(--scanner-color-secondary)]">{t('ticketing.scanner.validatedThisSession')}</p>
                    <p className="text-3xl font-black text-[var(--scanner-color-primary)] mt-1">{sessionCounts.validated}</p>
                  </div>
                  {sessionCounts.remainingCapacity !== null && (
                    <div className="bg-[var(--org-surface-card,#fff)] rounded-xl border border-[var(--org-border-default,#dce7f6)] shadow-sm p-4">
                      <p className="text-xs sm:text-sm text-[var(--scanner-color-secondary)]">{t('ticketing.scanner.remainingCapacity')}</p>
                      <p className="text-3xl font-black text-[var(--scanner-color-primary)] mt-1">{sessionCounts.remainingCapacity}</p>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--org-surface-card,#fff)] rounded-xl border border-[var(--org-border-default,#dce7f6)] shadow-sm p-4">
                  <h3 className="text-base sm:text-lg font-black text-[var(--scanner-color-secondary)] mb-3 uppercase tracking-tight">
                    {t('ticketing.scanner.recentScans')}
                  </h3>
                  {validationHistory.length === 0 ? (
                    <p className="text-sm text-[var(--org-text-secondary,#617589)]">{t('ticketing.scanner.noScansYet')}</p>
                  ) : (
                    <div className="space-y-2 max-h-72 sm:max-h-96 overflow-y-auto">
                      {validationHistory.map((result, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 p-2.5 rounded-lg ${
                            result.result === 'valid'
                              ? 'bg-[#10b981]/10'
                              : result.result === 'already_used'
                              ? 'bg-orange-50 dark:bg-orange-900/20'
                              : 'bg-red-50 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="font-mono text-sm sm:text-base font-bold text-[var(--org-text-primary,#111418)]">{result.code}</span>
                            <span className="text-xs sm:text-sm text-[var(--org-text-secondary,#617589)]">
                              {result.ticketTypeName && `(${result.ticketTypeName})`}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--org-text-muted,#94a3b8)] sm:text-right">
                            {result.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
