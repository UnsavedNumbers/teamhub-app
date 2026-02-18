/**
 * Category Landing Page
 * 
 * Displays category cover photo, description, and articles organized by sections.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import {
  getCategoryDetails,
  getCategoryArticles,
} from '../../data/services/helpCenterDataService'
import type { HelpCategory, HelpSection, HelpArticle } from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function CategoryLandingPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<HelpCategory | null>(null)
  const [sections, setSections] = useState<HelpSection[]>([])
  const [generalArticles, setGeneralArticles] = useState<HelpArticle[]>([])

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
      navigate(getLink('auth.login'), {
        state: {
          from: getLink('portal.helpCategory', { categorySlug: categorySlug || '' }),
        },
      })
    }
  }, [user, authLoading, navigate, categorySlug])

  const loadCategoryData = useCallback(async () => {
    if (!categorySlug || !userRole) return

    setLoading(true)
    try {
      // Load category details
      const categoryResult = await getCategoryDetails(categorySlug)
      if (categoryResult.error) {
        showError(t('errorMessages.fetchFailed'))
        navigate(getLink('portal.help'))
        return
      }

      if (!categoryResult.data) {
        showError(t('portal.settings.helpCenter.categoryNotFound'))
        navigate(getLink('portal.help'))
        return
      }

      setCategory(categoryResult.data)

      // Load articles
      const articlesResult = await getCategoryArticles(categorySlug, userRole)
      if (articlesResult.error) {
        showError(t('errorMessages.fetchFailed'))
        return
      }

      setSections(articlesResult.data?.sections || [])
      setGeneralArticles(articlesResult.data?.generalArticles || [])
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
      debug.error('CategoryLandingPage', 'Exception loading category data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [categorySlug, userRole, t, navigate])

  // Load category data
  useEffect(() => {
    if (categorySlug && userRole) {
      loadCategoryData()
    }
  }, [categorySlug, userRole, loadCategoryData])

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101922]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d7ff2]"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">
              {t('portal.settings.helpCenter.loading')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101922]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">
              {t('portal.settings.helpCenter.categoryNotFound')}
            </h1>
            <Link
              to={getLink('portal.help')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0d7ff2] text-white font-bold rounded-lg hover:bg-[#0d7ff2]/90 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get featured article (first article from first section, or first general article)
  const featuredArticle = sections.length > 0 && sections[0].articles.length > 0
    ? sections[0].articles[0]
    : generalArticles.length > 0
    ? generalArticles[0]
    : null

  // Get all articles for the grid (excluding featured)
  const gridArticles: HelpArticle[] = []
  sections.forEach(section => {
    section.articles.forEach((article, index) => {
      if (index > 0 || featuredArticle?.id !== article.id) {
        gridArticles.push(article)
      }
    })
  })
  generalArticles.forEach(article => {
    if (featuredArticle?.id !== article.id) {
      gridArticles.push(article)
    }
  })

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101922]">
      {/* Hero Section */}
      <section className="relative bg-[#101922] py-24 overflow-hidden" style={{
        background: 'radial-gradient(circle at 50% -20%, rgba(13, 127, 242, 0.15) 0%, rgba(16, 25, 34, 1) 70%)'
      }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
          backgroundColor: '#1a242d',
          pointerEvents: 'none'
        }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          {/* Breadcrumbs */}
          <nav className="flex justify-center gap-2 text-[#0d7ff2]/60 text-xs font-semibold uppercase tracking-widest mb-6">
            <Link to={getLink('portal.help')} className="hover:text-[#0d7ff2]">
              {t('portal.settings.helpCenter.breadcrumbSupport')}
            </Link>
            <span>/</span>
            <span className="text-[#0d7ff2]">{category.name}</span>
          </nav>

          {/* Category Title */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tighter">
            {category.name}
          </h1>

          {/* Category Description */}
          {category.description && (
            <p className="text-slate-400 text-lg mb-10 font-light max-w-2xl mx-auto">
              {category.description.replace(/<[^>]*>/g, '').substring(0, 150)}
            </p>
          )}

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              className="w-full pl-12 pr-32 py-5 rounded-xl bg-white text-slate-900 border-none focus:ring-4 focus:ring-[#0d7ff2]/40 text-lg placeholder:text-slate-400 shadow-2xl shadow-[#0d7ff2]/20"
              placeholder={t('portal.settings.helpCenter.searchPlaceholder')}
              type="text"
            />
            <button className="absolute right-2 top-2 bottom-2 bg-[#0d7ff2] text-white px-6 rounded-lg font-bold hover:bg-[#0d7ff2]/90 transition-colors">
              {t('common.search')}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 pb-20">
        {sections.length === 0 && generalArticles.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
              {t('portal.settings.helpCenter.noArticles')}
            </h2>
            <Link
              to={getLink('portal.help')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0d7ff2] text-white font-bold rounded-lg hover:bg-[#0d7ff2]/90 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Guide Card */}
            {featuredArticle && (
              <div className="mb-8">
                <div className="relative overflow-hidden bg-[#1a242d] border border-slate-800 rounded-xl p-1 shadow-2xl">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <span className="material-symbols-outlined text-9xl text-[#0d7ff2]">analytics</span>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-8 items-center bg-[#101922]/50 p-8 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{
                      backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
                      backgroundSize: '24px 24px',
                      backgroundColor: '#1a242d',
                      pointerEvents: 'none'
                    }}></div>
                    {/* Featured Image */}
                    {category.coverPhotoUrl && (
                      <div className="w-full lg:w-1/2 aspect-video rounded-lg overflow-hidden border border-slate-700 shadow-inner group">
                        <img
                          alt={category.name}
                          src={category.coverPhotoUrl}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    {/* Content */}
                    <div className="w-full lg:w-1/2 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0d7ff2] text-white text-[10px] font-black px-2 py-1 rounded tracking-tighter">
                          FEATURED GUIDE
                        </span>
                        <span className="text-slate-500 text-xs font-medium uppercase tracking-widest">
                          {featuredArticle.readingTime || 12} MIN READ • UPDATED
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold text-white leading-tight">
                        {featuredArticle.title}
                      </h2>
                      {featuredArticle.excerpt && (
                        <p className="text-slate-400 leading-relaxed">
                          {featuredArticle.excerpt}
                        </p>
                      )}
                      <div className="pt-4 flex gap-4">
                        <Link
                          to={getLink('portal.helpArticle', {
                            categorySlug: category.slug || '',
                            articleSlug: featuredArticle.slug || '',
                          })}
                          className="bg-[#0d7ff2] text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-[#0d7ff2]/30 transition-all flex items-center gap-2"
                        >
                          View Guide <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        <button className="border border-slate-700 text-slate-300 px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition-all">
                          Bookmark
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Base Section */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Base</h3>
                <p className="text-slate-500 dark:text-slate-400">Browse technical documentation and FAQs</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1a242d] transition-colors">
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1a242d] transition-colors">
                  <span className="material-symbols-outlined">list</span>
                </button>
              </div>
            </div>

            {/* Article Grid */}
            {gridArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={getLink('portal.helpArticle', {
                      categorySlug: category.slug || '',
                      articleSlug: article.slug || '',
                    })}
                    className="group relative bg-[#1a242d] border border-slate-800 rounded-xl p-6 flex flex-col justify-between h-full hover:border-[#0d7ff2] hover:-translate-y-0.5 transition-all"
                  >
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{
                      backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
                      backgroundSize: '24px 24px',
                      backgroundColor: '#1a242d',
                      pointerEvents: 'none'
                    }}></div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#0d7ff2]/10 flex items-center justify-center text-[#0d7ff2]">
                          <span className="material-symbols-outlined">{getArticleIcon(category.slug || '')}</span>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-[#0d7ff2] transition-colors">
                        {article.title}
                      </h4>
                      {article.excerpt && (
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-800 pt-4 mt-auto">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {article.readingTime || 5} min
                      </span>
                      <span className="text-[#0d7ff2] hover:underline flex items-center gap-1">
                        Read article <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                {t('portal.settings.helpCenter.noArticles')}
              </div>
            )}

            {/* Still Need Assistance CTA */}
            <div className="mt-16 bg-white dark:bg-[#1a242d] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-[#0d7ff2]/10 flex items-center justify-center text-[#0d7ff2]">
                  <span className="material-symbols-outlined text-3xl">support_agent</span>
                </div>
                <div>
                  <h5 className="text-xl font-bold dark:text-white">Still need assistance?</h5>
                  <p className="text-slate-500 dark:text-slate-400">Our specialized performance support team is online 24/7.</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 dark:text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Live Chat
                </button>
                <button className="flex-1 md:flex-none bg-[#0d7ff2] text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-[#0d7ff2]/30 transition-all">
                  Open Ticket
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
