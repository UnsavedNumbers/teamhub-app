/**
 * Help Center Homepage
 * 
 * Main entry point for role-scoped help content.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getCategoriesForRole, getCategoryChildArticles, getCategoryArticles, searchArticles } from '../../data/services/helpCenterDataService'
import type { HelpCategory, HelpArticle, HelpCategoryArticleGroup } from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { getLink, getPath } from '../../utils/routes'
import { debug } from '../../lib/debug'
import { useT } from '../../i18n/useI18n'
import { getMarketingSiteUrl, getHomeLink, getPortalLink, getAdminPortalLink } from '../../utils/helpCenter/helpLinks'
import { APP_NAME } from '../../constants/app'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

interface RoleCategoryGroup {
  root: HelpCategory
  children: HelpCategoryArticleGroup[]
}

interface HelpGuideListItem extends HelpArticle {
  linkCategorySlug: string
}

function getGuideIcon(categoryName: string): string {
  const normalized = categoryName.toLowerCase()

  if (normalized.includes('bill') || normalized.includes('payment') || normalized.includes('fee')) return 'payments'
  if (normalized.includes('security') || normalized.includes('safety') || normalized.includes('compliance')) return 'shield'
  if (normalized.includes('team') || normalized.includes('roster') || normalized.includes('staff')) return 'groups'
  if (normalized.includes('event') || normalized.includes('travel') || normalized.includes('schedule')) return 'event'

  return 'description'
}

export default function HelpHomepage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [roleCategoryGroups, setRoleCategoryGroups] = useState<RoleCategoryGroup[]>([])
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

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
      // Load categories mapped to the user role
      const categoriesResult = await getCategoriesForRole(userRole)
      if (categoriesResult.error) {
        showError(t('errorMessages.fetchFailed'))
        return
      }

      const rootCategories = categoriesResult.data || []
      const childCategoryResults = await Promise.all(
        rootCategories.map(async (root) => {
          const childResult = await getCategoryChildArticles(root.slug)
          if (!childResult.error && (childResult.data || []).length > 0) {
            return {
              root,
              error: null,
              children: childResult.data || [],
            }
          }

          const directArticlesResult = await getCategoryArticles(root.slug, userRole)
          if (directArticlesResult.error) {
            return {
              root,
              error: directArticlesResult.error,
              children: [] as HelpCategoryArticleGroup[],
            }
          }

          const sectionArticles = (directArticlesResult.data?.sections || []).flatMap(section => section.articles || [])
          const directArticles = directArticlesResult.data?.generalArticles || []
          const seenArticleIds = new Set<number>()
          const uniqueArticles = [...sectionArticles, ...directArticles].filter(article => {
            if (seenArticleIds.has(article.id)) return false
            seenArticleIds.add(article.id)
            return true
          })

          return {
            root,
            error: null,
            children: uniqueArticles.length > 0
              ? [{
                  id: root.id,
                  name: root.name,
                  slug: root.slug,
                  parentId: root.parentId || 0,
                  depth: 1,
                  articles: uniqueArticles,
                }]
              : [],
          }
        })
      )

      const groups: RoleCategoryGroup[] = []
      for (const group of childCategoryResults) {
        if (group.error) {
          debug.error('HelpHomepage', 'Failed to load child categories', {
            error: group.error,
            rootCategorySlug: group.root.slug,
          })
          continue
        }
        groups.push({
          root: group.root,
          children: group.children,
        })
      }
      setRoleCategoryGroups(groups)
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

  const categoryPills = useMemo(() => {
    const seenCategoryIds = new Set<number>()
    const directChildren: HelpCategoryArticleGroup[] = []

    for (const group of roleCategoryGroups) {
      for (const category of group.children) {
        if (category.depth !== 1 || seenCategoryIds.has(category.id)) {
          continue
        }
        seenCategoryIds.add(category.id)
        directChildren.push(category)
      }
    }

    return directChildren
  }, [roleCategoryGroups])

  useEffect(() => {
    if (activeCategorySlug === 'all') return

    const stillExists = categoryPills.some(category => category.slug === activeCategorySlug)
    if (!stillExists) {
      setActiveCategorySlug('all')
    }
  }, [activeCategorySlug, categoryPills])

  const selectedCategoryName = useMemo(() => {
    if (activeCategorySlug === 'all') {
      return t('portal.settings.helpCenter.allGuides')
    }

    return categoryPills.find(category => category.slug === activeCategorySlug)?.name || t('portal.settings.helpCenter.allGuides')
  }, [activeCategorySlug, categoryPills, t])

  const visibleArticles = useMemo(() => {
    const seenArticleIds = new Set<number>()
    const articles: HelpGuideListItem[] = []

    for (const group of roleCategoryGroups) {
      const relevantCategories = (() => {
        if (activeCategorySlug === 'all') {
          return group.children
        }

        const selectedCategory = group.children.find(
          category => category.depth === 1 && category.slug === activeCategorySlug
        )
        if (!selectedCategory) {
          return [] as HelpCategoryArticleGroup[]
        }

        const includedCategoryIds = new Set<number>([selectedCategory.id])
        let changed = true

        while (changed) {
          changed = false
          for (const category of group.children) {
            if (includedCategoryIds.has(category.parentId) && !includedCategoryIds.has(category.id)) {
              includedCategoryIds.add(category.id)
              changed = true
            }
          }
        }

        return group.children.filter(category => includedCategoryIds.has(category.id))
      })()

      for (const category of relevantCategories) {
        for (const article of category.articles) {
          if (seenArticleIds.has(article.id)) {
            continue
          }
          seenArticleIds.add(article.id)
          articles.push({
            ...article,
            linkCategorySlug: article.categorySlug || category.slug || group.root.slug,
          })
        }
      }
    }

    return articles
  }, [activeCategorySlug, roleCategoryGroups])

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!searchQuery.trim() || !userRole || !t) {
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
  }, [searchQuery, t, userRole])

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
                    to={(() => {
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
                        categorySlug: article.categorySlug || '',
                        articleSlug: article.slug || '',
                      })
                    })()}
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

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-8 py-16">
        {roleCategoryGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <p className="text-slate-500 dark:text-slate-400">{t('portal.settings.helpCenter.noArticles')}</p>
          </div>
        ) : (
          <section className="rounded-2xl bg-[#EFF2F6] border border-slate-200/70 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <nav className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-400">{t('portal.settings.helpCenter.breadcrumbKnowledge')}</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                <span className="font-semibold text-slate-900">{selectedCategoryName}</span>
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategorySlug('all')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    activeCategorySlug === 'all'
                      ? 'bg-[#4F7DE8] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t('portal.settings.helpCenter.allGuides')}
                </button>
                {categoryPills.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategorySlug(category.slug)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      activeCategorySlug === category.slug
                        ? 'bg-[#4F7DE8] text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {visibleArticles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-slate-500">{t('portal.settings.helpCenter.noArticles')}</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {visibleArticles.map((article) => (
                  <li key={article.id}>
                    <Link
                      to={(() => {
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
                          categorySlug: article.linkCategorySlug || '',
                          articleSlug: article.slug || '',
                        })
                      })()}
                      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 hover:border-[#4F7DE8]/30 hover:shadow-sm transition-all"
                    >
                      <div className="h-12 w-12 rounded-xl bg-[#EEF3FF] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#4F7DE8]">{getGuideIcon(article.categoryName || article.title)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 truncate">{article.title}</h3>
                        <p className="mt-1 text-slate-500 line-clamp-2">{article.excerpt || ''}</p>
                      </div>

                      <div className="h-12 w-12 rounded-xl bg-[#4F7DE8] text-white flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <footer className="max-w-[1440px] mx-auto px-8 pb-16">
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
