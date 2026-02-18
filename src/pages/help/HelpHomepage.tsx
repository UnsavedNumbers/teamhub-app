/**
 * Help Center Homepage
 * 
 * Main entry point for the help center homepage.
 * Implements the exact layout from designs/helpcenter/code.html
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getCategoriesForRole, searchArticles, getCategoryArticles } from '../../data/services/helpCenterDataService'
import type { HelpCategory, HelpArticle } from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { getLink } from '../../utils/routes'
import { debug } from '../../lib/debug'
import { useT } from '../../i18n/useI18n'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

// Helper to get category navigation items with translations
function getCategoryNavItems(t: (key: string) => string) {
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

export default function HelpHomepage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<HelpArticle[]>([])

  // Get user role with safe access
  const userRole: UserRole | null = profile && profile.role
    ? (mapAuthRoleToStandardRole(
        profile.role,
        profile.isPlatformAdmin ?? false,
        profile.organizations || []
      ) as UserRole)
    : null

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(getLink('auth.login'), { state: { from: getLink('portal.help') } })
    }
  }, [user, authLoading, navigate])

  // Load data
  const loadData = useCallback(async () => {
    if (!userRole) return

    setLoading(true)
    try {
      // Load categories
      const categoriesResult = await getCategoriesForRole(userRole)
      if (categoriesResult.error) {
        showError(t('errorMessages.fetchFailed'))
        return
      }
      setCategories(categoriesResult.data || [])

      // Load popular and trending articles by fetching from multiple categories
      const allArticles: HelpArticle[] = []
      const categorySlugs = (categoriesResult.data || []).slice(0, 6).map(cat => cat.slug)
      
      for (const slug of categorySlugs) {
        const articlesResult = await getCategoryArticles(slug, userRole)
        if (!articlesResult.error && articlesResult.data) {
          const generalArticles: HelpArticle[] = articlesResult.data.generalArticles || []
          const sectionArticles: HelpArticle[] = (articlesResult.data.sections || [])
            .flatMap(section => section.articles || [])
          allArticles.push(...generalArticles, ...sectionArticles)
        }
      }

      // Popular: first 3 articles
      setPopularArticles(allArticles.slice(0, 3))
      // Trending: next 5 articles
      setTrendingArticles(allArticles.slice(3, 8))
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
      debug.error('HelpHomepage', 'Exception loading data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [userRole, t])

  useEffect(() => {
    if (userRole) {
      loadData()
    }
  }, [userRole, loadData])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || !userRole || !t) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearching(true)
      try {
        const result = await searchArticles(query, userRole)
        if (result.error) {
          console.error('Search error:', result.error)
          setSearchResults([])
        } else {
          setSearchResults(result.data || [])
          setShowSearchResults(true)
        }
      } catch (err) {
        console.error('Search exception:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300),
    [userRole, t]
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target instanceof HTMLInputElement === false) {
        e.preventDefault()
        const searchInput = document.getElementById('help-search-input')
        searchInput?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Helper to get icon for article category
  const getArticleIcon = (categorySlug: string): string => {
    const iconMap: Record<string, string> = {
      'onboard': 'menu_book',
      'profile': 'person',
      'roster': 'groups',
      'season': 'event',
      'billing': 'payments',
      'comply': 'security',
    }
    return iconMap[categorySlug] || 'article'
  }

  // Helper to get category label
  const getArticleCategoryLabel = (article: HelpArticle): string => {
    const categoryMap: Record<string, string> = {
      'onboard': 'Getting Started',
      'profile': 'Account Settings',
      'roster': 'Team Management',
      'season': 'Events & Schedules',
      'billing': 'Payments & Billing',
      'comply': 'Safety & Compliance',
    }
    return categoryMap[article.categorySlug || ''] || 'Documentation'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">{t('portal.settings.helpCenter.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">{t('portal.settings.helpCenter.roleError')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Hero Section */}
      <section className="help-hero-section text-white pt-24 pb-32 px-8">
        <div className="max-w-[1440px] mx-auto text-center">
          {/* Breadcrumbs */}
          <nav className="flex justify-center items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">
            <span>{t('portal.settings.helpCenter.breadcrumbSupport')}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-[#0062FF]">{t('portal.settings.helpCenter.breadcrumbKnowledge')}</span>
          </nav>

          {/* Main Title */}
          <h1 className="font-impact font-[900] text-7xl md:text-8xl uppercase tracking-tighter leading-none mb-12">
            {t('portal.settings.helpCenter.heroTitle')} <span className="text-[#0062FF]">{t('portal.settings.helpCenter.heroTitleHighlight')}</span>
          </h1>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              id="help-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSearchResults(false), 200)
              }}
              placeholder={t('portal.settings.helpCenter.searchPlaceholder')}
              className="w-full h-20 pl-16 pr-8 bg-white text-slate-900 font-medium text-lg border-none focus:ring-4 focus:ring-[#0062FF]/20 rounded-none shadow-2xl uppercase tracking-tight placeholder:text-slate-400 placeholder:normal-case"
            />
            {searching && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0062FF]"></div>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                {searchResults.map((article) => (
                  <Link
                    key={article.id}
                    to={getLink('portal.helpArticle', {
                      categorySlug: article.categorySlug || '',
                      articleSlug: article.slug || '',
                    })}
                    className="block px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      setShowSearchResults(false)
                      setSearchQuery('')
                    }}
                  >
                    <div className="font-semibold text-gray-900">{article.title || ''}</div>
                    <div className="text-sm text-gray-500 mt-1">{article.categoryName || ''}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt || ''}</div>
                  </Link>
                ))}
              </div>
            )}

            {showSearchResults && searchQuery && searchResults.length === 0 && !searching && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-6 text-center text-gray-500">
                {t('portal.settings.helpCenter.noResults', { query: searchQuery })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category Navigation Bar */}
      <section className="max-w-[1440px] mx-auto px-8 -mt-16 relative z-10">
        <div className="bg-white dark:bg-slate-900 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100 dark:divide-slate-800">
          {getCategoryNavItems(t).map((item) => {
            const category = categories.find(cat => cat.slug === item.slug)
            if (!category) return null
            
            return (
              <Link
                key={item.slug}
                to={getLink('portal.helpCategory', { categorySlug: item.slug })}
                className="p-10 group hover:bg-[#0062FF] transition-all duration-300"
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white/60 mb-2">
                  {item.label}
                </span>
                <span className="block font-impact font-[900] text-4xl leading-none group-hover:text-white uppercase">
                  {item.title}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-8 py-24">
        <div className="grid grid-cols-12 gap-16">
          {/* Popular Resources */}
          <div className="col-span-12 lg:col-span-7">
            <h3 className="font-impact font-[900] text-4xl uppercase tracking-tighter mb-12 flex items-center">
              <span className="w-12 h-1 bg-[#0062FF] mr-6"></span>
              {t('portal.settings.helpCenter.popularResources')}
            </h3>
            <div className="space-y-4">
              {popularArticles.length === 0 ? (
                <p className="text-slate-500">{t('portal.settings.helpCenter.noPopularResources')}</p>
              ) : (
                popularArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={getLink('portal.helpArticle', {
                      categorySlug: article.categorySlug || '',
                      articleSlug: article.slug || '',
                    })}
                    className="w-full group flex items-center justify-between p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0062FF] dark:hover:border-[#0062FF] transition-all"
                  >
                    <div className="flex items-center">
                      <span className={`material-symbols-outlined text-slate-400 group-hover:text-[#0062FF] mr-6 text-3xl`}>
                        {getArticleIcon(article.categorySlug)}
                      </span>
                      <div className="text-left">
                        <span className="block font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                          {getArticleCategoryLabel(article)}
                        </span>
                        <span className="font-bold text-lg uppercase tracking-tight">{article.title}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[#0062FF] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-12">
              <h3 className="font-impact font-black uppercase tracking-widest text-sm mb-12 flex items-center">
                <span className="w-8 h-[2px] bg-[#0062FF] mr-3"></span>
                {t('portal.settings.helpCenter.trendingTopics')}
              </h3>
              {trendingArticles.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500">{t('portal.settings.helpCenter.noTrendingTopics')}</p>
              ) : (
                <ul className="space-y-8">
                  {trendingArticles.map((article) => (
                    <li key={article.id} className="flex items-start group">
                      <span className="material-symbols-outlined text-[#0062FF] mr-4 text-2xl font-bold">check_circle</span>
                      <div>
                        <span className="block font-black text-[10px] uppercase tracking-widest opacity-60 mb-1">
                          {getArticleCategoryLabel(article)}
                        </span>
                        <Link
                          to={getLink('portal.helpArticle', {
                            categorySlug: article.categorySlug || '',
                            articleSlug: article.slug || '',
                          })}
                          className="text-lg font-bold leading-tight uppercase tracking-tight group-hover:text-[#0062FF] transition-colors cursor-pointer block"
                        >
                          {article.title}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to={getLink('portal.help')}
                className="mt-12 w-full py-4 border-2 border-slate-700 dark:border-slate-200 font-black text-xs uppercase tracking-[0.3em] hover:bg-[#0062FF] hover:border-[#0062FF] transition-all block text-center"
              >
                {t('portal.settings.helpCenter.viewAllTopics')}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1440px] mx-auto px-8 pb-16">
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-8">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {t('portal.settings.helpCenter.footerVersion')}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0062FF]">
              {t('portal.settings.helpCenter.footerStatus')}
            </span>
          </div>
          <div className="flex space-x-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <a href="#" className="hover:text-[#0062FF] transition-colors">{t('portal.settings.helpCenter.footerKnowledgeBase')}</a>
            <a href="#" className="hover:text-[#0062FF] transition-colors">{t('portal.settings.helpCenter.footerDeveloperApi')}</a>
            <a href="#" className="hover:text-[#0062FF] transition-colors">{t('portal.settings.helpCenter.footerSupportTicket')}</a>
            <a href="#" className="hover:text-[#0062FF] transition-colors">{t('portal.settings.helpCenter.footerServiceStatus')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
