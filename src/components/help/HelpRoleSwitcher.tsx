/**
 * Help Role Switcher Component
 * 
 * Desktop: horizontal tabs for role switching
 * Mobile: dropdown selector
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { getRoleCategoryMappings } from '../../data/services/helpCenterMappingService'
import '../../styles/helpCenter.css'

type HelpRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

interface RoleInfo {
  role: HelpRole
  label: string
  slug: string
  categorySlug?: string // WordPress category slug from mapping
}

interface HelpRoleSwitcherProps {
  currentRoleSlug?: string
  onRoleChange?: (role: HelpRole) => void
}

export function HelpRoleSwitcher({ currentRoleSlug, onRoleChange }: HelpRoleSwitcherProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  const getBaseRoles = useCallback((): RoleInfo[] => {
    return [
      { role: 'parent', label: t('portal.settings.helpCenter.roleGuardians'), slug: 'guardians' },
      { role: 'coach', label: t('portal.settings.helpCenter.roleCoaches'), slug: 'coaches' },
      { role: 'org_admin', label: t('portal.settings.helpCenter.roleOrgAdmins'), slug: 'org-admins' },
      { role: 'athlete', label: t('portal.settings.helpCenter.roleAthletes'), slug: 'athletes' },
    ]
  }, [t])

  // Initialize with base roles immediately, then load mappings in background
  useEffect(() => {
    const baseRoles = getBaseRoles()
    setRoles(baseRoles) // Show roles immediately
    
    // Load mappings in background and update roles
    const loadMappings = async () => {
      const mappingsResult = await getRoleCategoryMappings()
      
      if (mappingsResult.error || !mappingsResult.data) {
        return // Keep using base roles
      }

      const mappings = mappingsResult.data || []
      const rolesWithSlugs = baseRoles.map(role => {
        const roleMappings = mappings.filter(m => m.role === role.role)
        const roleMapping =
          roleMappings.find(m => m.wordpressCategorySlug === role.slug) ||
          roleMappings[0]
        return {
          ...role,
          categorySlug: roleMapping?.wordpressCategorySlug,
        }
      })

      setRoles(rolesWithSlugs)
    }

    loadMappings()
  }, [getBaseRoles])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMobileOpen(false)
      }
    }
    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileOpen])

  // Close dropdown when navigating
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  const getCurrentRole = useCallback((): RoleInfo | undefined => {
    if (currentRoleSlug) {
      const exactSlugMatch = roles.find(r => r.slug === currentRoleSlug)
      if (exactSlugMatch) {
        return exactSlugMatch
      }

      const categorySlugMatch = roles.find(r => r.categorySlug && r.categorySlug === currentRoleSlug)
      if (categorySlugMatch) {
        return categorySlugMatch
      }
    }

    const pathSlugMatch = roles.find(r => location.pathname.includes(`/${r.slug}`))
    if (pathSlugMatch) {
      return pathSlugMatch
    }

    return roles.find(r => (r.categorySlug ? location.pathname.includes(`/${r.categorySlug}`) : false))
  }, [currentRoleSlug, roles, location.pathname])

  const handleRoleSelect = (role: RoleInfo) => {
    setIsMobileOpen(false)
    onRoleChange?.(role.role)
    
    // Use WordPress category slug if available, otherwise fall back to role slug
    const categorySlug = role.categorySlug || role.slug
    const rolePath = getLink('portal.helpCategory', { categorySlug })
    navigate(rolePath)
  }

  const currentRole = getCurrentRole()
  const isRoleActive = (role: RoleInfo) =>
    currentRole?.slug === role.slug ||
    (Boolean(currentRole?.categorySlug) && Boolean(role.categorySlug) && currentRole?.categorySlug === role.categorySlug)

  return (
    <>
      {/* Desktop: Horizontal Tabs */}
      <div className="help-role-switcher-desktop">
        <div className="help-role-tabs">
          {roles.map((role) => (
            <button
              key={role.role}
              type="button"
              onClick={() => handleRoleSelect(role)}
              className={`help-role-tab ${isRoleActive(role) ? 'active' : ''}`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Dropdown */}
      <div ref={dropdownRef} className="help-role-switcher-mobile">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="help-role-dropdown-trigger"
        >
          <span>{t('portal.settings.helpCenter.helpFor')}</span>
          <span className="help-role-dropdown-value">
            {currentRole?.label || t('portal.settings.helpCenter.selectRole')}
          </span>
          <span className="material-symbols-outlined">
            {isMobileOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {isMobileOpen && (
          <div className="help-role-dropdown-menu">
            {roles.map((role) => (
              <button
                key={role.role}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={`help-role-dropdown-item ${isRoleActive(role) ? 'active' : ''}`}
              >
                {role.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
