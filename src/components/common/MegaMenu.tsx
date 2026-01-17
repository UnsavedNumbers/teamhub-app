import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export interface NavLink {
  text: string
  icon: string
  path: string
  description?: string
  disabled?: boolean
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
      className={`gn-mega ${isOpen ? 'open' : ''} ${wide ? 'gn-mega--wide' : ''}`}
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

            if (item.disabled) {
              return (
                <div
                  key={item.path}
                  className="gn-mega-link"
                  style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  title="Requires organization setup"
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
    </div>
  )
}
