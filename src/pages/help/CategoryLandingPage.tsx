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
import {
  getAllWordPressTagsDirect,
  getAllWordPressDataDirect,
} from '../../data/services/helpCenterDataService'
import type {
  HelpCategory,
  HelpSection,
  HelpArticle,
  HelpSubcategoryGroup,
} from '../../data/services/helpCenterDataService'
import type { WordPressPost } from '../../data/services/wordpressApiService'
import { showError } from '../../utils/toast'
import { debug } from '../../lib/debug'
import { getLink, getPath } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpRoleSwitcher } from '../../components/help/HelpRoleSwitcher'
import { CategoryLandingPageSkeleton } from '../../components/help/HelpSkeletons'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity: string) => {
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
      hellip: '...',
    }

    if (entity in named) {
      return named[entity]
    }

    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : `&${entity};`
    }

    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : `&${entity};`
    }

    return `&${entity};`
  })
}

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
  const [featuredTagIds, setFeaturedTagIds] = useState<number[]>([])
  const [postExcerptsById, setPostExcerptsById] = useState<Record<number, string>>({})

  const userRole: UserRole | null = profile && profile.role
    ? (mapAuthRoleToStandardRole(
        profile.role,
        profile.isPlatformAdmin ?? false,
        profile.organizations || []
      ) as UserRole)
    : null

  // Determine current role from category slug
  const getCurrentRoleSlug = useCallback(() => {
    if (!categorySlug) return undefined
    const roleMap: Record<string, string> = {
      'guardians': 'guardians',
      'coaches': 'coaches',
      'org-admins': 'org-admins',
      'athletes': 'athletes',
      'platform-admins': 'platform-admins',
    }
    return roleMap[categorySlug] || categorySlug
  }, [categorySlug])

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

      const [articlesResult, childCategoriesResult, tagsResult, postsResult] = await Promise.all([
        getCategoryArticles(categorySlug, userRole),
        getCategorySubcategoryGroups(categorySlug),
        getAllWordPressTagsDirect(),
        getAllWordPressDataDirect<WordPressPost>('post'),
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
      if (!tagsResult.error) {
        const featuredIds = (tagsResult.data || [])
          .filter((tag) => tag.slug?.toLowerCase() === 'featured' || tag.name?.toLowerCase() === 'featured')
          .map((tag) => tag.id)
        setFeaturedTagIds(featuredIds)
      } else {
        setFeaturedTagIds([])
      }
      if (!postsResult.error) {
        const excerpts = Object.fromEntries(
          (postsResult.data || []).map((post) => [
            post.id,
            decodeHtmlEntities((post.excerpt?.rendered || '').replace(/<[^>]*>/g, '').trim()),
          ])
        )
        setPostExcerptsById(excerpts)
      } else {
        setPostExcerptsById({})
      }

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

  const taxonomyArticles = useMemo(() => {
    const merged = [...allArticles, ...directArticles]
    const seen = new Set<number>()
    return merged.filter((article) => {
      if (seen.has(article.id)) return false
      seen.add(article.id)
      return true
    })
  }, [allArticles, directArticles])

  const featuredArticle = useMemo(() => {
    if (featuredTagIds.length === 0) return null
    const featured = taxonomyArticles
      .filter((article) => article.tags?.some((tagId) => featuredTagIds.includes(tagId)))
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    return featured[0] || null
  }, [taxonomyArticles, featuredTagIds])

  const displayArticles = useMemo(
    () => (featuredArticle ? allArticles.filter((article) => article.id !== featuredArticle.id) : allArticles),
    [allArticles, featuredArticle]
  )

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
      const firstResult = searchResults[0]
      if (firstResult.categoryPath && firstResult.categoryPath.length > 1) {
        const parentPath = firstResult.categoryPath.slice(0, -1).filter(slug => slug !== 'help')
        if (parentPath.length === 1) {
          navigate(getLink('portal.helpArticleNested', {
            parentCategorySlug: parentPath[0],
            categorySlug: firstResult.categorySlug || '',
            articleSlug: firstResult.slug || '',
          }))
          return
        }
        navigate(`${getPath('portal.help')}/${parentPath.join('/')}/${firstResult.categorySlug}/${firstResult.slug}`)
        return
      }

      navigate(getLink('portal.helpArticle', {
        categorySlug: firstResult.categorySlug || '',
        articleSlug: firstResult.slug || '',
      }))
    }
  }

  const resolveArticleLink = (
    article: HelpArticle,
    fallbackCategorySlug?: string,
    options?: { rolePageCategorySlug: string; topicSlugs: string[] }
  ) => {
    // On a role page, if the article belongs to a topic (subcategory), build /help/{role}/{topic}/{article}
    if (
      options?.rolePageCategorySlug &&
      article.categorySlug &&
      article.slug &&
      options.topicSlugs.includes(article.categorySlug)
    ) {
      return getLink('portal.helpArticleNested', {
        parentCategorySlug: options.rolePageCategorySlug,
        categorySlug: article.categorySlug,
        articleSlug: article.slug,
      })
    }
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
      categorySlug: article.categorySlug || fallbackCategorySlug || '',
      articleSlug: article.slug || '',
    })
  }


  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={category?.name || t('portal.settings.helpCenter.loading')}
        pageDescription={t('portal.settings.helpCenter.loading')}
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={getCurrentRoleSlug()} />}
      >
        <CategoryLandingPageSkeleton />
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
        headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={getCurrentRoleSlug()} />}
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

  const isRolePage = subcategoryGroups.length > 0
  const rolePageLinkOptions = isRolePage && categorySlug
    ? { rolePageCategorySlug: categorySlug, topicSlugs: subcategoryGroups.map((g) => g.slug || '').filter(Boolean) }
    : undefined

  const featuredArticleLink = featuredArticle
    ? resolveArticleLink(featuredArticle, category.slug, rolePageLinkOptions)
    : ''
  const featuredArticleExcerpt = featuredArticle ? (featuredArticle.excerpt || postExcerptsById[featuredArticle.id] || '') : ''

  const currentRoleSlug = getCurrentRoleSlug()

  return (
    <HelpFeatureLayout
      pageTitle={category.name}
      pageDescription={(category.description || '').replace(/<[^>]*>/g, '').substring(0, 240)}
      sidebarSections={[]}
      headerActions={<HelpHeaderSearch scopeRole={userRole || undefined} />}
      headerRoleSwitcher={<HelpRoleSwitcher currentRoleSlug={currentRoleSlug} />}
    >

      <nav className="help-uber-breadcrumb" aria-label={t('portal.settings.helpCenter.breadcrumbHelpCenter')}>
        <Link to={getLink('portal.help')}>{t('portal.settings.helpCenter.breadcrumbHelpCenter')}</Link>
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <span>{category.name}</span>
      </nav>

      {/* Prominent Search Field - only show on role pages */}
      {isRolePage && (
        <section className="help-uber-panel" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearchSubmit} className="help-uber-search-wrap">
            <span className="material-symbols-outlined help-uber-search-icon">search</span>
            <input
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
              className="help-uber-search-input"
              placeholder={t('portal.settings.helpCenter.searchPlaceholder')}
              aria-label={t('portal.settings.helpCenter.searchPlaceholder')}
            />
            <button type="submit" className="help-uber-search-button">
              {t('common.search')}
            </button>

            {showSearchResults && searchResults.length > 0 && (
              <div className="help-uber-search-results" role="listbox" aria-label={t('portal.settings.helpCenter.searchPlaceholder')}>
                {searchResults.map((article) => (
                  <Link
                    key={article.id}
                    to={resolveArticleLink(article, category.slug, rolePageLinkOptions)}
                    className="help-uber-search-result-item"
                    onClick={() => {
                      setShowSearchResults(false)
                      setSearchQuery('')
                    }}
                  >
                    <div className="help-uber-search-result-title">{article.title || ''}</div>
                    <div className="help-uber-search-result-meta">{article.categoryName || ''}</div>
                    <div className="help-uber-search-result-meta">{article.excerpt || ''}</div>
                  </Link>
                ))}
              </div>
            )}

            {showSearchResults && searchQuery && searchResults.length === 0 && !searching && (
              <div className="help-uber-search-results">
                <div className="help-uber-search-result-item">{t('portal.settings.helpCenter.noResults', { query: searchQuery })}</div>
              </div>
            )}
          </form>
        </section>
      )}

      {featuredArticle && (
        <article className="help-uber-card" style={{ marginBottom: '1rem' }}>
          <div className="help-uber-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'center' }}>
            {featuredArticle.featuredImageUrl || category.coverPhotoUrl ? (
              <img
                src={featuredArticle.featuredImageUrl || category.coverPhotoUrl}
                alt={featuredArticle.title}
                className="help-uber-featured-media"
                loading="lazy"
              />
            ) : (
              <div className="help-uber-panel" style={{ display: 'grid', placeItems: 'center', minHeight: '180px' }}>
                <span className="material-symbols-outlined help-uber-accent" style={{ fontSize: '2rem' }}>article</span>
              </div>
            )}
            <div>
              <div className="help-uber-meta-row" style={{ marginTop: 0 }}>
                <span className="help-uber-accent">{t('photos.browse.featuredLabel')}</span>
                <span>{t('portal.settings.helpCenter.minRead', { minutes: featuredArticle.readingTime || 5 })}</span>
              </div>
              <h2 className="help-uber-article-title" style={{ fontSize: '1.6rem', marginTop: '0.4rem' }}>{featuredArticle.title}</h2>
              <p className="help-uber-article-excerpt">{featuredArticleExcerpt}</p>
              <div className="help-uber-actions" style={{ marginTop: '0.7rem' }}>
                <Link to={featuredArticleLink} className="help-uber-primary-button">
                  {t('common.viewDetails')}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Topics List - only show on role pages, as simple list */}
      {isRolePage && subcategoryGroups.length > 0 && (
        <section style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--help-text)' }}>
            {t('portal.settings.helpCenter.allTopics') || 'All topics'}
          </h2>
          <div className="help-topics-list">
            {subcategoryGroups.map((group) => {
              const categoryLink = `${getPath('portal.help')}/${categorySlug || ''}/${group.slug || ''}`
              const articleCount = group.articles?.length || 0
              return (
                <Link key={group.id} to={categoryLink} className="help-topic-list-item">
                  <span className="material-symbols-outlined help-topic-list-icon">folder_open</span>
                  <span className="help-topic-list-name">{group.name}</span>
                  <span className="help-topic-list-count">{articleCount} {articleCount === 1 ? t('portal.settings.helpCenter.article') || 'article' : t('portal.settings.helpCenter.articles') || 'articles'}</span>
                  <span className="material-symbols-outlined help-topic-list-chevron">chevron_right</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Articles - only show if NOT a role page (i.e., it's a topic page that should redirect) */}
      {!isRolePage && displayArticles.length > 0 && (
        <section className="help-uber-grid">
          {displayArticles.map((article) => (
            <Link
              key={article.id}
              to={resolveArticleLink(article, category.slug, rolePageLinkOptions)}
              className="help-uber-card help-uber-article-link"
            >
              <div className="help-uber-meta-row" style={{ marginTop: 0 }}>
                <span className="material-symbols-outlined help-uber-accent">article</span>
                <span>{article.readingTime || 5} min</span>
              </div>
              <h3 className="help-uber-article-title">{article.title}</h3>
              <p className="help-uber-article-excerpt line-clamp-2">{article.excerpt || ''}</p>
            </Link>
          ))}
        </section>
      )}

      {subcategoryGroups.length === 0 && displayArticles.length === 0 && !featuredArticle && (
        <div className="help-uber-card">
          <p className="help-uber-article-excerpt">{t('portal.settings.helpCenter.noArticles')}</p>
          <div className="help-uber-actions" style={{ marginTop: '0.7rem' }}>
            <Link to={getLink('portal.help')} className="help-uber-primary-button">
              <span className="material-symbols-outlined">arrow_back</span>
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        </div>
      )}
    </HelpFeatureLayout>
  )
}
