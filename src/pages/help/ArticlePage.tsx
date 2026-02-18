/**
 * Article Page
 * 
 * Displays a help article with content rendering and tool link support.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getArticleBySlug, getCategoryArticles } from '../../data/services/helpCenterDataService'
import type { HelpArticle } from '../../data/services/helpCenterDataService'
import { replaceToolLinksInHtml } from '../../utils/helpCenter/parseToolLinks'
import { getToolLinkElement } from '../../utils/helpCenter/toolLinkRegistry'
import { navigateToToolLink } from '../../utils/helpCenter/toolLinkNavigation'
import { ToolLinkPopup } from '../../components/help/ToolLinkPopup'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function ArticlePage() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState<HelpArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<HelpArticle[]>([])
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

      // Load related articles (same category, different article)
      const categoryArticlesResult = await getCategoryArticles(categorySlug, userRole)
      if (!categoryArticlesResult.error && categoryArticlesResult.data) {
        const allArticles = [
          ...(categoryArticlesResult.data.sections || []).flatMap(s => s.articles || []),
          ...(categoryArticlesResult.data.generalArticles || []),
        ]
        const related = allArticles
          .filter(a => a && a.id !== result.data?.id)
          .slice(0, 5)
        setRelatedArticles(related)
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="max-w-[1440px] mx-auto px-8 py-24">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0062FF]"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">
              {t('portal.settings.helpCenter.loadingArticle')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="max-w-[1440px] mx-auto px-8 py-24">
          <div className="text-center py-12">
            <h1 className="font-impact font-[900] text-4xl uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">
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

  // Process content to replace tool links (only when article exists)
  const processedContent = article && article.content && handleToolLinkNavigation
    ? replaceToolLinksInHtml(article.content, handleToolLinkNavigation)
    : ''

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
      'onboard': t('portal.settings.helpCenter.categoryNavGettingStarted'),
      'profile': t('portal.settings.helpCenter.categoryNavAccountSettings'),
      'roster': t('portal.settings.helpCenter.categoryNavTeamManagement'),
      'season': t('portal.settings.helpCenter.categoryNavEventsSchedules'),
      'billing': t('portal.settings.helpCenter.categoryNavPaymentsBilling'),
      'comply': t('portal.settings.helpCenter.categoryNavSafetyCompliance'),
    }
    return categoryMap[article.categorySlug || ''] || t('portal.settings.helpCenter.general')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Hero Section */}
      <section className="help-hero-section text-white pt-24 pb-16 px-8">
        <div className="max-w-[1440px] mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">
            <Link to={getLink('portal.help')} className="hover:text-white transition-colors">
              {t('portal.settings.helpCenter.breadcrumbSupport')}
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <Link
              to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}
              className="hover:text-white transition-colors"
            >
              {article.categoryName || ''}
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-[#0062FF]">{article.title || ''}</span>
          </nav>

          {/* Article Title */}
          <h1 className="font-impact font-[900] text-5xl md:text-6xl lg:text-7xl uppercase tracking-tighter leading-none mb-6 max-w-4xl">
            {article.title}
          </h1>

          {/* Article Meta */}
          <div className="flex items-center gap-6 text-sm text-slate-400">
            {article.readingTime && (
              <span className="font-bold uppercase tracking-widest">
                {t('portal.settings.helpCenter.minRead', { minutes: article.readingTime })}
              </span>
            )}
            <span className="font-bold uppercase tracking-widest">
              {t('portal.settings.helpCenter.updated', { date: new Date(article.lastModified).toLocaleDateString() })}
            </span>
            <span className="font-bold uppercase tracking-widest text-[#0062FF]">
              {getArticleCategoryLabel(article)}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="grid grid-cols-12 gap-16">
          {/* Article Content */}
          <article className="col-span-12 lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12">
              <div
                ref={contentRef}
                className="prose prose-lg max-w-none help-article-content dark:prose-invert prose-headings:font-impact prose-headings:uppercase prose-headings:tracking-tighter prose-h1:text-4xl prose-h1:font-[900] prose-h2:text-3xl prose-h2:font-[900] prose-h3:text-2xl prose-h3:font-[900] prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-[#0062FF] prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-4">
            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-12 mb-8">
                <h3 className="font-impact font-black uppercase tracking-widest text-sm mb-12 flex items-center">
                  <span className="w-8 h-[2px] bg-[#0062FF] mr-3"></span>
                  {t('portal.settings.helpCenter.relatedArticles')}
                </h3>
                <ul className="space-y-8">
                  {relatedArticles.map((related) => (
                    <li key={related.id} className="flex items-start group">
                      <span className="material-symbols-outlined text-[#0062FF] mr-4 text-2xl font-bold flex-shrink-0 mt-1">
                        {getArticleIcon(related.categorySlug || '')}
                      </span>
                      <div className="flex-1">
                        <span className="block font-black text-[10px] uppercase tracking-widest opacity-60 mb-1">
                          {getArticleCategoryLabel(related)}
                        </span>
                        <Link
                          to={getLink('portal.helpArticle', {
                            categorySlug: related.categorySlug || '',
                            articleSlug: related.slug || '',
                          })}
                          className="text-lg font-bold leading-tight uppercase tracking-tight group-hover:text-[#0062FF] transition-colors cursor-pointer block"
                        >
                          {related.title}
                        </Link>
                        {related.excerpt && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 normal-case">
                            {related.excerpt}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Back to Category */}
            <Link
              to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}
              className="w-full group flex items-center justify-between p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0062FF] dark:hover:border-[#0062FF] transition-all"
            >
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#0062FF] mr-6 text-3xl">
                  arrow_back
                </span>
                <div className="text-left">
                  <span className="block font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                    {t('portal.settings.helpCenter.breadcrumbSupport')}
                  </span>
                  <span className="font-bold text-lg uppercase tracking-tight">
                    {article.categoryName || ''}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#0062FF] opacity-0 group-hover:opacity-100 transition-opacity">
                arrow_forward
              </span>
            </Link>
          </aside>
        </div>
      </main>

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
