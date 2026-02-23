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
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

interface ValidationResult {
  timestamp: Date
  code: string
  result: TicketScanResult
  message?: string
  ticketTypeName?: string
}

type ScannerMode = 'physical' | 'camera'

type ScannerEventSummary = {
  id: string
  title?: string | null
  event_id?: string | null
}

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function TicketScanner() {
  useDebugLifecycle('TicketScanner')
  
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

  const currentEvent: ScannerEventSummary | null = token
    ? staffLinkSession
      ? {
        id: staffLinkSession.ticketed_event_id,
        title: staffLinkSession.event_title,
        event_id: staffLinkSession.event_id ?? null,
      }
      : null
    : selectedEventId
      ? (eventList.find((event: ScannerEventSummary) => event.id === selectedEventId) as ScannerEventSummary | undefined) || null
      : null
  const currentEventAdminDetailPath = currentEvent?.event_id
    ? `${getLink('admin.events.detail', { id: currentEvent.event_id })}?view=ticketing`
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
      className="oa-root"
    >
      <AdminPageHeader
        title={t('ticketing.scanner.title')}
        subtitle={t('ticketing.scanner.subtitle')}
        children={
          <>
            {eventsLoading && directEventId ? (
              <div className="oa-mt-4 oa-inline-flex oa-items-center oa-gap-2 oa-rounded-full oa-bg-[var(--pa-surface-panel)] oa-border oa-border-[var(--pa-border-default)] oa-px-3 oa-py-1.5 oa-text-sm">
                <span className="oa-h-4 oa-w-24 oa-rounded oa-bg-[var(--pa-border-default)] oa-animate-pulse" />
                <span className="oa-h-4 oa-w-40 oa-rounded oa-bg-[var(--pa-border-default)] oa-animate-pulse" />
              </div>
            ) : currentEvent && (
              <div className="oa-mt-4 oa-flex oa-flex-wrap oa-items-center oa-gap-2">
                <div className="oa-inline-flex oa-items-center oa-gap-2 oa-rounded-full oa-bg-[var(--pa-surface-panel)] oa-border oa-border-[var(--pa-border-default)] oa-px-3 oa-py-1.5 oa-text-sm">
                  <span className="oa-font-medium" style={{ color: 'var(--scanner-color-secondary)' }}>{t('ticketing.scanner.validatingFor')}</span>
                  {currentEventAdminDetailPath ? (
                    <button
                      type="button"
                      onClick={() => navigate(currentEventAdminDetailPath)}
                      className="oa-font-semibold oa-underline oa-underline-offset-2 oa-text-[var(--pa-text-primary)] hover:oa-text-[var(--scanner-color-secondary-hover)]"
                    >
                      {currentEvent.title}
                    </button>
                  ) : (
                    <span className="oa-font-semibold oa-text-[var(--pa-text-primary)]">{currentEvent.title}</span>
                  )}
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
                    className="oa-inline-flex oa-items-center oa-rounded-full oa-border oa-border-[var(--pa-border-default)] oa-bg-[var(--pa-surface)] oa-px-3 oa-py-1.5 oa-text-sm oa-font-semibold transition-colors"
                    style={{ 
                      color: 'var(--scanner-color-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--pa-text-primary)'
                      e.currentTarget.style.backgroundColor = 'var(--scanner-color-tertiary-bg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--scanner-color-secondary)'
                      e.currentTarget.style.backgroundColor = 'var(--pa-surface)'
                    }}
                  >
                    {t('ticketing.scanner.switchEvents')}
                  </button>
                )}
              </div>
            )}
          </>
        }
      />

        {isOffline && (
          <div className="oa-card oa-mb-4" style={{ 
            background: 'var(--pa-warning-bg)', 
            borderColor: 'var(--pa-warning)', 
            borderWidth: '1px',
            borderStyle: 'solid'
          }}>
            <p className="oa-text-sm sm:oa-text-base" style={{ color: 'var(--pa-warning)' }}>
              <strong>{t('ticketing.scanner.connectionLost')}</strong> {t('ticketing.scanner.connectionLostDesc')}
            </p>
            {pendingCount > 0 && (
              <p className="oa-text-xs sm:oa-text-sm oa-mt-1" style={{ color: 'var(--pa-warning)' }}>
                {t('ticketing.scanner.queuedCount', {
                  count: pendingCount,
                  plural: pendingCount === 1 ? '' : 's',
                })}
              </p>
            )}
          </div>
        )}

        {showWarning && heapSize !== null && (
          <div className="oa-card oa-mb-4 oa-flex oa-flex-col sm:oa-flex-row oa-items-start sm:oa-items-center oa-justify-between oa-gap-2" style={{ 
            background: 'var(--pa-warning-bg)', 
            borderColor: 'var(--pa-warning)', 
            borderWidth: '1px',
            borderStyle: 'solid'
          }}>
            <p className="oa-text-sm sm:oa-text-base" style={{ color: 'var(--pa-warning)' }}>
              <strong>{t('ticketing.scanner.memoryWarningTitle')}</strong> {t('ticketing.scanner.memoryWarningDesc', { heapSize })}
            </p>
            <button
              onClick={dismissWarning}
              className="oa-text-sm sm:oa-text-base oa-px-3 oa-py-1.5 sm:oa-px-0 sm:oa-py-0 oa-whitespace-nowrap transition-colors"
              style={{ color: 'var(--pa-warning)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--pa-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--pa-warning)'
              }}
            >
              {t('ticketing.scanner.dismissMemoryWarning')}
            </button>
          </div>
        )}

        {!token && !directEventId && eventList.length > 0 && (
          <div className="oa-card oa-mb-6">
            <div className="oa-form-group">
              <label className="oa-label" style={{ color: 'var(--scanner-color-secondary)' }}>
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
                className="oa-input oa-select"
              >
                <option value="">{t('ticketing.scanner.chooseEvent')}</option>
                {eventList.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!selectedEventId && !token && (
          <div className="text-center py-10 sm:py-14 text-sm sm:text-base text-[var(--org-text-secondary,#64748b)] bg-[var(--org-surface-card,#fff)] rounded-xl border border-dashed border-[var(--org-border-default,#d1d5db)]">
            {t('ticketing.scanner.selectEventPrompt')}
          </div>
        )}

        {(selectedEventId || token) && (
          <>
            <section className="oa-card oa-mb-6">
              <form onSubmit={handleManualSubmit}>
                <div className="oa-flex oa-flex-wrap oa-items-center oa-justify-between oa-gap-3 oa-mb-3">
                  <label className="oa-text-sm sm:oa-text-base oa-font-bold oa-uppercase oa-tracking-wide" style={{ color: 'var(--scanner-color-secondary)' }}>
                    {t('ticketing.scanner.manualEntry')}
                  </label>
                  <span className="oa-inline-flex oa-items-center oa-rounded-full oa-border oa-border-[var(--pa-border-default)] oa-px-2.5 oa-py-1 oa-text-xs oa-font-semibold" style={{ 
                    backgroundColor: 'var(--scanner-color-tertiary-bg)',
                    color: 'var(--scanner-color-secondary)'
                  }}>
                    {scannerMode === 'physical' ? t('ticketing.scanner.physicalScanner') : t('ticketing.scanner.phoneCamera')}
                  </span>
                </div>
                <div className="oa-flex oa-flex-col sm:oa-flex-row oa-gap-3">
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
                    className="oa-flex-1 oa-text-xl sm:oa-text-2xl oa-font-mono oa-text-center oa-px-3 sm:oa-px-4 oa-py-4 oa-border-2 oa-rounded-lg oa-bg-[var(--pa-surface)] oa-text-[var(--pa-text-primary)] oa-uppercase oa-tracking-wider oa-min-h-[56px] oa-transition-all oa-input"
                    style={{
                      borderColor: 'var(--pa-border-default)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--scanner-color-tertiary)'
                      e.currentTarget.style.boxShadow = `0 0 0 2px var(--scanner-color-tertiary-bg)`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--pa-border-default)'
                      e.currentTarget.style.boxShadow = 'none'
                      if (scannerMode === 'physical' && !isValidating && !isOffline) {
                        window.setTimeout(() => inputRef.current?.focus(), 0)
                      }
                    }}
                    maxLength={14}
                    disabled={!selectedEventId || isValidating || isOffline}
                    autoComplete="off"
                    autoCapitalize="characters"
                    aria-label={t('ticketing.scanner.manualEntry')}
                  />
                  <button
                    type="submit"
                    disabled={!selectedEventId || !entryCode.trim() || isValidating || isOffline}
                    className="oa-w-full sm:oa-w-auto oa-px-6 sm:oa-px-8 oa-py-4 oa-font-black oa-text-base sm:oa-text-lg oa-rounded-lg oa-transition-colors oa-uppercase oa-tracking-wider oa-shadow-sm oa-min-h-[56px] oa-btn oa-btn-primary"
                    style={{
                      backgroundColor: 'var(--scanner-color-primary)',
                      color: 'var(--scanner-color-on-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = 'var(--scanner-color-primary-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = 'var(--scanner-color-primary)'
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = 'var(--scanner-color-primary-active)'
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = 'var(--scanner-color-primary-hover)'
                      }
                    }}
                  >
                    {isValidating ? t('ticketing.scanner.validating') : t('ticketing.scanner.validate')}
                  </button>
                </div>
                {pendingValidation && (
                  <p className="oa-mt-2 oa-text-xs sm:oa-text-sm" style={{ color: 'var(--pa-warning)' }}>
                    {t('ticketing.scanner.queuedForValidation')}
                  </p>
                )}
              </form>
            </section>

            <div className="oa-grid oa-grid-cols-1 xl:oa-grid-cols-12 oa-gap-4 md:oa-gap-6">
              <section className="xl:oa-col-span-7 oa-space-y-4">
                <div className="oa-card">
                  <div className="oa-flex oa-flex-col sm:oa-flex-row sm:oa-items-center sm:oa-justify-between oa-gap-3 oa-mb-3">
                    <p className="oa-text-xs sm:oa-text-sm oa-font-semibold oa-uppercase oa-tracking-wide" style={{ color: 'var(--scanner-color-secondary)' }}>
                      {t('ticketing.scanner.scannerMode')}
                    </p>
                    <div className="oa-inline-flex oa-rounded-lg oa-bg-[var(--pa-surface-panel)] oa-p-1 oa-border oa-border-[var(--pa-border-default)]">
                      <button
                        type="button"
                        onClick={() => setScannerMode('physical')}
                        className={`oa-px-3 sm:oa-px-4 oa-py-2 oa-text-sm oa-font-semibold oa-rounded-md oa-transition-colors ${
                          scannerMode === 'physical'
                            ? 'oa-bg-[var(--pa-surface)] oa-shadow-sm'
                            : 'oa-text-[var(--pa-text-secondary)]'
                        }`}
                        style={scannerMode === 'physical' ? {
                          color: 'var(--scanner-color-primary)',
                          borderBottom: '2px solid var(--scanner-color-secondary)'
                        } : {}}
                        onMouseEnter={(e) => {
                          if (scannerMode !== 'physical') {
                            e.currentTarget.style.color = 'var(--scanner-color-secondary-hover)'
                            e.currentTarget.style.backgroundColor = 'var(--scanner-color-tertiary-bg)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (scannerMode !== 'physical') {
                            e.currentTarget.style.color = 'var(--pa-text-secondary)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
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
                        className={`oa-px-3 sm:oa-px-4 oa-py-2 oa-text-sm oa-font-semibold oa-rounded-md oa-transition-colors ${
                          scannerMode === 'camera'
                            ? 'oa-bg-[var(--pa-surface)] oa-shadow-sm'
                            : 'oa-text-[var(--pa-text-secondary)]'
                        }`}
                        style={scannerMode === 'camera' ? {
                          color: 'var(--scanner-color-primary)',
                          borderBottom: '2px solid var(--scanner-color-secondary)'
                        } : {}}
                        onMouseEnter={(e) => {
                          if (scannerMode !== 'camera') {
                            e.currentTarget.style.color = 'var(--scanner-color-secondary-hover)'
                            e.currentTarget.style.backgroundColor = 'var(--scanner-color-tertiary-bg)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (scannerMode !== 'camera') {
                            e.currentTarget.style.color = 'var(--pa-text-secondary)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                        aria-pressed={scannerMode === 'camera'}
                      >
                        {t('ticketing.scanner.phoneCamera')}
                      </button>
                    </div>
                  </div>

                  <p className="oa-text-sm oa-text-[var(--pa-text-secondary)] oa-mb-4">
                    {scannerMode === 'physical'
                      ? t('ticketing.scanner.modePhysicalDescription')
                      : t('ticketing.scanner.modeCameraDescription')}
                  </p>

                  {scannerMode === 'physical' ? (
                    <div className="oa-rounded-xl oa-border oa-p-4" style={{
                      borderColor: 'var(--scanner-color-tertiary)',
                      backgroundColor: 'var(--scanner-color-tertiary-bg)'
                    }}>
                      <p className="oa-text-sm oa-font-bold oa-text-[var(--pa-text-primary)] oa-mb-1">
                        {t('ticketing.scanner.physicalReadyTitle')}
                      </p>
                      <p className="oa-text-xs sm:oa-text-sm oa-text-[var(--pa-text-secondary)]">
                        {t('ticketing.scanner.physicalReadyDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="oa-space-y-3">
                      {!isCameraOpen ? (
                        <div className="oa-rounded-xl oa-border oa-border-dashed oa-p-5 oa-text-center" style={{
                          borderColor: 'var(--scanner-color-tertiary)',
                          backgroundColor: 'var(--scanner-color-tertiary-bg)'
                        }}>
                          <p className="oa-text-sm oa-font-semibold oa-text-[var(--pa-text-primary)] oa-mb-1">
                            {t('ticketing.scanner.cameraReadyTitle')}
                          </p>
                          <p className="oa-text-xs sm:oa-text-sm oa-text-[var(--pa-text-secondary)] oa-mb-4">
                            {t('ticketing.scanner.cameraReadyDesc')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              unlockAudio()
                              setIsCameraOpen(true)
                            }}
                            className="oa-inline-flex oa-items-center oa-justify-center oa-px-5 oa-py-2.5 oa-border oa-border-[var(--pa-border-default)] oa-bg-[var(--pa-surface)] oa-text-[var(--pa-text-primary)] oa-font-bold oa-rounded-lg oa-transition-colors oa-btn oa-btn-secondary"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--scanner-color-tertiary-bg)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--pa-surface)'
                            }}
                          >
                            {t('ticketing.scanner.openCamera')}
                          </button>
                        </div>
                      ) : (
                        <div className="oa-rounded-xl oa-overflow-hidden oa-border oa-border-[var(--pa-border-default)]">
                          <div className="oa-flex oa-items-center oa-justify-between oa-px-3 oa-py-2 oa-bg-[var(--pa-surface-panel)] oa-border-b oa-border-[var(--pa-border-default)]">
                            <p className="oa-text-xs sm:oa-text-sm oa-font-semibold" style={{ color: 'var(--scanner-color-secondary)' }}>
                              {t('ticketing.scanner.cameraHint')}
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsCameraOpen(false)}
                              className="oa-text-xs sm:oa-text-sm oa-font-semibold transition-colors"
                              style={{ color: 'var(--scanner-color-secondary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--scanner-color-secondary-hover)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--scanner-color-secondary)'
                              }}
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

              <aside className="xl:oa-col-span-5 oa-space-y-4">
                <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 xl:oa-grid-cols-1 oa-gap-3 sm:oa-gap-4">
                  <div className="oa-card">
                    <p className="oa-text-xs sm:oa-text-sm" style={{ color: 'var(--scanner-color-secondary)' }}>{t('ticketing.scanner.validatedThisSession')}</p>
                    <p className="oa-text-3xl oa-font-black oa-mt-1" style={{ color: 'var(--scanner-color-primary)' }}>{sessionCounts.validated}</p>
                  </div>
                  {sessionCounts.remainingCapacity !== null && (
                    <div className="oa-card">
                      <p className="oa-text-xs sm:oa-text-sm" style={{ color: 'var(--scanner-color-secondary)' }}>{t('ticketing.scanner.remainingCapacity')}</p>
                      <p className="oa-text-3xl oa-font-black oa-mt-1" style={{ color: 'var(--scanner-color-primary)' }}>{sessionCounts.remainingCapacity}</p>
                    </div>
                  )}
                </div>

                <div className="oa-card">
                  <h3 className="oa-text-base sm:oa-text-lg oa-font-black oa-mb-3 oa-uppercase oa-tracking-tight" style={{ color: 'var(--scanner-color-secondary)' }}>
                    {t('ticketing.scanner.recentScans')}
                  </h3>
                  {validationHistory.length === 0 ? (
                    <p className="oa-text-sm oa-text-[var(--pa-text-secondary)]">{t('ticketing.scanner.noScansYet')}</p>
                  ) : (
                    <div className="oa-space-y-2 oa-max-h-72 sm:oa-max-h-96 oa-overflow-y-auto">
                      {validationHistory.map((result, idx) => (
                        <div
                          key={idx}
                          className={`oa-flex oa-flex-col sm:oa-flex-row sm:oa-items-center oa-justify-between oa-gap-1 sm:oa-gap-3 oa-p-2.5 oa-rounded-lg`}
                          style={{
                            backgroundColor: result.result === 'valid' 
                              ? 'var(--pa-success-bg)'
                              : result.result === 'already_used'
                              ? 'var(--pa-warning-bg)'
                              : 'var(--pa-danger-bg)'
                          }}
                        >
                          <div className="oa-flex oa-items-center oa-gap-2 sm:oa-gap-3">
                            <span className="oa-font-mono oa-text-sm sm:oa-text-base oa-font-bold oa-text-[var(--pa-text-primary)]">{result.code}</span>
                            <span className="oa-text-xs sm:oa-text-sm oa-text-[var(--pa-text-secondary)]">
                              {result.ticketTypeName && `(${result.ticketTypeName})`}
                            </span>
                          </div>
                          <div className="oa-text-xs oa-text-[var(--pa-text-muted)] sm:oa-text-right">
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
  )
}
