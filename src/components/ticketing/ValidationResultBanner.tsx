/**
 * ValidationResultBanner Component
 * 
 * Displays ticket validation results with audio and haptic feedback.
 * Shows immediate feedback while validation is in progress.
 */

import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import type { ValidateScanResponse } from '@/types/ticketing'
import { playSound } from '@/utils/audio'
import { triggerHaptic } from '@/utils/haptics'
import { useT } from '@/i18n/useI18n'

interface ValidationResultBannerProps {
  result: ValidateScanResponse | { status: 'validating'; code?: string }
  onAdmitAnyway?: () => void
  onDismiss: () => void
}

/**
 * ValidationResultBanner Component
 * 
 * Shows validation results with appropriate visual, audio, and haptic feedback.
 */
export function ValidationResultBanner({ result, onAdmitAnyway, onDismiss }: ValidationResultBannerProps) {
  const t = useT()
  
  // Audio and haptic feedback
  useEffect(() => {
    if ('status' in result && result.status === 'validating') {
      return // No feedback during validation
    }

    const scanResult = result as ValidateScanResponse

    switch (scanResult.result) {
      case 'valid':
        playSound('success')
        triggerHaptic('success')
        break
      case 'invalid':
      case 'not_found':
        playSound('error')
        triggerHaptic('error')
        break
      case 'already_used':
        playSound('duplicate')
        triggerHaptic('warning')
        break
      // 'wrong_event' - no sound (requires user decision)
    }
  }, [result])

  // Render based on status
  if ('status' in result && result.status === 'validating') {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin" />
          <div>
            <p className="text-xl font-bold mb-1">Validating...</p>
            {result.code && (
              <p className="text-sm opacity-90">Code: {result.code}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const scanResult = result as ValidateScanResponse

  if (scanResult.result === 'valid') {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-green-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] text-center animate-slide-in">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-12 h-12" />
          <div>
            <p className="text-xl font-bold mb-1">Valid Ticket</p>
            {scanResult.ticket_type_name && (
              <p className="text-lg opacity-90">{scanResult.ticket_type_name}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (scanResult.result === 'invalid' || scanResult.result === 'not_found') {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] text-center animate-slide-in">
        <div className="flex flex-col items-center gap-3">
          <XCircle className="w-12 h-12" />
          <div>
            <p className="text-xl font-bold mb-1">Invalid Ticket</p>
            {scanResult.message && (
              <p className="text-sm opacity-90">{scanResult.message}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (scanResult.result === 'already_used') {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-amber-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] text-center animate-slide-in">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-12 h-12" />
          <div>
            <p className="text-xl font-bold mb-1">Already Used</p>
            {scanResult.used_at && (
              <p className="text-sm opacity-90">
                Scanned at {new Date(scanResult.used_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (scanResult.result === 'wrong_event' || scanResult.event_mismatch) {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-orange-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] max-w-md text-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-12 h-12" />
          <div>
            <p className="text-xl font-bold mb-2">{t('ticketing.validation.differentEvent')}</p>
            {scanResult.ticket_event_name && (
              <p className="text-sm opacity-90 mb-1">
                {t('ticketing.validation.ticketForEvent')} <strong>{scanResult.ticket_event_name}</strong>
              </p>
            )}
            {scanResult.selected_event_name && (
              <p className="text-sm opacity-90 mb-4">
                {t('ticketing.validation.currentlyScanning')} {scanResult.selected_event_name}
              </p>
            )}
            {scanResult.message && !scanResult.ticket_event_name && (
              <p className="text-sm opacity-90 mb-4">{scanResult.message}</p>
            )}
            {onAdmitAnyway && (
              <div className="flex gap-3 mt-4 justify-center">
                <button
                  onClick={onAdmitAnyway}
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                  {t('ticketing.validation.admitAnyway')}
                </button>
                <button
                  onClick={onDismiss}
                  className="bg-orange-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-800 transition-colors"
                >
                  {t('ticketing.validation.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unknown result types
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-600 text-white px-8 py-6 rounded-xl shadow-2xl min-w-[300px] text-center animate-slide-in">
      <div className="flex flex-col items-center gap-3">
        <AlertCircle className="w-12 h-12" />
        <div>
          <p className="text-xl font-bold mb-1">Validation Result</p>
          {scanResult.message && (
            <p className="text-sm opacity-90">{scanResult.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
