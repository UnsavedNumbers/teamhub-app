import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { useScrollLock } from '@/hooks/useScrollLock'
import type { NavSection, MenuState } from '@/types/menu'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
  sections: NavSection[]
}

/**
 * MobileNavDrawer - Full-height slide-in drawer for mobile navigation
 * 
 * Features:
 * - Slide-in animation from left using CSS transforms
 * - Backdrop overlay with tap-to-close
 * - Scroll lock when open
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - State machine to prevent flicker from rapid clicks
 * - Refs to prevent stale closures
 * - Unmount safety checks
 */
export default function MobileNavDrawer({ isOpen, onClose, sections }: MobileNavDrawerProps) {
  const location = useLocation()
  const drawerRef = useRef<HTMLDivElement>(null)
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
    if (isOpen && state === 'closed') {
      setState('opening')
      // Transition to open after animation starts
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setState('open')
        }
      }, 0)
      return () => clearTimeout(timer)
    } else if (!isOpen && state === 'open') {
      setState('closing')
      // Transition to closed after animation completes (300ms matches CSS)
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setState('closed')
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, state])
  
  // Close on route change
  useEffect(() => {
    if (isOpenRef.current && isMountedRef.current) {
      onClose()
    }
  }, [location.pathname, onClose])
  
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
    // Only close if clicking the backdrop itself, not menu content
    if (e.target === backdropRef.current && isMountedRef.current && stateRef.current !== 'closing') {
      onClose()
    }
  }, [onClose])
  
  // Prevent clicks inside drawer from closing
  const handleDrawerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }, [])
  
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
          className="mobile-drawer-backdrop"
          onClick={handleBackdropClick}
          aria-hidden={!isVisible}
        >
          <div
            ref={drawerRef}
            className={`mobile-drawer ${isVisible ? 'mobile-drawer--open' : ''}`}
            onClick={handleDrawerClick}
            role="navigation"
            aria-label="Mobile navigation menu"
          >
            <div className="mobile-drawer-header">
              <button
                className="mobile-drawer-close"
                onClick={onClose}
                aria-label="Close navigation menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <nav className="mobile-drawer-nav">
              {sections.map((section) => {
                const sectionKey = `${section.label}-${section.route || 'no-route'}`
                const isDirectLink = section.route && section.groups.length === 1 && 
                                    section.groups[0].items.length === 1 &&
                                    section.groups[0].items[0].path === section.route
                
                if (isDirectLink && section.route) {
                  return (
                    <Link
                      key={sectionKey}
                      to={section.route}
                      className="mobile-drawer-section-link"
                      onClick={onClose}
                    >
                      {section.label}
                    </Link>
                  )
                }
                
                return (
                  <div key={sectionKey} className="mobile-drawer-section">
                    <div className="mobile-drawer-section-label">{section.label}</div>
                    {section.groups.map((group, groupIdx) => (
                      <div key={group.label || groupIdx} className="mobile-drawer-group">
                        {group.label && (
                          <div className="mobile-drawer-group-label">{group.label}</div>
                        )}
                        {group.items.map((item) => {
                          if (item.disabled) {
                            return (
                              <div
                                key={item.path}
                                className="mobile-drawer-link mobile-drawer-link--disabled"
                                title="Requires organization setup"
                              >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span>{item.text}</span>
                              </div>
                            )
                          }
                          
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className="mobile-drawer-link"
                              onClick={onClose}
                            >
                              <span className="material-symbols-outlined">{item.icon}</span>
                              <div className="mobile-drawer-link-content">
                                <span className="mobile-drawer-link-title">{item.text}</span>
                                {item.description && (
                                  <span className="mobile-drawer-link-desc">{item.description}</span>
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>
      </FocusLock>
    </RemoveScroll>
  )
}
