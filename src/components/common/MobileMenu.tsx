import { useRef, useEffect, useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import FocusLock from 'react-focus-lock'
import { RemoveScroll } from 'react-remove-scroll'
import { useTheme } from '@/hooks/useTheme'
import type { NavSection } from '@/types/menu'
import { getReasonIcon } from '@/lib/featureGate'
import { getLink, RouteKeys } from '@/utils/routes'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useT } from '@/i18n/useI18n'
import { hasAnyRole } from '@/utils/roleHelpers'
import './MobileMenu.css'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  sections: NavSection[]
  brandName?: string
  brandSubtitle?: string
  brandLogo?: string
}

/**
 * MobileMenu - Full-height slide-in drawer for mobile/tablet navigation
 * 
 * Inspired by Quicken Simplifi's clean, organized mobile menu design:
 * - Full-height drawer sliding from left
 * - Brand header with logo
 * - Grouped navigation with section labels
 * - Clean icons with text labels
 * - Active state highlighting
 * - Smooth animations
 */
export default function MobileMenu({ 
  isOpen, 
  onClose, 
  sections,
  brandName = 'Youth Sports',
  brandSubtitle = 'Team Hub',
  brandLogo
}: MobileMenuProps) {
  const location = useLocation()
  const { resolvedTheme } = useTheme()
  const { currentOrganization } = useOrganization()
  const t = useT()
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousPathRef = useRef(location.pathname)
  const [featureGateModal, setFeatureGateModal] = useState<{ open: boolean; message: string; reasonCode?: string; featureKey?: string }>({
    open: false,
    message: '',
  })
  
  // Track if we should render (for close animation)
  const [shouldRender, setShouldRender] = useState(isOpen)
  
  // When isOpen becomes true, render immediately
  // When isOpen becomes false, wait for animation before unmounting
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  
  // Close on route change
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname
      if (isOpen) {
        onClose()
      }
    }
  }, [location.pathname, isOpen, onClose])
  
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
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])
  
  // Check if a path is active
  const isActivePath = useCallback((path: string) => {
    if (path === '/admin' || path === '/portal/dashboard') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }, [location.pathname])
  
  // Don't render if not needed
  if (!shouldRender) {
    return null
  }
  
  // Default logo based on theme
  const logoSrc = brandLogo || (resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png')

  const menuContent = (
    <RemoveScroll enabled={isOpen}>
      <FocusLock disabled={!isOpen} returnFocus>
        <div
          className={`mm-backdrop ${isOpen ? 'mm-backdrop--visible' : ''}`}
          onClick={handleBackdropClick}
          aria-hidden={!isOpen}
        >
          <aside
            ref={drawerRef}
            className={`mm-drawer ${isOpen ? 'mm-drawer--open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
          >
            {/* Brand Header */}
            <header className="mm-header">
              <div className="mm-brand">
                {logoSrc ? (
                  <img 
                    src={logoSrc} 
                    alt={brandName}
                    className="mm-brand-logo"
                    onError={(e) => {
                      // Hide broken image
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="mm-brand-icon">
                    <span className="material-symbols-outlined">sports</span>
                  </div>
                )}
                <div className="mm-brand-text">
                  <span className="mm-brand-name">{brandName}</span>
                  {brandSubtitle && (
                    <span className="mm-brand-subtitle">{brandSubtitle}</span>
                  )}
                </div>
              </div>
              <button
                className="mm-close"
                onClick={onClose}
                aria-label="Close menu"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            {/* Navigation */}
            <nav className="mm-nav">
              {sections.map((section, sectionIdx) => {
                // Flatten all items from all groups
                const allItems = section.groups.flatMap(g => g.items)
                
                // Check if this is a single-item section that should be a direct link
                const isSingleItem = allItems.length === 1 && section.route
                
                if (isSingleItem && section.route) {
                  const item = allItems[0]
                  const isActive = isActivePath(item.path)
                  const isOrgDisabled = item.disabled
                  const isGateDisabled = (item as any).isGated && (item as any).gateAction === 'disable'
                  const isDisabled = isOrgDisabled || isGateDisabled
                  const isModalAction = (item as any).isGated && (item as any).gateAction === 'modal'
                  const disabledTitle = (item as any).gateMessage || (item.disabled ? 'Coming soon' : undefined)

                  const handleClick = (e: React.MouseEvent) => {
                    if (isModalAction) {
                      e.preventDefault()
                      e.stopPropagation()
                      setFeatureGateModal({
                        open: true,
                        message: (item as any).gateMessage || 'This feature is not available',
                        reasonCode: (item as any).reasonCode,
                        featureKey: (item as any).featureKey,
                      })
                      onClose()
                    }
                  }
                  
                  if (isDisabled) {
                    return (
                      <div
                        key={`section-${sectionIdx}-${section.label}`}
                        className="mm-item mm-item--disabled"
                        title={disabledTitle}
                      >
                        <span className="material-symbols-outlined mm-item-icon">
                          {item.icon}
                        </span>
                        <span className="mm-item-text">{item.text}</span>
                      </div>
                    )
                  }

                  if (isModalAction) {
                    return (
                      <div
                        key={`section-${sectionIdx}-${section.label}`}
                        className={`mm-item ${isActive ? 'mm-item--active' : ''}`}
                        onClick={handleClick}
                        title={(item as any).gateMessage}
                      >
                        <span className="material-symbols-outlined mm-item-icon">
                          {item.icon}
                        </span>
                        <span className="mm-item-text">{item.text}</span>
                      </div>
                    )
                  }
                  
                  return (
                    <Link
                      key={`section-${sectionIdx}-${section.label}`}
                      to={item.path}
                      className={`mm-item ${isActive ? 'mm-item--active' : ''}`}
                      onClick={onClose}
                    >
                      <span className="material-symbols-outlined mm-item-icon">
                        {item.icon}
                      </span>
                      <span className="mm-item-text">{item.text}</span>
                    </Link>
                  )
                }
                
                return (
                  <div key={`section-${sectionIdx}-${section.label}`} className="mm-section">
                    {section.label && (
                      <div className="mm-section-label">{section.label}</div>
                    )}
                    
                    {section.groups.map((group, groupIdx) => (
                      <div key={`group-${groupIdx}-${group.label || 'default'}`} className="mm-group">
                        {group.label && section.groups.length > 1 && (
                          <div className="mm-group-label">{group.label}</div>
                        )}
                        
                        {group.items.map((item, itemIdx) => {
                          const isActive = isActivePath(item.path)
                          const isOrgDisabled = item.disabled
                          const isGateDisabled = (item as any).isGated && (item as any).gateAction === 'disable'
                          const isDisabled = isOrgDisabled || isGateDisabled
                          const isModalAction = (item as any).isGated && (item as any).gateAction === 'modal'
                          const disabledTitle = (item as any).gateMessage || (item.disabled ? 'Coming soon' : undefined)

                          const handleClick = (e: React.MouseEvent) => {
                            if (isModalAction) {
                              e.preventDefault()
                              e.stopPropagation()
                              setFeatureGateModal({
                                open: true,
                                message: (item as any).gateMessage || 'This feature is not available',
                                reasonCode: (item as any).reasonCode,
                                featureKey: (item as any).featureKey,
                              })
                              onClose()
                            }
                          }
                          
                          if (isDisabled) {
                            return (
                              <div
                                key={`item-${itemIdx}-${item.path}`}
                                className="mm-item mm-item--disabled"
                                title={disabledTitle}
                              >
                                <span className="material-symbols-outlined mm-item-icon">
                                  {item.icon}
                                </span>
                                <span className="mm-item-text">{item.text}</span>
                              </div>
                            )
                          }

                          if (isModalAction) {
                            return (
                              <div
                                key={`item-${itemIdx}-${item.path}`}
                                className={`mm-item ${isActive ? 'mm-item--active' : ''}`}
                                onClick={handleClick}
                                title={(item as any).gateMessage}
                              >
                                <span className="material-symbols-outlined mm-item-icon">
                                  {item.icon}
                                </span>
                                <span className="mm-item-text">{item.text}</span>
                              </div>
                            )
                          }
                          
                          return (
                            <Link
                              key={`item-${itemIdx}-${item.path}`}
                              to={item.path}
                              className={`mm-item ${isActive ? 'mm-item--active' : ''}`}
                              onClick={onClose}
                            >
                              <span className="material-symbols-outlined mm-item-icon">
                                {item.icon}
                              </span>
                              <span className="mm-item-text">{item.text}</span>
                            </Link>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })}
            </nav>
          </aside>
        </div>
      </FocusLock>
    </RemoveScroll>
  )

  // Render in portal to avoid z-index issues
  return (
    <>
      {createPortal(menuContent, document.body)}
      {/* Feature Gate Modal */}
      {featureGateModal.open && (() => {
        const featureKey = featureGateModal.featureKey || 'default'
        const isAdmin = currentOrganization ? hasAnyRole(currentOrganization, ['org_admin']) : false
        const getFeatureTranslation = (key: string, fallbackKey: string) => {
          const translationKey = `featureUpgrade.${featureKey}.${key}` as any
          const fallback = `featureUpgrade.default.${fallbackKey}` as any
          const translation = t(translationKey)
          if (translation === translationKey) {
            return t(fallback)
          }
          return translation
        }
        const modalTitle = getFeatureTranslation('statusTitle', 'statusTitle')
        const modalMessage = isAdmin 
          ? getFeatureTranslation('statusDescriptionAdmin', 'statusDescriptionAdmin')
          : getFeatureTranslation('statusDescriptionNonAdmin', 'statusDescriptionNonAdmin')
        
        return (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
            onClick={() => setFeatureGateModal({ open: false, message: '' })}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <span className="material-symbols-rounded text-5xl text-amber-500 mb-4 block">
                  {featureGateModal.reasonCode ? getReasonIcon(featureGateModal.reasonCode as any) : 'lock'}
                </span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {modalTitle}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {modalMessage}
                </p>
                <div className="flex flex-col items-center gap-4">
                  <a
                    href={`${getLink(RouteKeys.ADMIN_FEATURE_UPGRADE)}?referrer=${encodeURIComponent(featureKey)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                    onClick={() => setFeatureGateModal({ open: false, message: '' })}
                  >
                    <span className="material-symbols-rounded text-lg">workspace_premium</span>
                    {t('common.seeMyOptions')}
                  </a>
                  <button
                    onClick={() => setFeatureGateModal({ open: false, message: '' })}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline bg-transparent border-none cursor-pointer p-0"
                  >
                    {t('common.noThanks')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
