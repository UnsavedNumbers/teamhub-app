/**
 * Article Page
 * 
 * Displays a help article with content rendering and tool link support.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getArticleBySlug, getCategoriesForRole } from '../../data/services/helpCenterDataService'
import type { HelpCategory, HelpArticle } from '../../data/services/helpCenterDataService'
import { replaceToolLinksInHtml } from '../../utils/helpCenter/parseToolLinks'
import { getToolLinkElement } from '../../utils/helpCenter/toolLinkRegistry'
import { navigateToToolLink } from '../../utils/helpCenter/toolLinkNavigation'
import { ToolLinkPopup } from '../../components/help/ToolLinkPopup'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { getMarketingSiteUrl, getHomeLink, getPortalLink, getAdminPortalLink } from '../../utils/helpCenter/helpLinks'
import { APP_NAME } from '../../constants/app'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function ArticlePage() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState<HelpArticle | null>(null)
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [toolLinkPopup, setToolLinkPopup] = useState<{
    element: any
    context?: string
    targetElement: HTMLElement | null
  } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

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
          from: getLink('portal.helpArticle', {
            categorySlug: categorySlug || '',
            articleSlug: articleSlug || '',
          }),
        },
      })
    }
  }, [user, authLoading, navigate, categorySlug, articleSlug])

  const handleToolLinkNavigation = useCallback(async (
    elementId: string,
    context?: string,
    params?: Record<string, string>
  ) => {
    if (!navigate) return
    
    const element = getToolLinkElement(elementId)
    if (!element) {
      console.warn(`Tool link element not found: ${elementId}`)
      return
    }

    // Navigate to route
    await navigateToToolLink(element, context, params, navigate)

    // Find target element after navigation
    setTimeout(() => {
      const targetElement = element.selector
        ? (document.querySelector(element.selector) as HTMLElement)
        : null

      setToolLinkPopup({
        element,
        context,
        targetElement,
      })
    }, 600)
  }, [navigate])

  const loadArticle = useCallback(async () => {
    if (!categorySlug || !articleSlug || !userRole || !t) return

    setLoading(true)
    try {
      // Load article
      const result = await getArticleBySlug(categorySlug, articleSlug)
      if (result.error) {
        if (t) showError(t('errorMessages.fetchFailed'))
        navigate(getLink('portal.helpCategory', { categorySlug: categorySlug || '' }))
        return
      }

      if (!result.data) {
        if (t) showError(t('portal.settings.helpCenter.articleNotFound'))
        navigate(getLink('portal.helpCategory', { categorySlug: categorySlug || '' }))
        return
      }

      setArticle(result.data)

      // Load categories for sidebar navigation
      const categoriesResult = await getCategoriesForRole(userRole)
      if (!categoriesResult.error && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }
    } catch (err) {
      if (t) showError(t('errorMessages.fetchFailed'))
      debug.error('ArticlePage', 'Exception loading article', { error: err })
    } finally {
      setLoading(false)
    }
  }, [categorySlug, articleSlug, userRole, t, navigate])

  // Load article
  useEffect(() => {
    if (categorySlug && articleSlug && userRole) {
      loadArticle()
    }
  }, [categorySlug, articleSlug, userRole, loadArticle])

  // Handle tool link clicks
  useEffect(() => {
    if (!contentRef.current || !article) return

    const handleToolLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[data-tool-link-handler]')
      if (!link) return

      e.preventDefault()
      const elementId = link.getAttribute('data-tool-link-id')
      const context = link.getAttribute('data-tool-link-context')
      const paramsAttr = link.getAttribute('data-tool-link-params')

      if (!elementId) return

      let params: Record<string, string> | undefined
      if (paramsAttr) {
        try {
          params = JSON.parse(paramsAttr)
        } catch {
          // Ignore
        }
      }

      handleToolLinkNavigation(elementId, context || undefined, params)
    }

    contentRef.current.addEventListener('click', handleToolLinkClick)
    return () => {
      contentRef.current?.removeEventListener('click', handleToolLinkClick)
    }
  }, [article, handleToolLinkNavigation])

  // Process content to add IDs to headings for navigation
  const processContentWithHeadingIds = useCallback((html: string) => {
    if (!html) return html
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Add IDs to h2 headings
    const headings = tempDiv.querySelectorAll('h2')
    headings.forEach((h2, index) => {
      const id = `heading-${index}`
      h2.id = id
    })
    
    return tempDiv.innerHTML
  }, [])

  // Extract headings from content for "On This Page" navigation
  const extractHeadings = useCallback(() => {
    if (!contentRef.current) return []
    const headings = contentRef.current.querySelectorAll('h2')
    return Array.from(headings).map((h2, index) => ({
      id: h2.id || `heading-${index}`,
      text: h2.textContent || '',
    }))
  }, [])

  const [headings, setHeadings] = useState<Array<{ id: string; text: string }>>([])

  useEffect(() => {
    if (article) {
      // Wait for content to render, then extract headings
      setTimeout(() => {
        setHeadings(extractHeadings())
      }, 100)
    }
  }, [article, extractHeadings])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto px-8 py-24">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0062FF]"></div>
            <p className="mt-4 text-slate-600 font-bold uppercase tracking-widest text-sm">
              {t('portal.settings.helpCenter.loadingArticle')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto px-8 py-24">
          <div className="text-center py-12">
            <h1 className="font-impact font-[900] text-4xl uppercase tracking-tighter mb-6 text-slate-900">
              {t('portal.settings.helpCenter.articleNotFound')}
            </h1>
            <Link
              to={getLink('portal.help')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0062FF] text-white font-black uppercase tracking-widest text-sm hover:bg-[#0052CC] transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Process content to replace tool links and add heading IDs
  const processedContent = article && article.content && handleToolLinkNavigation
    ? (() => {
        const withToolLinks = replaceToolLinksInHtml(article.content, handleToolLinkNavigation)
        return processContentWithHeadingIds(withToolLinks)
      })()
    : ''

  // Helper to get category label
  const getArticleCategoryLabel = (article: HelpArticle): string => {
    const categoryMap: Record<string, string> = {
      'onboard': t('portal.settings.helpCenter.categoryNavGettingStarted'),
      'profile': t('portal.settings.helpCenter.categoryNavAccountSettings'),
      'roster': t('portal.settings.helpCenter.categoryNavTeamManagement'),
      'season': t('portal.settings.helpCenter.categoryNavEventsSchedules'),
      'billing': t('portal.settings.helpCenter.categoryNavPaymentsBilling'),
      'comply': t('portal.settings.helpCenter.categoryNavSafetyCompliance'),
    }
    return categoryMap[article.categorySlug || ''] || article.categoryName || t('portal.settings.helpCenter.general')
  }

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto flex">
        {/* Left Sidebar Navigation */}
        <aside className="w-80 border-r border-slate-200 min-h-[calc(100vh-80px)] p-8 sticky top-20 hidden lg:block">
          <nav className="space-y-12">
            {/* Main Categories */}
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                {getArticleCategoryLabel(article).toUpperCase()}
              </h5>
              <ul className="space-y-4">
                {categories.slice(0, 4).map((category) => (
                  <li key={category.id}>
                    <Link
                      to={getLink('portal.helpCategory', { categorySlug: category.slug })}
                      className={`block text-sm font-bold uppercase tracking-tight ${
                        category.slug === categorySlug
                          ? 'text-[#0062FF]'
                          : 'text-slate-500 hover:text-[#0062FF]'
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
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
                        className={`block text-sm font-bold uppercase tracking-tight ${
                          category.slug === categorySlug
                            ? 'text-[#0062FF]'
                            : 'text-slate-500 hover:text-[#0062FF]'
                        }`}
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
            <Link
              to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}
              className="hover:text-[#0062FF]"
            >
              {article.categoryName || ''}
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">{article.title || ''}</span>
          </nav>

          {/* Article Header */}
          <header className="mb-16">
            <h1 className="font-impact font-[900] text-7xl md:text-[90px] uppercase tracking-tighter leading-[0.85] mb-10 text-slate-900">
              {article.title}
            </h1>
            <div className="flex items-center space-x-8 border-y border-slate-200 py-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Last Updated
                </span>
                <span className="text-sm font-bold font-impact uppercase tracking-tight">
                  {formatDate(article.lastModified)}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Read Time
                </span>
                <span className="text-sm font-bold font-impact uppercase tracking-tight">
                  {article.readingTime || 4} MIN
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Category
                </span>
                <Link
                  to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}
                  className="text-sm font-bold font-impact uppercase tracking-tight text-[#0062FF] hover:underline"
                >
                  {getArticleCategoryLabel(article)}
                </Link>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <article className="prose prose-slate max-w-none">
            <div
              ref={contentRef}
              className="help-article-content prose-headings:font-impact prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-slate-900 prose-headings:font-black prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-p:text-xl prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-normal prose-p:mb-12 prose-strong:text-slate-900 prose-strong:font-bold"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </article>

          {/* Was This Helpful Section */}
          <section className="border-t border-slate-200 pt-16 mt-24">
            <div className="bg-slate-900 text-white p-12 text-center">
              <h3 className="font-impact font-black text-2xl uppercase tracking-tight mb-8">
                WAS THIS HELPFUL?
              </h3>
              <div className="flex justify-center space-x-6">
                <button
                  className="bg-white text-slate-900 px-12 py-6 font-impact font-black text-xl uppercase tracking-widest hover:bg-[#0062FF] hover:text-white border-2 border-transparent transition-all relative"
                  style={{
                    boxShadow: '0 8px 0 0 rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(6px)'
                    e.currentTarget.style.boxShadow = '0 2px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                >
                  YES
                </button>
                <button
                  className="bg-slate-800 text-white px-12 py-6 font-impact font-black text-xl uppercase tracking-widest hover:bg-red-600 border-2 border-slate-700 transition-all relative"
                  style={{
                    boxShadow: '0 8px 0 0 rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(6px)'
                    e.currentTarget.style.boxShadow = '0 2px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 0 0 rgba(0, 0, 0, 0.1)'
                  }}
                >
                  NO
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-24 pb-16 border-t border-slate-200 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center space-x-8">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {APP_NAME}
                </span>
              </div>
              <div className="flex space-x-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
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
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 p-8 pt-20 hidden xl:block">
          <div className="space-y-12">
            {/* On This Page Navigation */}
            {headings.length > 0 && (
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
                  ON THIS PAGE
                </h5>
                <nav className="space-y-4 border-l border-slate-200 pl-6">
                  {headings.map((heading, index) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-xs font-bold uppercase tracking-widest ${
                        index === 0 ? 'text-[#0062FF]' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Need More Help Section */}
            <div className="bg-slate-50 p-6">
              <span className="material-symbols-outlined text-[#0062FF] mb-4 block">support_agent</span>
              <h5 className="text-sm font-black uppercase tracking-tight mb-2">Need more help?</h5>
              <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-tighter">
                Live support available 24/7 for Enterprise admins.
              </p>
              <Link
                to={getLink('portal.help')}
                className="text-[10px] font-black text-[#0062FF] uppercase tracking-[0.2em] flex items-center hover:underline"
              >
                Contact Support <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Tool Link Popup */}
      {toolLinkPopup && (
        <ToolLinkPopup
          element={toolLinkPopup.element}
          context={toolLinkPopup.context}
          targetElement={toolLinkPopup.targetElement}
          onClose={() => setToolLinkPopup(null)}
        />
      )}
    </div>
  )
}
