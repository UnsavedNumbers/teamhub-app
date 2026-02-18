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

  // Load article
  useEffect(() => {
    if (categorySlug && articleSlug && userRole) {
      loadArticle()
    }
  }, [categorySlug, articleSlug, userRole])

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
  }, [article, navigate])

  async function loadArticle() {
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
  }

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">{t('portal.settings.helpCenter.loadingArticle')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">{t('portal.settings.helpCenter.articleNotFound')}</p>
            <Link to={getLink('portal.help')} className="text-blue-600 hover:underline mt-4 inline-block">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <nav className="text-sm text-gray-600">
          <Link to={getLink('portal.help')} className="hover:text-blue-600">
            Help
          </Link>
          <span className="mx-2">/</span>
          <Link
            to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}
            className="hover:text-blue-600"
          >
            {article.categoryName || ''}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{article.title || ''}</span>
        </nav>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {article.readingTime && <span>{t('portal.settings.helpCenter.minRead', { minutes: article.readingTime })}</span>}
            <span>{t('portal.settings.helpCenter.updated', { date: new Date(article.lastModified).toLocaleDateString() })}</span>
          </div>
        </header>

        <div
          ref={contentRef}
          className="prose prose-lg max-w-none help-article-content"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-8 border-t">
          <h2 className="text-2xl font-bold mb-4">{t('portal.settings.helpCenter.relatedArticles')}</h2>
          <div className="space-y-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                to={getLink('portal.helpArticle', {
                  categorySlug: related.categorySlug || '',
                  articleSlug: related.slug || '',
                })}
                className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold mb-1">{related.title || ''}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{related.excerpt || ''}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

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
