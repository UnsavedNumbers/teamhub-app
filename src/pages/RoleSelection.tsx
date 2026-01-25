import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useLoadingState } from '@/contexts/LoadingStateContext'
import { useTheme } from '@/hooks/useTheme'
import { useT } from '@/i18n/useI18n'
import { useOffline } from '@/hooks/useOffline'
import { hasRole } from '@/utils/roleHelpers'
import { hasMultipleRoles, getLoginRedirect } from '@/utils/loginRedirect'
import { isDemoMode } from '@/utils/demoMode'
import { getLink, RouteKeys } from '@/utils/routes'
import { showError } from '@/utils/toast'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

interface RoleCard {
  orgId: string
  orgName: string
  role: OrgMemberRole
  title: string
  description: string
}

export function RoleSelection() {
  const { profile, signOut, loading: authLoading } = useAuth()
  const { setCurrentOrganization, isLoading: orgLoading } = useOrganization()
  const { setLoading } = useLoadingState()
  const { resolvedTheme } = useTheme()
  const { isOffline } = useOffline()
  const navigate = useNavigate()
  const t = useT()
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const focusedCardIndex = useRef<number>(-1)

  // Logo based on theme (same as PortalNav)
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'

  const logoSrcWithCacheBust = `${logoSrc}?theme=${resolvedTheme}&v=${logoVersion}`

  // Reset logo error and increment version when theme changes
  useEffect(() => {
    setLogoError(false)
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  // Helper functions for role titles and descriptions
  const getRoleTitle = useCallback((role: OrgMemberRole): string => {
    switch (role) {
      case 'parent':
        return t('portal.roleSelection.parentTitle')
      case 'coach':
        return t('portal.roleSelection.coachTitle')
      case 'org_admin':
        return t('portal.roleSelection.adminTitle')
      default:
        return role
    }
  }, [t])

  const getRoleDescription = useCallback((role: OrgMemberRole, orgName: string): string => {
    switch (role) {
      case 'parent':
        return `${t('portal.roleSelection.parentDescription')} - ${orgName}`
      case 'coach':
      case 'org_admin':
        return orgName
      default:
        return orgName
    }
  }, [t])

  // Build role cards from user's organizations
  const roleCards = useMemo((): RoleCard[] => {
    if (!profile) return []

    const cards: RoleCard[] = []
    profile.organizations.forEach(org => {
      org.roles?.forEach(role => {
        cards.push({
          orgId: org.id,
          orgName: org.name,
          role,
          title: getRoleTitle(role),
          description: getRoleDescription(role, org.name),
        })
      })
    })
    return cards
  }, [profile, getRoleTitle, getRoleDescription])

  // Validate user has multiple roles - redirect if not
  useEffect(() => {
    if (authLoading || orgLoading) return
    if (!profile) return

    // If user doesn't have multiple roles, redirect appropriately
    if (!hasMultipleRoles(profile.organizations)) {
      const redirectTo = getLoginRedirect(profile.isPlatformAdmin, profile.organizations)
      navigate(redirectTo, { replace: true })
    }
  }, [profile, authLoading, orgLoading, navigate])

  const focusCard = useCallback((card: RoleCard | null) => {
    if (!card) return
    const cardId = `${card.orgId}-${card.role}`
    const cardElement = cardRefs.current.get(cardId)
    if (cardElement) {
      cardElement.focus()
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  const handleCardClick = useCallback((card: RoleCard) => {
    setSelectedCard(`${card.orgId}-${card.role}`)
    setError(null)
    focusedCardIndex.current = roleCards.findIndex(c => 
      c.orgId === card.orgId && c.role === card.role
    )
  }, [roleCards])

  const handleEnter = useCallback(async () => {
    if (!selectedCard || navigating) return

    // Parse selectedCard format: "orgId-role"
    // Since orgId is a UUID with dashes, we need to split from the right
    const lastDashIndex = selectedCard.lastIndexOf('-')
    if (lastDashIndex === -1) {
      setError(t('portal.roleSelection.errors.invalidSelection'))
      return
    }

    const orgId = selectedCard.substring(0, lastDashIndex)
    const role = selectedCard.substring(lastDashIndex + 1) as OrgMemberRole
    
    // Validate role
    if (!['parent', 'coach', 'org_admin'].includes(role)) {
      setError(t('portal.roleSelection.errors.invalidRole'))
      return
    }

    if (!profile) {
      setError(t('portal.roleSelection.errors.sessionExpired'))
      navigate(getLink(RouteKeys.AUTH_LOGIN), { replace: true })
      return
    }

    // Find the organization
    const org = profile.organizations.find(o => o.id === orgId)
    
    if (!org) {
      setError(t('portal.roleSelection.errors.orgNotFound'))
      return
    }

    // Verify user has this role in this org
    if (!hasRole(org, role)) {
      setError(t('portal.roleSelection.errors.roleNotFound'))
      setSelectedCard(null)
      return
    }

    // Check offline mode
    if (isOffline) {
      setError(t('portal.roleSelection.errors.offline'))
      return
    }

    // Check demo mode
    if (isDemoMode()) {
      setError(t('portal.roleSelection.errors.demoMode'))
      return
    }

    setNavigating(true)
    setError(null)

    try {
      // Set the current organization
      setCurrentOrganization(org)
      
      // Determine navigation destination
      let destination: string
      if (role === 'org_admin' || role === 'coach') {
        destination = getLink(RouteKeys.ADMIN_DASHBOARD)
      } else {
        destination = getLink(RouteKeys.PORTAL_DASHBOARD)
      }

      // Navigate to destination
      navigate(destination, { replace: true })
    } catch (err: any) {
      console.error('Error during role selection:', err)
      setError(err.message || t('portal.roleSelection.errors.switchFailed'))
      setNavigating(false)
    }
  }, [selectedCard, navigating, profile, isOffline, navigate, setCurrentOrganization, t])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (helpModalOpen) {
        if (e.key === 'Escape') {
          setHelpModalOpen(false)
        }
        return
      }

      if (roleCards.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          focusedCardIndex.current = Math.min(focusedCardIndex.current + 1, roleCards.length - 1)
          focusCard(roleCards[focusedCardIndex.current])
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          focusedCardIndex.current = Math.max(focusedCardIndex.current - 1, 0)
          focusCard(roleCards[focusedCardIndex.current])
          break
        case 'Enter':
          e.preventDefault()
          if (selectedCard) {
            handleEnter()
          } else if (focusedCardIndex.current >= 0) {
            const card = roleCards[focusedCardIndex.current]
            handleCardClick(card)
          }
          break
        case 'Escape':
          if (selectedCard) {
            setSelectedCard(null)
            focusedCardIndex.current = -1
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCard, helpModalOpen, roleCards, focusCard, handleEnter, handleCardClick])

  const getRoleBackgroundImage = (role: OrgMemberRole): string => {
    switch (role) {
      case 'org_admin':
        return '/images/roles/admin.png'
      case 'coach':
        return '/images/roles/coach.png'
      case 'parent':
        return '/images/roles/guardian.png'
      default:
        return '/images/roles/guardian.png'
    }
  }

  // Group by role type for display
  const groupedCards = {
    parent: roleCards.filter(c => c.role === 'parent'),
    coach: roleCards.filter(c => c.role === 'coach'),
    admin: roleCards.filter(c => c.role === 'org_admin'),
  }

  const handleSignOut = useCallback(async () => {
    if (navigating) return

    try {
      await signOut()
      navigate(getLink(RouteKeys.AUTH_LOGIN), { replace: true })
    } catch (err: any) {
      console.error('Error signing out:', err)
      showError(err.message || t('portal.roleSelection.errors.signOutFailed'))
    }
  }, [navigating, signOut, navigate, t])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setError(null)
    
    try {
      // Force refresh profile to reload organizations
      if (profile?.id) {
        // Trigger a profile refresh by reloading the page
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setRetrying(false)
    }
  }, [profile, t])

  // Track whether we've set loading to true using a ref (survives through cleanup)
  const hasSetLoadingRef = useRef(false)

  // Handle loading state - only call setLoading when state actually changes to avoid counter imbalance
  useEffect(() => {
    const shouldShowLoading = authLoading || orgLoading
    
    if (shouldShowLoading && !hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    } else if (!shouldShowLoading && hasSetLoadingRef.current) {
      setLoading(false)
      hasSetLoadingRef.current = false
    }
  }, [authLoading, orgLoading, setLoading])

  // Cleanup loading state on unmount
  useEffect(() => {
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

  // Loading state
  if (authLoading || orgLoading) {
    return null
  }

  // No profile (should be handled by ProtectedRoute, but safety check)
  if (!profile) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <span className="material-symbols-rounded text-6xl text-slate-400 dark:text-slate-500 mb-4 block">
              error
            </span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('portal.roleSelection.emptyStates.sessionExpired.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('portal.roleSelection.emptyStates.sessionExpired.message')}
            </p>
            <button
              onClick={() => navigate(getLink(RouteKeys.AUTH_LOGIN), { replace: true })}
              className="btn-primary"
            >
              {t('portal.roleSelection.emptyStates.sessionExpired.action')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No organizations (should be handled by redirect, but safety check)
  if (profile.organizations.length === 0) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <span className="material-symbols-rounded text-6xl text-slate-400 dark:text-slate-500 mb-4 block">
              group_off
            </span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('portal.roleSelection.emptyStates.noOrganizations.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('portal.roleSelection.emptyStates.noOrganizations.message')}
            </p>
            <button
              onClick={() => navigate(getLink(RouteKeys.PORTAL_DASHBOARD), { replace: true })}
              className="btn-primary"
            >
              {t('portal.roleSelection.emptyStates.noOrganizations.action')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No role cards (all roles filtered out - edge case)
  if (roleCards.length === 0) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <span className="material-symbols-rounded text-6xl text-slate-400 dark:text-slate-500 mb-4 block">
              warning
            </span>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('portal.roleSelection.emptyStates.noRoles.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('portal.roleSelection.emptyStates.noRoles.message')}
            </p>
            <button
              onClick={() => navigate(getLink(RouteKeys.PORTAL_DASHBOARD), { replace: true })}
              className="btn-primary"
            >
              {t('portal.roleSelection.emptyStates.noRoles.action')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 md:px-10 py-4">
        <div className="flex items-center gap-4">
          {/* Logo - same format as PortalNav */}
          <Link to="/portal/dashboard" className="flex items-center gap-3">
            {!logoError ? (
              <img 
                key={logoSrc}
                src={logoSrcWithCacheBust} 
                alt="Youth Sports" 
                className="h-8 w-auto transition-opacity duration-200"
                onError={() => {
                  console.error('Failed to load logo:', logoSrc)
                  setLogoError(true)
                }}
              />
            ) : (
              <>
                <div className="h-8 w-8 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">sports</span>
                </div>
                <span className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight uppercase">YOUTH SPORTS</span>
              </>
            )}
          </Link>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center justify-center rounded-lg h-10 w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-label={t('portal.roleSelection.helpTitle')}
            disabled={navigating}
          >
            <span className="material-symbols-outlined text-lg">help</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white gap-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={navigating}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {t('portal.roleSelection.signOut')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-10 lg:px-40 py-12 max-w-[1400px] mx-auto w-full relative z-10">
        <div className="w-full text-center mb-16">
          <h1 className="text-slate-900 dark:text-white tracking-tight text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 uppercase">
            {t('portal.roleSelection.title')} <br />
            <span className="text-primary">{t('portal.roleSelection.titleHighlight')}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium">
            {t('portal.roleSelection.description')}
          </p>
        </div>

        {/* Offline Indicator */}
        {isOffline && (
          <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">wifi_off</span>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You are offline. Role selection requires an internet connection.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            {error.includes('refresh') && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {retrying ? t('common.loading') : t('common.retry')}
              </button>
            )}
          </div>
        )}

        <div className="w-full flex flex-col gap-14">
          {/* Parent Section */}
          {groupedCards.parent.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.parentLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.parent.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      ref={(el) => {
                        if (el) cardRefs.current.set(cardId, el)
                        else cardRefs.current.delete(cardId)
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${card.title} for ${card.orgName}`}
                      aria-pressed={isSelected}
                      onClick={() => handleCardClick(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleCardClick(card)
                        }
                      }}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/80 group-hover:bg-black/60 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Coach Section */}
          {groupedCards.coach.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.coachLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.coach.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      ref={(el) => {
                        if (el) cardRefs.current.set(cardId, el)
                        else cardRefs.current.delete(cardId)
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${card.title} for ${card.orgName}`}
                      aria-pressed={isSelected}
                      onClick={() => handleCardClick(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleCardClick(card)
                        }
                      }}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Admin Section */}
          {groupedCards.admin.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-slate-900 dark:text-white text-sm font-black tracking-widest uppercase px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-full">
                  {t('portal.roleSelection.adminLabel')}
                </h3>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {groupedCards.admin.map((card) => {
                  const cardId = `${card.orgId}-${card.role}`
                  const isSelected = selectedCard === cardId
                  const bgImage = getRoleBackgroundImage(card.role)
                  return (
                    <div
                      key={cardId}
                      ref={(el) => {
                        if (el) cardRefs.current.set(cardId, el)
                        else cardRefs.current.delete(cardId)
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select ${card.title} for ${card.orgName}`}
                      aria-pressed={isSelected}
                      onClick={() => handleCardClick(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleCardClick(card)
                        }
                      }}
                      className={`cursor-pointer group relative flex flex-col gap-4 p-8 rounded-2xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isSelected
                          ? 'shadow-[0_10px_30px_rgba(37,140,244,0.15)]'
                          : 'shadow-sm hover:-translate-y-1'
                      }`}
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 text-white scale-125 z-20">
                          <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col gap-5">
                        <div>
                          <p className="text-white text-xl font-bold leading-normal">{card.title}</p>
                          <p className="text-white/90 text-sm font-medium leading-normal mt-1">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Enter Button */}
        <div className="mt-20 w-full flex flex-col items-center gap-8">
          <button
            onClick={handleEnter}
            disabled={!selectedCard || navigating || isOffline || isDemoMode()}
            className={`flex min-w-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 gap-3 text-lg font-black leading-normal tracking-widest uppercase transition-all ${
              selectedCard && !navigating && !isOffline && !isDemoMode()
                ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_8px_0_0_#1a6ec2] active:shadow-[0_2px_0_0_#1a6ec2] active:translate-y-[6px]'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
            }`}
            aria-label={t('portal.roleSelection.enterButton')}
          >
            {navigating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                {t('common.loading')}
              </>
            ) : (
              <>
                {t('portal.roleSelection.enterButton')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">{t('portal.roleSelection.version')}</p>
            <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {helpModalOpen && (
        <div
          onClick={() => setHelpModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 id="help-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {t('portal.roleSelection.helpTitle')}
              </h2>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('portal.roleSelection.helpDescription')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background decorations */}
      <div className="fixed top-0 right-0 -z-10 w-2/3 h-full opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
      </div>
      <div className="fixed bottom-0 left-0 -z-10 w-full h-1/2 opacity-20 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary/5 to-transparent"></div>
      </div>
    </div>
  )
}
