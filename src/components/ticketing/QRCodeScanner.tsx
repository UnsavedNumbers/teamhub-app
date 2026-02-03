/**
 * QRCodeScanner Component
 * 
 * Camera-based QR code scanner using html5-qrcode library.
 * Handles camera lifecycle, iOS permissions, adaptive FPS, and cleanup.
 */

import { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, AlertCircle, Loader2, RotateCcw, ArrowDown } from 'lucide-react'
import { useT } from '@/i18n/useI18n'

export interface QRCodeScannerHandle {
  resume: () => void
}

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void
  onError?: (error: string) => void
  isEnabled: boolean
}

/**
 * QRCodeScanner Component
 * 
 * Manages camera lifecycle and QR code scanning with:
 * - iOS permission handling
 * - Adaptive FPS based on device performance
 * - Multiple cleanup triggers
 * - Graceful degradation
 */
export const QRCodeScanner = forwardRef<QRCodeScannerHandle, QRCodeScannerProps>(
  ({ onScan, onError, isEnabled }, ref) => {
    const t = useT()
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerIdRef = useRef(`qr-scanner-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    
    const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle')
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const [fps, setFps] = useState(10)
    const [showManualPrompt, setShowManualPrompt] = useState(false)
    const [lastScanTime, setLastScanTime] = useState(0)
    
    // Refs to prevent double-start issues (React Strict Mode, effect re-runs)
    const isStartingRef = useRef(false)
    const isStoppingRef = useRef(false)
    const mountedRef = useRef(true)
    
    // Detect iOS for special handling
    const isIOS = useMemo(() => {
      if (typeof window === 'undefined') return false
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    }, [])
    
    // Recently scanned tokens (debounce)
    const recentlyScanned = useRef(new Set<string>())
    
    // Performance monitoring for adaptive FPS
    const decodeTimes = useRef<number[]>([])
    
    // Start camera function
    const startCamera = useCallback(async () => {
      // Guard against double-start (Strict Mode, effect re-runs, race conditions)
      if (isStartingRef.current || isStoppingRef.current || scannerRef.current) {
        return
      }
      
      isStartingRef.current = true
      setCameraState('starting')
      
      try {
        // Create scanner instance
        const scanner = new Html5Qrcode(containerIdRef.current)
        scannerRef.current = scanner
        
        // Configuration
        const config = {
          fps: fps,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        }
        
        // Success callback with debounce and performance tracking
        const onScanSuccess = (decodedText: string, result: any) => {
          const decodeTime = result?.decodeDurationInMs || 0
          
          // Track decode times for adaptive FPS
          if (decodeTime > 0) {
            decodeTimes.current.push(decodeTime)
            if (decodeTimes.current.length > 5) {
              decodeTimes.current.shift()
            }
            
            const avgTime = decodeTimes.current.reduce((a, b) => a + b, 0) / decodeTimes.current.length
            if (avgTime > 150 && fps > 5) {
              setFps(5) // Reduce FPS on slow devices
              console.log('Reduced FPS to 5 for performance')
            }
          }
          
          // Debounce: skip if scanned in last 5 seconds
          if (recentlyScanned.current.has(decodedText)) {
            return
          }
          
          // Add to recently scanned with TTL
          recentlyScanned.current.add(decodedText)
          setTimeout(() => {
            recentlyScanned.current.delete(decodedText)
          }, 5000)
          
          // Reset manual prompt timer
          setLastScanTime(Date.now())
          setShowManualPrompt(false)
          
          // Pause scanner during validation
          scanner.pause(true) // true = show paused frame
          
          // Call parent handler
          onScan(decodedText)
        }
        
        // Error callback (ignore "QR not found" - expected during scanning)
        const onScanError = (errorMessage: string) => {
          // Only log actual errors, not "QR code not found"
          if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
            console.warn('Scan error:', errorMessage)
          }
        }
        
        // Start scanning
        await scanner.start(
          { facingMode: facingMode },
          config,
          onScanSuccess,
          onScanError
        )
        
        // Only update state if still mounted
        if (mountedRef.current) {
          setCameraState('active')
          setLastScanTime(Date.now())
        }
        
      } catch (error: any) {
        if (mountedRef.current) {
          setCameraState('error')
          
          // Parse error for user-friendly message
          let errorMessage = 'Camera unavailable'
          if (error?.message?.includes('Permission') || error?.message?.includes('permission')) {
            errorMessage = 'Camera permission denied'
          } else if (error?.message?.includes('NotFound') || error?.message?.includes('not found')) {
            errorMessage = 'No camera found'
          } else if (error?.message?.includes('NotReadable') || error?.message?.includes('in use')) {
            errorMessage = 'Camera in use by another app'
          }
          
          onError?.(errorMessage)
        }
      } finally {
        isStartingRef.current = false
      }
    }, [facingMode, fps, onScan, onError])
    
    // Stop camera function
    const stopCamera = useCallback(async () => {
      // Guard against concurrent stop calls
      if (isStoppingRef.current) {
        return
      }
      
      isStoppingRef.current = true
      
      const scanner = scannerRef.current
      if (scanner) {
        try {
          const state = scanner.getState()
          if (state === Html5QrcodeScannerState.SCANNING || 
              state === Html5QrcodeScannerState.PAUSED) {
            await scanner.stop()
          }
        } catch {
          // Ignore stop errors
        } finally {
          scannerRef.current = null
        }
      }
      
      if (mountedRef.current) {
        setCameraState('idle')
      }
      
      isStoppingRef.current = false
    }, [])
    
    // Resume scanner (called after validation completes)
    const resumeScanner = useCallback(() => {
      const scanner = scannerRef.current
      if (scanner && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
        scanner.resume()
        setLastScanTime(Date.now())
      }
    }, [])
    
    // Expose resume function to parent
    useImperativeHandle(ref, () => ({
      resume: resumeScanner
    }), [resumeScanner])
    
    // Toggle camera facing mode
    const toggleCamera = useCallback(async () => {
      await stopCamera()
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
      // Will restart via useEffect
    }, [stopCamera])
    
    // Manual prompt timer
    useEffect(() => {
      if (cameraState !== 'active') {
        return
      }
      
      const timer = setInterval(() => {
        const timeSinceLastScan = Date.now() - lastScanTime
        if (timeSinceLastScan > 8000 && !showManualPrompt) {
          setShowManualPrompt(true)
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }, [cameraState, lastScanTime, showManualPrompt])
    
    // Track mounted state for cleanup
    useEffect(() => {
      mountedRef.current = true
      return () => {
        mountedRef.current = false
      }
    }, [])
    
    // Start/stop camera based on isEnabled and facingMode
    // Using refs in guards means we don't need startCamera/stopCamera in deps
    useEffect(() => {
      if (isEnabled && !isIOS) {
        // Only start if idle and not already starting/stopping
        if (cameraState === 'idle' && !isStartingRef.current && !isStoppingRef.current) {
          startCamera()
        }
      } else if (!isEnabled && cameraState === 'active') {
        stopCamera()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEnabled, facingMode, isIOS, cameraState])
    
    // Visibility change handler
    useEffect(() => {
      const handleVisibilityChange = () => {
        const scanner = scannerRef.current
        if (!scanner) return
        
        try {
          if (document.visibilityState === 'hidden') {
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
              scanner.pause(true)
            }
          } else {
            if (scanner.getState() === Html5QrcodeScannerState.PAUSED) {
              scanner.resume()
              setLastScanTime(Date.now())
            }
          }
        } catch {
          // Ignore errors
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])
    
    // Beforeunload cleanup
    useEffect(() => {
      const handleBeforeUnload = () => {
        // Synchronous - just clear the ref, browser will release camera
        scannerRef.current = null
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])
    
    // Component unmount cleanup
    useEffect(() => {
      return () => {
        // Mark as unmounted first to prevent state updates
        mountedRef.current = false
        // Then stop camera
        const scanner = scannerRef.current
        if (scanner) {
          try {
            const state = scanner.getState()
            if (state === Html5QrcodeScannerState.SCANNING || 
                state === Html5QrcodeScannerState.PAUSED) {
              scanner.stop().catch(() => {})
            }
          } catch {
            // Ignore errors during cleanup
          }
          scannerRef.current = null
        }
      }
    }, [])
    
    return (
      <div className="qr-scanner-wrapper relative w-full">
        {/* Camera viewport */}
        <div 
          id={containerIdRef.current}
          className="qr-scanner-viewport w-full"
        />
        
        {/* iOS: Explicit start button */}
        {isIOS && cameraState === 'idle' && isEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <button 
              onClick={startCamera} 
              className="bg-[#137fec] text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
              {t('ticketing.scanner.tapToStartCamera')}
            </button>
          </div>
        )}
        
        {/* Starting state */}
        {cameraState === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
            <p className="text-white text-sm">{t('ticketing.scanner.startingCamera')}</p>
          </div>
        )}
        
        {/* Error state */}
        {cameraState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-white text-sm mb-1">{t('ticketing.scanner.cameraUnavailable')}</p>
            <p className="text-gray-400 text-xs">{t('ticketing.scanner.useManualEntry')}</p>
          </div>
        )}
        
        {/* Active scanning indicator */}
        {cameraState === 'active' && (
          <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#137fec] text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 z-10">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('ticketing.scanner.scanning')}
            </div>
            
            {/* Camera flip button */}
            <button 
              onClick={toggleCamera}
              className="absolute top-4 right-4 bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-800 transition-colors z-10"
              aria-label={t('ticketing.scanner.switchCamera')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            {/* Low performance indicator */}
            {fps < 10 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-500/80 text-white px-3 py-1 rounded-full text-xs z-10">
                {t('ticketing.scanner.lowPerformanceMode')}
              </div>
            )}
          </>
        )}
        
        {/* Manual entry prompt after timeout */}
        {showManualPrompt && cameraState === 'active' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white px-4 py-3 rounded-lg shadow-lg z-10 max-w-xs text-center">
            <p className="text-sm font-semibold mb-1">{t('ticketing.scanner.troubleScanning')}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('ticketing.scanner.enterManually')}</p>
            <ArrowDown className="w-4 h-4 mx-auto animate-bounce" />
          </div>
        )}
      </div>
    )
  }
)

QRCodeScanner.displayName = 'QRCodeScanner'
