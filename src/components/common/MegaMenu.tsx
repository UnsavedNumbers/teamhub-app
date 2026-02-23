import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { getReasonIcon } from '../../lib/featureGate'
import { getLink, RouteKeys } from '../../utils/routes'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { hasAnyRole } from '../../utils/roleHelpers'

export interface NavLink {
  text: string
  icon: string
  path: string
  description?: string
  disabled?: boolean
  isGated?: boolean
  gateAction?: 'hide' | 'disable' | 'modal' | 'overlay' | 'paywall' | 'custom' | null
  gateMessage?: string
  reasonCode?: string | null
  featureKey?: string
}

export interface NavGroup {
  label: string
  items: NavLink[]
}

interface MegaMenuProps {
  isOpen: boolean
  onClose: () => void
  groups: NavGroup[]
  wide?: boolean
  id: string
}

/**
 * MegaMenu - Dropdown panel with grouped navigation links
 * 
 * Features:
 * - Glass-style background with backdrop blur
 * - Grouped links with icons and optional descriptions
 * - Keyboard navigation (Escape to close)
 * - Focus trap when open
 * - ARIA roles for accessibility
 */
export default function MegaMenu({ isOpen, onClose, groups, wide = false, id }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const { currentOrganization } = useOrganization()
  const t = useT()
  const [featureGateModal, setFeatureGateModal] = useState<{ open: boolean; message: string; reasonCode?: string; featureKey?: string }>({
    open: false,
    message: '',
  })

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

  // Focus first link when menu opens
  useEffect(() => {
    if (isOpen && firstLinkRef.current) {
      // Small delay to allow animation to start
      setTimeout(() => {
        firstLinkRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Check if click was on the trigger button (parent handles this)
        const target = e.target as HTMLElement
        if (target.closest('.gn-nav-trigger')) return
        onClose()
      }
    }

    // Use mousedown to capture before click
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  let linkIndex = 0

  return (
    <div
      ref={menuRef}
      id={id}
      className={cn(
        'gn-mega', 
        isOpen && 'open', 
        wide && 'gn-mega--wide'
      )}
      role="menu"
      aria-hidden={!isOpen}
    >
      {groups.map((group, groupIdx) => (
        <div key={group.label || groupIdx} className="gn-mega-group">
          {group.label && (
            <div className="gn-mega-label">{group.label}</div>
          )}
          {group.items.map((item) => {
            const currentIndex = linkIndex++
            const isFirst = currentIndex === 0
            const isOrgDisabled = item.disabled
            const isGateDisabled = item.isGated && item.gateAction === 'disable'
            const isDisabled = isOrgDisabled || isGateDisabled
            const isModalAction = item.isGated && item.gateAction === 'modal'
            const disabledTitle = item.gateMessage || (item.disabled ? 'Requires organization setup' : undefined)

            const handleClick = (e: React.MouseEvent) => {
              if (isModalAction) {
                e.preventDefault()
                e.stopPropagation()
                setFeatureGateModal({
                  open: true,
                  message: item.gateMessage || 'This feature is not available',
                  reasonCode: item.reasonCode ?? undefined,
                  featureKey: item.featureKey,
                })
                onClose()
              }
            }

            if (isDisabled) {
              return (
                <div
                  key={item.path}
                  className="gn-mega-link"
                  style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  title={disabledTitle}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <div className="gn-mega-link-content">
                    <span className="gn-mega-link-title">{item.text}</span>
                    {item.description && (
                      <span className="gn-mega-link-desc">{item.description}</span>
                    )}
                  </div>
                </div>
              )
            }

            if (isModalAction) {
              return (
                <div
                  key={item.path}
                  ref={isFirst ? (firstLinkRef as any) : undefined}
                  className="gn-mega-link"
                  role="menuitem"
                  onClick={handleClick}
                  tabIndex={isOpen ? 0 : -1}
                  style={{ cursor: 'pointer' }}
                  title={item.gateMessage}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <div className="gn-mega-link-content">
                    <span className="gn-mega-link-title">{item.text}</span>
                    {item.description && (
                      <span className="gn-mega-link-desc">{item.description}</span>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.path}
                ref={isFirst ? firstLinkRef : undefined}
                to={item.path}
                className="gn-mega-link"
                role="menuitem"
                onClick={onClose}
                tabIndex={isOpen ? 0 : -1}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <div className="gn-mega-link-content">
                  <span className="gn-mega-link-title">{item.text}</span>
                  {item.description && (
                    <span className="gn-mega-link-desc">{item.description}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ))}
      
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
    </div>
  )
}
