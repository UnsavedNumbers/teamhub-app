import { useRef, useEffect, useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { useScrollLock } from '@/hooks/useScrollLock'
import type { NavSection } from '@/types/menu'

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
 */
export default function MobileNavDrawer({ isOpen, onClose, sections }: MobileNavDrawerProps) {
  const location = useLocation()
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousPathRef = useRef(location.pathname)
  
  // Track if we should render (for close animation)
  const [shouldRender, setShouldRender] = useState(isOpen)
  
  // When isOpen becomes true, render immediately
  // When isOpen becomes false, wait for animation before unmounting
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    } else {
      // Wait for close animation (300ms)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  
  // Close on route change (but not on initial mount)
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname
      if (isOpen) {
        onClose()
      }
    }
  }, [location.pathname, isOpen, onClose])
  
  // Scroll lock when open
  useScrollLock(isOpen)
  
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  
  // Handle backdrop click - close when clicking outside drawer
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not drawer content
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])
  
  // Handle close button click
  const handleCloseClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }, [onClose])
  
  // Don't render if not needed
  if (!shouldRender) {
    return null
  }
  
  return (
    <RemoveScroll enabled={isOpen}>
      <FocusLock disabled={!isOpen} returnFocus>
        <div
          className={`mobile-drawer-backdrop ${isOpen ? 'mobile-drawer-backdrop--visible' : ''}`}
          onClick={handleBackdropClick}
          aria-hidden={!isOpen}
        >
          <div
            ref={drawerRef}
            className={`mobile-drawer ${isOpen ? 'mobile-drawer--open' : ''}`}
            role="navigation"
            aria-label="Mobile navigation menu"
          >
            <div className="mobile-drawer-header">
              <button
                className="mobile-drawer-close"
                onClick={handleCloseClick}
                aria-label="Close navigation menu"
                type="button"
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
