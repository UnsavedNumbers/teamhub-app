/**
 * Demo Welcome Page
 * 
 * Role-aware welcome page that shows demo users a feature overview.
 * Displays features in a grid layout with clear CTAs.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n/useI18n'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import { useUserContext } from '@/hooks/useUserContext'
import { useDemoTracking } from '@/lib/analytics/demoTracking'
import { markDemoWelcomeCompleted, isInDemoSession } from '@/utils/demoMode'
import { getFeaturesForRole, type DemoFeature } from '@/data/demo/featureRegistry'
import { getLink, RouteKeys } from '@/utils/routes'
import { getPrimaryRole } from '@/utils/roleHelpers'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { DemoAllowedRole } from '@/types/demoManagement'
import { showError } from '@/utils/toast'
import './DemoWelcome.css'

/**
 * Map standard roles to demo roles
 */
function mapRoleToDemoRole(role: string | null | undefined): DemoAllowedRole {
  if (role === 'org_admin') return 'org_admin'
  if (role === 'coach') return 'coach'
  if (role === 'parent') return 'parent'
  if (role === 'athlete') return 'athlete'
  if (role === 'staff') return 'staff'
  return 'parent' // Default fallback
}

export default function DemoWelcome() {
  const t = useT()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useDemoSession()
  const { currentOrganization, loading: orgLoading } = useOrganization()
  const { context } = useUserContext()
  const { trackDemoFeatureClick } = useDemoTracking()
  const [error, setError] = useState<string | null>(null)

  // Redirect if not in demo session
  useEffect(() => {
    if (!sessionLoading && !isInDemoSession()) {
      navigate(getLink(RouteKeys.PORTAL_DASHBOARD))
    }
  }, [sessionLoading, navigate])

  // Determine user's role
  const userRole = useMemo<DemoAllowedRole>(() => {
    if (!currentOrganization) return 'parent'

    const primaryRole = getPrimaryRole(currentOrganization)
    return mapRoleToDemoRole(primaryRole || 'parent')
  }, [currentOrganization])

  // Get features for user's role
  const features = useMemo<DemoFeature[]>(() => {
    try {
      return getFeaturesForRole(userRole)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load features'
      setError(errorMessage)
      showError(errorMessage)
      return []
    }
  }, [userRole])

  // Loading state
  if (sessionLoading || orgLoading) {
    return (
      <div className="demo-welcome">
        <div className="demo-welcome-container">
          <div className="demo-welcome-loading">
            <p>{t('demo.welcome.loading') || 'Loading...'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session.is_demo_session) {
    return (
      <div className="demo-welcome">
        <div className="demo-welcome-container">
          <div className="demo-welcome-error">
            <h2>{t('demo.welcome.error') || 'Error'}</h2>
            <p>{error || 'You are not in a demo session.'}</p>
            <button
              className="demo-welcome-primary-button"
              onClick={() => navigate(getLink(RouteKeys.PORTAL_DASHBOARD))}
              type="button"
            >
              {t('demo.welcome.goToDashboard') || 'Go to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Handle feature click
  const handleFeatureClick = (feature: DemoFeature) => {
    if (!session.is_demo_session || !session.demo_code) return

    // Track feature click
    trackDemoFeatureClick(feature.id, feature.name, {
      demo_code: session.demo_code,
      demo_role: userRole,
      demo_org_id: session.demo_org_id || '',
      organization_id: session.organization_id || null,
    })

    // Navigate to feature
    const route = getLink(feature.routeKey as RouteKeys)
    if (route) {
      navigate(route)
    }
  }

  // Handle "Get Started" - mark welcome as completed and navigate to dashboard
  const handleGetStarted = () => {
    markDemoWelcomeCompleted()

    // Navigate based on role
    let defaultRoute: string
    if (userRole === 'org_admin' || userRole === 'coach') {
      defaultRoute = getLink(RouteKeys.ADMIN_DASHBOARD)
    } else {
      defaultRoute = getLink(RouteKeys.PORTAL_DASHBOARD)
    }

    navigate(defaultRoute)
  }

  // Handle "Skip Tour"
  const handleSkip = () => {
    markDemoWelcomeCompleted()
    handleGetStarted()
  }

  return (
    <div className="demo-welcome">
      <div className="demo-welcome-container">
        {/* Header */}
        <div className="demo-welcome-header">
          <h1 className="demo-welcome-title">{t('demo.welcome.title')}</h1>
          <p className="demo-welcome-subtitle">{t('demo.welcome.subtitle')}</p>
        </div>

        {/* Features Grid */}
        {features.length > 0 ? (
          <>
            <h2 className="demo-welcome-features-title">{t('demo.welcome.featuresTitle')}</h2>
            <div className="demo-welcome-features-grid">
              {features.map((feature) => (
                <div key={feature.id} className="demo-welcome-feature-card">
                  <h3 className="demo-welcome-feature-name">{feature.name}</h3>
                  <p className="demo-welcome-feature-description">{feature.description}</p>

                  {feature.quickStart && feature.quickStart.length > 0 && (
                    <ul className="demo-welcome-feature-quickstart">
                      {feature.quickStart.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <button
                    className="demo-welcome-feature-button"
                    onClick={() => handleFeatureClick(feature)}
                    type="button"
                  >
                    {feature.cta}
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="demo-welcome-no-features">
            <p>{t('demo.welcome.noFeatures')}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="demo-welcome-footer">
          <button
            className="demo-welcome-primary-button"
            onClick={handleGetStarted}
            type="button"
          >
            {t('demo.welcome.getStarted')}
          </button>
          <button
            className="demo-welcome-skip-button"
            onClick={handleSkip}
            type="button"
          >
            {t('demo.welcome.skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
