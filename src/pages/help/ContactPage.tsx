/**
 * Help Contact Page
 * 
 * Public contact page for help center. Accessible to all users (may require auth).
 */

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getCategoriesForRole } from '../../data/services/helpCenterDataService'
import type { HelpCategory } from '../../data/services/helpCenterDataService'
import { ContactForm } from '../../components/contact/ContactForm'
import { HELP_CONTACT_SUBJECTS } from '../../types/contact'
import { useT } from '../../i18n/useI18n'
import { getLink } from '../../utils/routes'
import { showError } from '../../utils/toast'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpRoleSwitcher } from '../../components/help/HelpRoleSwitcher'
import { ContactPageSkeleton } from '../../components/help/HelpSkeletons'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function HelpContactPage() {
  const t = useT()
  const { profile, loading: authLoading } = useAuth()
  const [, setCategories] = useState<HelpCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Get user role with safe access
  const userRole: UserRole | null = profile && profile.role
    ? (mapAuthRoleToStandardRole(
        profile.role,
        profile.isPlatformAdmin ?? false,
        profile.organizations || []
      ) as UserRole)
    : null

  const loadCategories = useCallback(async () => {
    if (!userRole) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await getCategoriesForRole(userRole)
      if (result.error) {
        showError(t('errorMessages.fetchFailed'))
      } else {
        setCategories(result.data || [])
      }
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [userRole, t])

  useEffect(() => {
    if (!authLoading && userRole) {
      loadCategories()
    }
  }, [authLoading, userRole, loadCategories])

  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={t('contact.title.help')}
        pageDescription={t('portal.settings.helpCenter.loading')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={undefined} />}
      >
        <ContactPageSkeleton />
      </HelpFeatureLayout>
    )
  }

  return (
    <HelpFeatureLayout
      pageTitle={t('contact.title.help')}
      pageDescription={t('contact.subtitle.help')}
      sidebarSections={[]}
      headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
      headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={undefined} />}
    >
      <nav className="help-uber-breadcrumb" aria-label={t('portal.settings.helpCenter.breadcrumbHelpCenter')}>
        <Link to={getLink('portal.help')}>{t('portal.settings.helpCenter.breadcrumbHelpCenter')}</Link>
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <span>{t('contact.title.help')}</span>
      </nav>

      <section className="help-uber-card">
        <ContactForm
          surface="help"
          subjects={HELP_CONTACT_SUBJECTS}
          requireName={true}
          requireEmail={true}
        />
      </section>
    </HelpFeatureLayout>
  )
}
