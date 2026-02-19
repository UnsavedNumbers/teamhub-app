/**
 * Topic Page
 * 
 * Displays articles for a specific topic as a simple list with pagination and sort options.
 * Route: /help/{role}/{topic}
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import {
  getCategoryDetails,
  getCategoryArticles,
} from '../../data/services/helpCenterDataService'
import type {
  HelpCategory,
  HelpSection,
  HelpArticle,
} from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink, getPath } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpRoleSwitcher } from '../../components/help/HelpRoleSwitcher'
import { TopicPageSkeleton } from '../../components/help/HelpSkeletons'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

type SortOption = 'newest' | 'most_viewed'

const ARTICLES_PER_PAGE = 20

export default function TopicPage() {
  const { roleSlug, topicSlug } = useParams<{ roleSlug: string; topicSlug: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()

  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<HelpCategory | null>(null)
  const [parentCategory, setParentCategory] = useState<HelpCategory | null>(null)
  const [sections, setSections] = useState<HelpSection[]>([])
  const [generalArticles, setGeneralArticles] = useState<HelpArticle[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [currentPage, setCurrentPage] = useState(1)

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
          from: getLink('portal.helpCategory', { categorySlug: topicSlug || '' }),
        },
      })
    }
  }, [authLoading, topicSlug, navigate, user])

  const loadTopicData = useCallback(async () => {
    if (!topicSlug || !userRole) return

    setLoading(true)
    setParentCategory(null)
    try {
      // Load parent category (role) for breadcrumb title when we have roleSlug
      if (roleSlug) {
        const parentResult = await getCategoryDetails(roleSlug)
        if (!parentResult.error && parentResult.data) {
          setParentCategory(parentResult.data)
        }
      }

      const categoryResult = await getCategoryDetails(topicSlug)
      if (categoryResult.error || !categoryResult.data) {
        showError(t('portal.settings.helpCenter.categoryNotFound'))
        navigate(getLink('portal.help'))
        return
      }
      setCategory(categoryResult.data)

      const articlesResult = await getCategoryArticles(topicSlug, userRole)
      if (articlesResult.error) {
        debug.data('TopicPage', 'Error loading articles, continuing with empty articles', { error: articlesResult.error })
      }

      setSections(articlesResult.data?.sections || [])
      setGeneralArticles(articlesResult.data?.generalArticles || [])
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
      debug.error('TopicPage', 'Exception loading topic data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [topicSlug, roleSlug, navigate, t, userRole])

  useEffect(() => {
    if (topicSlug && userRole) {
      loadTopicData()
    }
  }, [topicSlug, loadTopicData, userRole])

  const allArticles = useMemo(() => {
    const fromSections = sections.flatMap(section => section.articles || [])
    const all = [...fromSections, ...generalArticles]
    const seen = new Set<number>()
    return all.filter(article => {
      if (seen.has(article.id)) return false
      seen.add(article.id)
      return true
    })
  }, [generalArticles, sections])

  const sortedArticles = useMemo(() => {
    const sorted = [...allArticles]
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    } else if (sortBy === 'most_viewed') {
      // For now, just sort by newest since we don't have view counts
      sorted.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    }
    return sorted
  }, [allArticles, sortBy])

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE
    const end = start + ARTICLES_PER_PAGE
    return sortedArticles.slice(start, end)
  }, [sortedArticles, currentPage])

  const totalPages = Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE)

  const resolveArticleLink = (article: HelpArticle) => {
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
  }

  const getCurrentRoleSlug = useCallback(() => {
    return roleSlug
  }, [roleSlug])

  const currentRoleSlug = getCurrentRoleSlug()
  const topicExcerpt = (category?.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={category?.name || t('portal.settings.helpCenter.loading')}
        pageDescription={t('portal.settings.helpCenter.loading')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
      >
        <TopicPageSkeleton />
      </HelpFeatureLayout>
    )
  }

  if (!category) {
    return (
      <HelpFeatureLayout
        pageTitle={t('portal.settings.helpCenter.categoryNotFound')}
        pageDescription={t('portal.settings.helpCenter.noArticles')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
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

  return (
    <HelpFeatureLayout
      pageTitle={category.name}
      pageDescription={topicExcerpt}
      sidebarSections={[]}
      headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
      headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
    >

      <nav className="help-uber-breadcrumb" aria-label={t('portal.settings.helpCenter.breadcrumbHelpCenter')}>
        <Link to={getLink('portal.help')}>{t('portal.settings.helpCenter.breadcrumbHelpCenter')}</Link>
        {roleSlug && (
          <>
            <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
            <Link to={getLink('portal.helpCategory', { categorySlug: roleSlug })}>
              {parentCategory?.name ?? roleSlug}
            </Link>
          </>
        )}
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <span>{category.name}</span>
      </nav>

      {/* Sort Options */}
      {sortedArticles.length > 0 && (
        <div className="help-article-list-sort">
          <span className="help-article-list-sort-label">{t('common.sort')}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="help-article-list-sort-select"
          >
            <option value="newest">{t('common.mostRecent')}</option>
            <option value="most_viewed">{t('portal.settings.helpCenter.mostViewed')}</option>
          </select>
        </div>
      )}

      {/* Article List */}
      {paginatedArticles.length === 0 ? (
        <div className="help-uber-card">
          <p className="help-uber-article-excerpt">{t('portal.settings.helpCenter.noArticles')}</p>
        </div>
      ) : (
        <>
          <div className="help-article-list">
            {paginatedArticles.map((article) => (
              <Link
                key={article.id}
                to={resolveArticleLink(article)}
                className="help-article-list-item"
              >
                <div className="help-article-list-title">{article.title}</div>
                {article.excerpt && (
                  <div className="help-article-list-excerpt">{article.excerpt}</div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="help-article-list-pagination">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="help-article-list-pagination-button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
                {t('common.back')}
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`help-article-list-pagination-button ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="help-article-list-pagination-button"
              >
                {t('common.more')}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </HelpFeatureLayout>
  )
}
