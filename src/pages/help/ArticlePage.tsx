/**
 * Article Page
 * 
 * Displays a help article with content rendering and tool link support.
 */

import { Fragment, useEffect, useState, useRef, useCallback } from 'react'
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
import { getLink, getPath } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpRoleSwitcher } from '../../components/help/HelpRoleSwitcher'
import { ArticlePageSkeleton } from '../../components/help/HelpSkeletons'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function ArticlePage() {
  const { categorySlug, articleSlug, parentCategorySlug } = useParams<{ categorySlug: string; articleSlug: string; parentCategorySlug?: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState<HelpArticle | null>(null)
  const [, setCategories] = useState<HelpCategory[]>([])
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
      // Load article - use the categorySlug from URL (last segment if nested)
      const actualCategorySlug = categorySlug
      const result = await getArticleBySlug(actualCategorySlug, articleSlug)
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

  const [, setHeadings] = useState<Array<{ id: string; text: string }>>([])

  useEffect(() => {
    if (article) {
      // Wait for content to render, then extract headings
      setTimeout(() => {
        setHeadings(extractHeadings())
      }, 100)
    }
  }, [article, extractHeadings])

  // Determine role slug from article category path
  const getCurrentRoleSlug = useCallback(() => {
    if (!article) return undefined
    if (article.categoryPath && article.categoryPath.length > 1) {
      // First category in path (after 'help') is usually the role
      const pathWithoutHelp = article.categoryPath.filter(slug => slug !== 'help')
      if (pathWithoutHelp.length > 0) {
        const roleMap: Record<string, string> = {
          'guardians': 'guardians',
          'coaches': 'coaches',
          'org-admins': 'org-admins',
          'organization-admins': 'org-admins',
          'athletes': 'athletes',
        }
        return roleMap[pathWithoutHelp[0]] || pathWithoutHelp[0]
      }
    }
    // Fallback: try to extract from categorySlug or parentCategorySlug
    if (parentCategorySlug) {
      const roleMap: Record<string, string> = {
        'guardians': 'guardians',
        'coaches': 'coaches',
        'org-admins': 'org-admins',
        'organization-admins': 'org-admins',
        'athletes': 'athletes',
      }
      return roleMap[parentCategorySlug] || parentCategorySlug
    }
    return undefined
  }, [article, parentCategorySlug])


  const currentRoleSlug = getCurrentRoleSlug()

  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={t('portal.settings.helpCenter.loadingArticle')}
        pageDescription={t('portal.settings.helpCenter.loading')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
      >
        <ArticlePageSkeleton />
      </HelpFeatureLayout>
    )
  }

  if (!article) {
    return (
      <HelpFeatureLayout
        pageTitle={t('portal.settings.helpCenter.articleNotFound')}
        pageDescription={t('portal.settings.helpCenter.noArticles')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={undefined} />}
      >
        <div className="help-uber-card">
          <Link to={getLink('portal.help')} className="help-uber-primary-button">
            <span className="material-symbols-outlined">arrow_back</span>
            {t('portal.settings.helpCenter.backToHelp')}
          </Link>
        </div>
      </HelpFeatureLayout>
    )
  }

  // Process content to replace tool links and add heading IDs
  const processedContent = article && article.content && handleToolLinkNavigation
    ? (() => {
        const withToolLinks = replaceToolLinksInHtml(article.content, handleToolLinkNavigation)
        return processContentWithHeadingIds(withToolLinks)
      })()
    : ''
  const articleExcerpt = (article.excerpt || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (
    <>
      <HelpFeatureLayout
        pageTitle={article.title}
        pageDescription={articleExcerpt}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
        beforeTitle={
          <nav className="help-uber-breadcrumb" aria-label={t('portal.settings.helpCenter.breadcrumbHelpCenter')}>
            <Link to={getLink('portal.help')}>{t('portal.settings.helpCenter.breadcrumbHelpCenter')}</Link>
            {article.categoryPath && article.categoryPath.length > 1 ? (
              <>
                {article.categoryPath.filter(slug => slug !== 'help').map((slug, i) => {
                  const idx = article.categoryPath!.indexOf(slug)
                  const title = (idx >= 0 && article.categoryNames?.[idx]) ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  const pathSegments = article.categoryPath!.filter(s => s !== 'help').slice(0, i + 1)
                  const href = pathSegments.length === 1
                    ? getLink('portal.helpCategory', { categorySlug: pathSegments[0] })
                    : `${getPath('portal.help')}/${pathSegments.join('/')}`
                  return (
                    <Fragment key={`${slug}-${i}`}>
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
                      <Link to={href}>{title}</Link>
                    </Fragment>
                  )
                })}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
                <Link to={getLink('portal.helpCategory', { categorySlug: article.categorySlug || '' })}>
                  {article.categoryName || article.categorySlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''}
                </Link>
              </>
            )}
          </nav>
        }
      >
        <PullToRefreshContainer onRefresh={loadArticle}>
        <section style={{ marginBottom: '1rem' }}>
          <p className="help-uber-meta-row" style={{ marginTop: 0, marginBottom: 0 }}>
            {t('portal.settings.helpCenter.articleReadingTime', { minutes: article.readingTime || 4 })}
          </p>
        </section>

        <article>
          <div
            ref={contentRef}
            className="help-article-content"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </article>

        <section className="help-uber-panel" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Was this helpful?</h3>
          <div className="help-uber-actions" style={{ marginTop: '0.7rem' }}>
            <button type="button" className="help-uber-secondary-button">Yes</button>
            <button type="button" className="help-uber-secondary-button">No</button>
          </div>
        </section>
        </PullToRefreshContainer>
      </HelpFeatureLayout>

      {toolLinkPopup && (
        <ToolLinkPopup
          element={toolLinkPopup.element}
          context={toolLinkPopup.context}
          targetElement={toolLinkPopup.targetElement}
          onClose={() => setToolLinkPopup(null)}
        />
      )}
    </>
  )
}
