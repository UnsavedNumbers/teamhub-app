/**
 * Category Landing Page
 *
 * Displays a role category and its child categories with article lists.
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import {
  getCategoryDetails,
  getCategoryArticles,
  getCategorySubcategoryGroups,
  searchArticles,
} from '../../data/services/helpCenterDataService'
import type {
  HelpCategory,
  HelpSection,
  HelpArticle,
  HelpSubcategoryGroup,
} from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink, getPath } from '../../utils/routes'
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
  const [subcategoryGroups, setSubcategoryGroups] = useState<HelpSubcategoryGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const userRole: UserRole | null = profile && profile.role
    ? (mapAuthRoleToStandardRole(
        profile.role,
        profile.isPlatformAdmin ?? false,
        profile.organizations || []
      ) as UserRole)
    : null

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(getLink('auth.login'), {
        state: {
          from: getLink('portal.helpCategory', { categorySlug: categorySlug || '' }),
        },
      })
    }
  }, [authLoading, categorySlug, navigate, user])

  const loadCategoryData = useCallback(async () => {
    if (!categorySlug || !userRole) return

    if (window.location.hostname === 'localhost') {
      console.log('[CategoryLandingPage] 🚀 Loading category data')
      console.log('[CategoryLandingPage] 📍 Requested category slug:', categorySlug)
      console.log('[CategoryLandingPage] 👤 User role:', userRole)
    }

    setLoading(true)
    try {
      const categoryResult = await getCategoryDetails(categorySlug)
      if (categoryResult.error || !categoryResult.data) {
        if (window.location.hostname === 'localhost') {
          console.error('[CategoryLandingPage] ❌ Category not found:', categorySlug)
        }
        showError(t('portal.settings.helpCenter.categoryNotFound'))
        navigate(getLink('portal.help'))
        return
      }
      setCategory(categoryResult.data)

      if (window.location.hostname === 'localhost') {
        console.log('[CategoryLandingPage] ✅ Category found:', {
          id: categoryResult.data.id,
          name: categoryResult.data.name,
          slug: categoryResult.data.slug,
          parentId: categoryResult.data.parentId
        })
        console.log('[CategoryLandingPage] 🔄 Fetching articles and subcategories...')
      }

      const [articlesResult, childCategoriesResult] = await Promise.all([
        getCategoryArticles(categorySlug, userRole),
        getCategorySubcategoryGroups(categorySlug),
      ])

      if (articlesResult.error) {
        debug.data('CategoryLandingPage', 'Error loading articles, continuing with empty articles', { error: articlesResult.error })
      }
      if (childCategoriesResult.error) {
        debug.data('CategoryLandingPage', 'Error loading subcategories, continuing with empty subcategories', { error: childCategoriesResult.error })
      }

      setSections(articlesResult.data?.sections || [])
      setGeneralArticles(articlesResult.data?.generalArticles || [])
      setSubcategoryGroups(childCategoriesResult.data || [])

      if (window.location.hostname === 'localhost') {
        console.log('[CategoryLandingPage] ✅ Data loaded successfully')
        console.log('[CategoryLandingPage] 📊 Subcategory groups:', childCategoriesResult.data?.length || 0)
        if (childCategoriesResult.data && childCategoriesResult.data.length > 0) {
          childCategoriesResult.data.forEach((group, idx) => {
            console.log(`[CategoryLandingPage] 📊 Group ${idx + 1}: "${group.name}" (slug: ${group.slug}) - ${group.articles?.length || 0} articles`)
            if (group.articles && group.articles.length > 0) {
              console.log(`[CategoryLandingPage] 📄 Articles in "${group.name}":`, group.articles.map(a => ({ id: a.id, title: a.title, slug: a.slug })))
            }
          })
        }
        console.log('[CategoryLandingPage] 📊 Direct articles:', generalArticles.length)
        console.log('[CategoryLandingPage] 📊 Sections:', sections.length)
      }

      debug.data('CategoryLandingPage', 'Loaded data successfully', {
        categorySlug,
        subcategoryGroups: childCategoriesResult.data,
        subcategoryCount: childCategoriesResult.data?.length || 0,
        articlesCount: childCategoriesResult.data?.reduce((sum, group) => sum + (group.articles?.length || 0), 0) || 0,
      })
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
      debug.error('CategoryLandingPage', 'Exception loading category data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [categorySlug, navigate, t, userRole])

  useEffect(() => {
    if (categorySlug && userRole) {
      loadCategoryData()
    }
  }, [categorySlug, loadCategoryData, userRole])

  const directArticles = useMemo(() => {
    const fromSections = sections.flatMap(section => section.articles || [])
    const all = [...fromSections, ...generalArticles]
    const seen = new Set<number>()
    return all.filter(article => {
      if (seen.has(article.id)) return false
      seen.add(article.id)
      return true
    })
  }, [generalArticles, sections])

  // Only show articles from child categories (subcategory groups), not direct articles
  const allArticles = useMemo(() => {
    const fromSubcategories = subcategoryGroups.flatMap(group => group.articles || [])
    const seen = new Set<number>()
    const unique = fromSubcategories.filter(article => {
      if (seen.has(article.id)) return false
      seen.add(article.id)
      return true
    })

    if (window.location.hostname === 'localhost') {
      console.log('[CategoryLandingPage] 📚 Final articles to display:', unique.length)
      console.log('[CategoryLandingPage] 📚 Article titles:', unique.map(a => a.title))
      console.log('[CategoryLandingPage] 📚 Article slugs:', unique.map(a => a.slug))
      console.log('[CategoryLandingPage] 📚 Article category slugs:', unique.map(a => a.categorySlug))
    }

    return unique
  }, [subcategoryGroups])

  // Search functionality
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!searchQuery.trim() || !userRole) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearching(true)
      try {
        const result = await searchArticles(searchQuery, userRole)
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
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, userRole])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim() && searchResults.length > 0) {
      // Navigate to first result or show results
      const firstResult = searchResults[0]
      navigate(getLink('portal.helpArticle', {
        categorySlug: firstResult.categorySlug || '',
        articleSlug: firstResult.slug || '',
      }))
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101922]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
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
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101922]">
      <section
        className="relative bg-[#101922] py-24 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 50% -20%, rgba(13, 127, 242, 0.15) 0%, rgba(16, 25, 34, 1) 70%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
            backgroundColor: '#1a242d',
            pointerEvents: 'none',
          }}
        ></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <nav className="flex justify-center gap-2 text-[#0d7ff2]/60 text-xs font-semibold uppercase tracking-widest mb-6">
            <Link to={getLink('portal.help')} className="hover:text-[#0d7ff2]">
              {t('portal.settings.helpCenter.breadcrumbSupport')}
            </Link>
            <span>/</span>
            <span className="text-[#0d7ff2]">{category.name}</span>
          </nav>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tighter">
            {category.name}
          </h1>

          {category.description && (
            <p className="text-slate-400 text-lg mb-10 font-light max-w-2xl mx-auto">
              {category.description.replace(/<[^>]*>/g, '').substring(0, 220)}
            </p>
          )}

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-32 py-5 rounded-xl bg-white text-slate-900 border-none focus:ring-4 focus:ring-[#0d7ff2]/40 text-lg placeholder:text-slate-400 shadow-2xl shadow-[#0d7ff2]/20"
              placeholder={`Search ${category.name.toLowerCase()} guides, articles, and FAQs...`}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-[#0d7ff2] text-white px-6 rounded-lg font-bold hover:bg-[#0d7ff2]/90 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        {/* Display Subcategory Groups as Tiles */}
        {subcategoryGroups.length > 0 && (
          <>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Base</h3>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Browse technical documentation and FAQs</p>
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

            {/* Subcategory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {subcategoryGroups.map((group) => {
                const categoryLink = `${getPath('portal.help')}/${categorySlug || ''}/${group.slug || ''}`
                const articleCount = group.articles?.length || 0

                return (
                  <Link
                    key={group.id}
                    to={categoryLink}
                    className="group relative bg-[#1a242d] border border-slate-800 rounded-xl p-6 flex flex-col justify-between h-full card-hover"
                  >
                    <div
                      className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity rounded-xl"
                      style={{
                        backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
                        backgroundSize: '24px 24px',
                        backgroundColor: '#1a242d',
                        pointerEvents: 'none',
                      }}
                    ></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-lg bg-[#0d7ff2]/10 flex items-center justify-center text-[#0d7ff2]">
                          <span className="material-symbols-outlined text-xl">folder_open</span>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-[#0d7ff2] transition-colors">
                        {group.name}
                      </h4>
                      <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
                        {group.description || `${articleCount} article${articleCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-800 pt-4 mt-auto">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">article</span>
                        {articleCount} article{articleCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[#0d7ff2] flex items-center gap-1">
                        Browse <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Display Articles within Subcategories */}
        {allArticles.length > 0 && (
          <>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">All Articles</h3>
                <p className="text-slate-500 dark:text-slate-400 font-sans">Featured articles and resources</p>
              </div>
            </div>

            {/* Article Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allArticles.map((article) => {
                const articleCategorySlug = article.categorySlug || category.slug || ''
                const isNew = article.lastModified && new Date(article.lastModified) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                const isUpdated = article.lastModified && new Date(article.lastModified) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) && !isNew

                const articleLink = (() => {
                  if (article.categoryPath && article.categoryPath.length > 1) {
                    const parentPath = article.categoryPath.slice(0, -1).filter(slug => slug !== 'help')
                    if (parentPath.length === 1) {
                      return getLink('portal.helpArticleNested', {
                        parentCategorySlug: parentPath[0],
                        categorySlug: article.categorySlug || '',
                        articleSlug: article.slug || '',
                      })
                    }
                    return `${getPath('portal.help')}/${parentPath.join('/')}/${article.categorySlug}/${article.slug}`
                  }
                  return getLink('portal.helpArticle', {
                    categorySlug: articleCategorySlug,
                    articleSlug: article.slug || '',
                  })
                })()

                return (
                  <Link
                    key={article.id}
                    to={articleLink}
                    className="group relative bg-[#1a242d] border border-slate-800 rounded-xl p-6 flex flex-col justify-between h-full card-hover"
                  >
                    <div
                      className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity rounded-xl"
                      style={{
                        backgroundImage: 'radial-gradient(#0d7ff2 0.5px, transparent 0.5px)',
                        backgroundSize: '24px 24px',
                        backgroundColor: '#1a242d',
                        pointerEvents: 'none',
                      }}
                    ></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#0d7ff2]/10 flex items-center justify-center text-[#0d7ff2]">
                          <span className="material-symbols-outlined">article</span>
                        </div>
                        {isNew && (
                          <span className="bg-[#0d7ff2] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter">NEW</span>
                        )}
                        {isUpdated && !isNew && (
                          <span className="bg-slate-700 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter uppercase">UPDATED</span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-[#0d7ff2] transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
                        {article.excerpt || ''}
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-800 pt-4 mt-auto">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {article.readingTime || '5'} min
                      </span>
                      <span className="text-[#0d7ff2] hover:underline flex items-center gap-1">
                        Read article <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {subcategoryGroups.length === 0 && allArticles.length === 0 && (
          <div className="bg-white dark:bg-[#1a242d] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              {t('portal.settings.helpCenter.noArticles')}
            </h2>
            <Link
              to={getLink('portal.help')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0d7ff2] text-white font-semibold rounded-lg hover:bg-[#0d7ff2]/90 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
