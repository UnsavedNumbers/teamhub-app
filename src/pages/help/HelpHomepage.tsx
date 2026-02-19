/**
 * Help Center Homepage
 * 
 * Main entry point for role-scoped help content.
 * Shows role selection cards.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getRoleCategoryMappings } from '../../data/services/helpCenterMappingService'
import { getLink } from '../../utils/routes'
import { debug } from '../../lib/debug'
import { useT } from '../../i18n/useI18n'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpHomepageSkeleton } from '../../components/help/HelpSkeletons'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

interface RoleCard {
  role: UserRole
  label: string
  slug: string
  icon: string
  description: string
  categorySlug?: string
}

export default function HelpHomepage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [roleCards, setRoleCards] = useState<RoleCard[]>([])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(getLink('auth.login'), { state: { from: getLink('portal.help') } })
    }
  }, [user, authLoading, navigate])

  // Get role cards with translations
  const getRoleCards = useCallback((): RoleCard[] => {
    return [
      {
        role: 'parent',
        label: t('portal.settings.helpCenter.roleGuardians'),
        slug: 'guardians',
        icon: 'family_restroom',
        description: t('portal.settings.helpCenter.roleGuardiansDescription'),
      },
      {
        role: 'coach',
        label: t('portal.settings.helpCenter.roleCoaches'),
        slug: 'coaches',
        icon: 'sports_soccer',
        description: t('portal.settings.helpCenter.roleCoachesDescription'),
      },
      {
        role: 'org_admin',
        label: t('portal.settings.helpCenter.roleOrgAdmins'),
        slug: 'org-admins',
        icon: 'admin_panel_settings',
        description: t('portal.settings.helpCenter.roleOrgAdminsDescription'),
      },
      {
        role: 'athlete',
        label: t('portal.settings.helpCenter.roleAthletes'),
        slug: 'athletes',
        icon: 'person',
        description: t('portal.settings.helpCenter.roleAthletesDescription'),
      },
    ]
  }, [t])

  // Load role category mappings to get category slugs
  const loadData = useCallback(async () => {
    // Show cards immediately with fallback slugs
    const baseCards = getRoleCards()
    setRoleCards(baseCards)
    setLoading(false) // Show content immediately
    
    // Load mappings in background and update cards
    try {
      const mappingsResult = await getRoleCategoryMappings()
      
      if (mappingsResult.error) {
        debug.error('HelpHomepage', 'Failed to load role mappings', { error: mappingsResult.error })
        return
      }

      const mappings = mappingsResult.data || []
      const cardsWithSlugs = baseCards.map(card => {
        const roleMappings = mappings.filter(m => m.role === card.role)
        const roleMapping =
          roleMappings.find(m => m.wordpressCategorySlug === card.slug) ||
          roleMappings[0]
        return {
          ...card,
          categorySlug: roleMapping?.wordpressCategorySlug,
        }
      })

      setRoleCards(cardsWithSlugs)
    } catch (err) {
      debug.error('HelpHomepage', 'Exception loading data', { error: err })
    }
  }, [getRoleCards])

  useEffect(() => {
    loadData()
  }, [loadData])


  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={`${t('portal.settings.helpCenter.heroTitle')} ${t('portal.settings.helpCenter.heroTitleHighlight')}`}
        pageDescription=""
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={null} />}
      >
        <HelpHomepageSkeleton />
      </HelpFeatureLayout>
    )
  }

  return (
    <HelpFeatureLayout
      pageTitle={`${t('portal.settings.helpCenter.heroTitle')} ${t('portal.settings.helpCenter.heroTitleHighlight')}`}
      pageDescription={t('portal.settings.helpCenter.heroSubtitle')}
      sidebarSections={[]}
      headerActions={<HelpHeaderSearch scopeRole={null} />}
      headerRoleSwitcher={undefined}
    >
      <section className="help-uber-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '920px', margin: '0 auto' }}>
        {roleCards.map((card) => {
          const categoryLink = card.categorySlug
            ? getLink('portal.helpCategory', { categorySlug: card.categorySlug })
            : getLink('portal.helpCategory', { categorySlug: card.slug })
          
          return (
            <Link
              key={card.role}
              to={categoryLink}
              className="help-role-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center', minHeight: '132px', padding: '1rem 0.875rem' }}
            >
              <div className="help-role-card-icon" style={{ background: 'transparent' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>{card.icon}</span>
              </div>
              <h3 className="help-role-card-title" style={{ marginTop: '1rem', marginBottom: 0 }}>{card.label}</h3>
            </Link>
          )
        })}
      </section>
    </HelpFeatureLayout>
  )
}
