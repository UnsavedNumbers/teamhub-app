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
import { getMarketingSiteUrl, getHomeLink, getPortalLink, getAdminPortalLink } from '../../utils/helpCenter/helpLinks'
import { APP_NAME } from '../../constants/app'
import { showError } from '../../utils/toast'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

// Helper to get category navigation items with translations
function getCategoryNavItems(t: (key: any) => string) {
  return [
    { slug: 'onboard', labelKey: 'categoryNavGettingStarted', titleKey: 'categoryNavGettingStarted' },
    { slug: 'profile', labelKey: 'categoryNavAccountSettings', titleKey: 'categoryNavAccount' },
    { slug: 'roster', labelKey: 'categoryNavTeamManagement', titleKey: 'categoryNavTeams' },
    { slug: 'season', labelKey: 'categoryNavEventsSchedules', titleKey: 'categoryNavEvents' },
    { slug: 'billing', labelKey: 'categoryNavPaymentsBilling', titleKey: 'categoryNavBilling' },
    { slug: 'comply', labelKey: 'categoryNavSafetyCompliance', titleKey: 'categoryNavSafety' },
  ].map(item => ({
    slug: item.slug,
    label: t(`portal.settings.helpCenter.${item.labelKey}`),
    title: t(`portal.settings.helpCenter.${item.titleKey}`),
  }))
}

export default function HelpContactPage() {
  const t = useT()
  const { user, profile, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState<HelpCategory[]>([])
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <div className="max-w-[1440px] mx-auto flex">
        {/* Left Sidebar Navigation */}
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-80px)] p-8 sticky top-20 hidden lg:block">
          <nav className="space-y-12">
            {/* Back to Help Center */}
            <div>
              <Link
                to={getLink('portal.help')}
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-slate-500 hover:text-[#0062FF] transition-colors mb-6"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {t('portal.settings.helpCenter.backToHelp')}
              </Link>
            </div>

            {/* Main Categories */}
            {categories.length > 0 && (
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                  CATEGORIES
                </h5>
                <ul className="space-y-4">
                  {categories.slice(0, 4).map((category) => (
                    <li key={category.id}>
                      <Link
                        to={getLink('portal.helpCategory', { categorySlug: category.slug })}
                        className="block text-sm font-bold uppercase tracking-tight text-slate-500 hover:text-[#0062FF] transition-colors"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Additional Categories */}
            {categories.length > 4 && (
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                  MORE CATEGORIES
                </h5>
                <ul className="space-y-4">
                  {categories.slice(4).map((category) => (
                    <li key={category.id}>
                      <Link
                        to={getLink('portal.helpCategory', { categorySlug: category.slug })}
                        className="block text-sm font-bold uppercase tracking-tight text-slate-500 hover:text-[#0062FF] transition-colors"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-8 md:px-16 py-16 max-w-5xl">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-12">
            <Link to={getLink('portal.help')} className="hover:text-[#0062FF]">
              {t('portal.settings.helpCenter.breadcrumbSupport')}
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900 dark:text-slate-100">{t('contact.title.help')}</span>
          </nav>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="font-impact font-[900] text-7xl md:text-[90px] uppercase tracking-tighter leading-[0.85] mb-10 text-slate-900 dark:text-slate-100">
              {t('contact.title.help')}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
              {t('contact.subtitle.help')}
            </p>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
            <ContactForm
              surface="help"
              subjects={HELP_CONTACT_SUBJECTS}
              requireName={true}
              requireEmail={true}
            />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-[1440px] mx-auto px-8 pb-16 mt-24">
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-8">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {APP_NAME}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0062FF]">
              {t('portal.settings.helpCenter.footerStatus')}
            </span>
          </div>
          <div className="flex space-x-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Link to={getLink('portal.help')} className="hover:text-[#0062FF] transition-colors">{t('portal.settings.helpCenter.footerKnowledgeBase')}</Link>
            <Link to={getLink('portal.helpContact')} className="hover:text-[#0062FF] transition-colors">{t('contact.title.help')}</Link>
            <Link to={getHomeLink(userRole)} className="hover:text-[#0062FF] transition-colors">Home</Link>
            {(userRole === 'parent' || userRole === 'athlete') && (
              <Link to={getPortalLink()} className="hover:text-[#0062FF] transition-colors">Portal</Link>
            )}
            {userRole === 'org_admin' && (
              <Link to={getAdminPortalLink()} className="hover:text-[#0062FF] transition-colors">Admin Portal</Link>
            )}
            <a href={getMarketingSiteUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-[#0062FF] transition-colors">YouthSports.team</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
