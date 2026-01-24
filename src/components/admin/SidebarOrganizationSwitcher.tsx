import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getLink, RouteKeys } from '@/utils/routes'
import { formatRoleName, hasRole } from '@/utils/roleHelpers'
import { isDemoMode } from '@/utils/demoMode'
import { useOffline } from '@/hooks/useOffline'
import { useEventListener } from '@/hooks/useEventListener'
import { usePrevious } from '@/hooks/usePrevious'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

/**
 * SidebarOrganizationSwitcher - Compact organization switcher for admin sidebar
 * 
 * Features:
 * - Compact display in sidebar header
 * - Dropdown with all organizations and roles
 * - React Portal for proper z-index handling
 * - Full keyboard navigation and accessibility
 * - Comprehensive bug prevention measures
 */
export default function SidebarOrganizationSwitcher() {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization()
  const { isOffline } = useOffline()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
    placement: 'bottom' | 'top'
    width: number
  } | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [portalReady, setPortalReady] = useState(false)
  
  // Refs for bug prevention
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const isMountedRef = useRef(true)
  const portalContainerRef = useRef<HTMLDivElement | null>(null)
  
  // Refs to prevent stale closures
  const currentOrgRef = useRef(currentOrganization)
  const isOpenRef = useRef(isOpen)
  const switchingRef = useRef(switching)
  
  // Update refs when state changes
  useEffect(() => {
    currentOrgRef.current = currentOrganization
    isOpenRef.current = isOpen
    switchingRef.current = switching
  }, [currentOrganization, isOpen, switching])
  
  // Cleanup on unmount (Bug 4, Bug 9)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Close dropdown before unmount
      if (isOpenRef.current && isMountedRef.current) {
        setIsOpen(false)
      }
      // Cleanup portal container
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current)
        portalContainerRef.current = null
      }
    }
  }, [])
  
  // Track previous organization ID to detect external changes
  const prevOrgId = usePrevious(currentOrganization?.id)
  
  // Close dropdown when organization changes externally (Issue 9)
  // Only close if the org actually changed (not on first render or when isOpen changes)
  useEffect(() => {
    if (
      prevOrgId !== undefined &&
      currentOrganization?.id !== prevOrgId &&
      isOpen &&
      isMountedRef.current
    ) {
      setIsOpen(false)
    }
  }, [currentOrganization?.id, prevOrgId, isOpen])
  
  // Infer active role from current route (same logic as UserContextDropdown)
  const inferredActiveRole = useMemo((): OrgMemberRole | null => {
    if (!currentOrganization) return null
    const isAdminRoute = location.pathname.startsWith('/admin')
    if (isAdminRoute) {
      if (hasRole(currentOrganization, 'org_admin')) return 'org_admin'
      if (hasRole(currentOrganization, 'coach')) return 'coach'
    } else {
      if (hasRole(currentOrganization, 'parent')) return 'parent'
    }
    return currentOrganization.roles?.[0] || null
  }, [location.pathname, currentOrganization])
  
  // Build list of org/role combinations (Issue 5)
  const orgRoleCombinations = useMemo(() => {
    return organizations.flatMap(org => 
      org.roles?.map(role => ({
        orgId: org.id,
        orgName: org.name,
        role,
        isActive: currentOrganization?.id === org.id && role === inferredActiveRole
      })) || []
    )
  }, [organizations, currentOrganization, inferredActiveRole])
  
  // Calculate dropdown position (Bug 6)
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const dropdownHeight = Math.min(400, orgRoleCombinations.length * 48 + 16) // Estimate height
    const spaceBelow = viewportHeight - triggerRect.bottom
    const spaceAbove = triggerRect.top
    
    const placement: 'bottom' | 'top' = spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom'
    const top = placement === 'bottom' 
      ? triggerRect.bottom + 4
      : triggerRect.top - dropdownHeight - 4
    const left = triggerRect.left
    const width = Math.min(280, Math.max(triggerRect.width, 200))
    
    // Ensure dropdown doesn't overflow viewport horizontally
    const adjustedLeft = Math.max(8, Math.min(left, viewportWidth - width - 8))
    
    if (isMountedRef.current) {
      setDropdownPosition({
        top,
        left: adjustedLeft,
        placement,
        width
      })
    }
  }, [orgRoleCombinations.length])
  
  // Calculate position on open and when window resizes (Bug 6)
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        if (isMountedRef.current && isOpenRef.current) {
          calculatePosition()
        }
      }, 0)
      return () => clearTimeout(timeout)
    } else if (!isOpen) {
      setDropdownPosition(null)
    }
  }, [isOpen, calculatePosition])
  
  // Recalculate position on window resize/scroll (Bug 6)
  const handleResize = useCallback(() => {
    if (isOpenRef.current) {
      calculatePosition()
    }
  }, [calculatePosition])
  
  useEventListener('resize', handleResize, window)
  
  // Handle scroll events separately since useEventListener doesn't support capture option
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = () => {
      if (isOpenRef.current && isMountedRef.current) {
        calculatePosition()
      }
    }
    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, calculatePosition])
  
  // Handle role switching (reused from UserContextDropdown with bug prevention)
  const handleSwitchRole = useCallback(async (orgId: string, role: OrgMemberRole) => {
    // Bug 3: Race condition prevention - early return guards
    if (switchingRef.current || !isMountedRef.current) return
    
    if (isOffline) {
      console.error('Cannot switch roles while offline')
      return
    }
    
    if (isDemoMode()) {
      console.error('Demo mode: Role selection is not available')
      return
    }
    
    // Use organizations from useOrganization() for consistency with dropdown display
    const org = organizations.find(o => o.id === orgId)
    if (!org) {
      console.error('Organization not found:', orgId)
      return
    }
    
    if (!hasRole(org, role)) {
      console.error('User does not have role', role, 'in organization', orgId)
      return
    }
    
    // Bug 3: Set switching state
    if (isMountedRef.current) {
      setSwitching(true)
      setIsOpen(false)
    }
    
    try {
      // Set the current organization
      setCurrentOrganization(org)
      
      // Bug 7: Navigation race condition prevention
      if (!isMountedRef.current) return
      
      // Issue 4: Smart navigation logic
      const currentRoleType = inferredActiveRole === 'org_admin' || inferredActiveRole === 'coach' ? 'admin' : 'parent'
      const newRoleType = role === 'org_admin' || role === 'coach' ? 'admin' : 'parent'
      
      let destination: string
      if (role === 'org_admin' || role === 'coach') {
        destination = getLink(RouteKeys.ADMIN_DASHBOARD)
      } else {
        destination = getLink(RouteKeys.PORTAL_DASHBOARD)
      }
      
      // Only navigate if switching role types or to different org
      const shouldNavigate = currentRoleType !== newRoleType || currentOrgRef.current?.id !== orgId
      
      if (shouldNavigate && isMountedRef.current) {
        navigate(destination, { replace: true })
      }
    } catch (err: any) {
      console.error('Error during role switch:', err)
      if (isMountedRef.current) {
        setSwitching(false)
      }
    } finally {
      // Bug 3: Ensure cleanup
      if (isMountedRef.current) {
        setSwitching(false)
      }
    }
  }, [organizations, isOffline, navigate, setCurrentOrganization, inferredActiveRole])
  
  // Toggle dropdown
  const toggleDropdown = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (switchingRef.current) return
    if (isMountedRef.current) {
      setIsOpen(prev => {
        const newValue = !prev
        if (!newValue && isMountedRef.current) {
          // Reset highlighted index when closing
          setHighlightedIndex(0)
          setDropdownPosition(null)
        } else if (newValue) {
          // When opening, ensure portal container will be ready
          // The useEffect will create it, but we need to trigger a re-render
        }
        return newValue
      })
    }
  }, [])
  
  // Close dropdown
  const closeDropdown = useCallback(() => {
    if (isMountedRef.current) {
      setIsOpen(false)
      setHighlightedIndex(0)
      setDropdownPosition(null)
      // Bug 5: Return focus to trigger
      setTimeout(() => {
        if (isMountedRef.current) {
          triggerRef.current?.focus()
        }
      }, 0)
    }
  }, [])
  
  // Bug 1: Click outside detection using useEventListener
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node
    // Don't close if clicking on the trigger button (it handles its own toggle)
    if (triggerRef.current && triggerRef.current.contains(target)) {
      return
    }
    // Only close if dropdown is actually open and rendered
    if (
      isOpenRef.current &&
      dropdownRef.current &&
      portalContainerRef.current &&
      !dropdownRef.current.contains(target)
    ) {
      closeDropdown()
    }
  }, [closeDropdown])
  
  // Only attach click outside listener when dropdown is open
  useEffect(() => {
    if (!isOpen) return
    
    const handleClick = (event: MouseEvent) => {
      handleClickOutside(event)
    }
    
    // Use a small delay to avoid closing immediately on open
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, handleClickOutside])
  
  // Bug 5: Keyboard navigation
  const handleKeyDown = useCallback((event: Event) => {
    const keyboardEvent = event as KeyboardEvent
    if (!isOpenRef.current) {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault()
        toggleDropdown()
      }
      return
    }
    
    switch (keyboardEvent.key) {
      case 'Escape':
        keyboardEvent.preventDefault()
        closeDropdown()
        break
      case 'ArrowDown':
        keyboardEvent.preventDefault()
        if (isMountedRef.current) {
          setHighlightedIndex(prev => 
            prev < orgRoleCombinations.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        keyboardEvent.preventDefault()
        if (isMountedRef.current) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : orgRoleCombinations.length - 1
          )
        }
        break
      case 'Enter':
        keyboardEvent.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < orgRoleCombinations.length) {
          const combo = orgRoleCombinations[highlightedIndex]
          handleSwitchRole(combo.orgId, combo.role)
        }
        break
      case 'Tab':
        closeDropdown()
        break
    }
  }, [isOpen, orgRoleCombinations, highlightedIndex, handleSwitchRole, toggleDropdown, closeDropdown])
  
  useEventListener('keydown', handleKeyDown, document)
  
  // Bug 5: Focus management when dropdown opens
  useEffect(() => {
    if (isOpen && firstItemRef.current) {
      // Small delay to allow animation
      const timeout = setTimeout(() => {
        if (isMountedRef.current && firstItemRef.current) {
          firstItemRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])
  
  // Bug 4: Create portal container synchronously with useLayoutEffect
  useLayoutEffect(() => {
    if (isOpen) {
      // Create container if it doesn't exist
      if (!portalContainerRef.current) {
        const container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.top = '0'
        container.style.left = '0'
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.pointerEvents = 'none'
        container.style.zIndex = '1000'
        document.body.appendChild(container)
        portalContainerRef.current = container
      }
      // Mark portal as ready
      if (isMountedRef.current) {
        setPortalReady(true)
      }
    } else {
      // Clean up container when closed
      setPortalReady(false)
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current)
        portalContainerRef.current = null
      }
    }
  }, [isOpen])
  
  // Bug 8: Early return if no organization
  if (!currentOrganization) {
    return null
  }
  
  const hasAnyOrgs = organizations.length > 0
  
  return (
    <>
      <div className="pa-org-switcher">
        <button
          ref={triggerRef}
          onClick={toggleDropdown}
          disabled={switching}
          className="pa-org-switcher-trigger"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Switch organization"
        >
          <span className="pa-org-switcher-name" title={currentOrganization.name}>
            {currentOrganization.name}
          </span>
          <span 
            className={`material-symbols-outlined pa-org-switcher-chevron ${isOpen ? 'open' : ''}`}
            aria-hidden="true"
          >
            expand_more
          </span>
          {switching && (
            <span className="material-symbols-outlined pa-org-switcher-spinner" aria-hidden="true">
              sync
            </span>
          )}
        </button>
      </div>
      
      {/* Dropdown via Portal (Bug 2, Issue 2) */}
      {isOpen && portalReady && portalContainerRef.current && hasAnyOrgs && createPortal(
        <div
          ref={dropdownRef}
          className="pa-org-switcher-dropdown"
          role="listbox"
          aria-label="Select organization and role"
          style={{
            position: 'fixed',
            top: dropdownPosition ? `${dropdownPosition.top}px` : '0px',
            left: dropdownPosition ? `${dropdownPosition.left}px` : '0px',
            width: dropdownPosition ? `${dropdownPosition.width}px` : '280px',
            pointerEvents: 'auto',
            opacity: dropdownPosition ? 1 : 0,
            visibility: dropdownPosition ? 'visible' : 'hidden',
          }}
        >
          {orgRoleCombinations.map((combo, index) => (
            <button
              key={`${combo.orgId}-${combo.role}`}
              ref={index === 0 ? firstItemRef : null}
              onClick={() => handleSwitchRole(combo.orgId, combo.role)}
              disabled={switching}
              className={`pa-org-switcher-item ${
                combo.isActive ? 'active' : ''
              } ${
                highlightedIndex === index ? 'highlighted' : ''
              } ${switching ? 'disabled' : ''}`}
              role="option"
              aria-selected={combo.isActive}
            >
              <div className="pa-org-switcher-item-content">
                <span className="pa-org-switcher-item-name">{combo.orgName}</span>
                <span className="pa-org-switcher-item-role">{formatRoleName(combo.role)}</span>
              </div>
              {combo.isActive && (
                <span className="material-symbols-outlined pa-org-switcher-item-check" aria-hidden="true">
                  check
                </span>
              )}
            </button>
          ))}
        </div>,
        portalContainerRef.current
      )}
    </>
  )
}
