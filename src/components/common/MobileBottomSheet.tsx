import { useState, useRef, useEffect, useCallback } from 'react'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { useScrollLock } from '@/hooks/useScrollLock'
import type { MenuState } from '@/types/menu'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

/**
 * MobileBottomSheet - Slide-up bottom sheet for mobile dropdowns
 * 
 * Features:
 * - Slide-up animation from bottom using CSS transforms
 * - Backdrop overlay with tap-to-close
 * - Scroll lock when open
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - State machine to prevent flicker from rapid clicks
 * - Refs to prevent stale closures
 * - Unmount safety checks
 * - Safe area handling for notched devices
 */
export default function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title 
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  
  // State machine to prevent invalid transitions
  // Initialize state based on isOpen prop
  const [state, setState] = useState<MenuState>(() => isOpen ? 'opening' : 'closed')
  
  // Refs to prevent stale closures in event handlers
  const isOpenRef = useRef(isOpen)
  const stateRef = useRef(state)
  
  // Sync refs with state
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])
  
  useEffect(() => {
    stateRef.current = state
  }, [state])
  
  // Unmount safety
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  // State machine transitions
  useEffect(() => {
    if (isOpen) {
      if (state === 'closed') {
        setState('opening')
        // Transition to open after animation starts
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setState('open')
          }
        }, 0)
        return () => clearTimeout(timer)
      } else if (state === 'closing') {
        // If closing but isOpen becomes true again, go back to opening
        setState('opening')
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setState('open')
          }
        }, 0)
        return () => clearTimeout(timer)
      }
    } else {
      if (state === 'open' || state === 'opening') {
        setState('closing')
        // Transition to closed after animation completes (300ms matches CSS)
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setState('closed')
          }
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, state])
  
  // Scroll lock
  useScrollLock(isOpen && state !== 'closed')
  
  // Close on Escape key
  useEffect(() => {
    if (!isOpen || state === 'closed') return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenRef.current) {
        e.preventDefault()
        if (isMountedRef.current) {
          onClose()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, state, onClose])
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not sheet content
    const target = e.target as HTMLElement
    if (
      backdropRef.current &&
      sheetRef.current &&
      backdropRef.current.contains(target) &&
      !sheetRef.current.contains(target) &&
      isMountedRef.current &&
      stateRef.current !== 'closing'
    ) {
      onClose()
    }
  }, [onClose])
  
  // Prevent clicks inside sheet from closing
  const handleSheetClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }, [])
  
  // Handle close button click
  const handleCloseClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMountedRef.current) {
      onClose()
    }
  }, [onClose])
  
  // Don't render if closed and isOpen is false
  if (!isOpen && state === 'closed') {
    return null
  }
  
  // Visible when open or opening (for animation)
  // Also visible immediately when isOpen is true (even if state hasn't transitioned yet)
  const isVisible = isOpen || state === 'open' || state === 'opening'
  
  return (
    <RemoveScroll enabled={isVisible}>
      <FocusLock disabled={!isVisible}>
        <div
          ref={backdropRef}
          className="mobile-sheet-backdrop"
          onClick={handleBackdropClick}
          aria-hidden={!isVisible}
        >
          <div
            ref={sheetRef}
            className={`mobile-sheet ${isVisible ? 'mobile-sheet--open' : ''}`}
            onClick={handleSheetClick}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Menu'}
          >
            {title && (
              <div className="mobile-sheet-header">
                <h2 className="mobile-sheet-title">{title}</h2>
                <button
                  className="mobile-sheet-close"
                  onClick={handleCloseClick}
                  aria-label="Close menu"
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}
            <div className="mobile-sheet-content">
              {children}
            </div>
          </div>
        </div>
      </FocusLock>
    </RemoveScroll>
  )
}
