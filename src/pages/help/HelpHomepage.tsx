/**
 * Help Center Homepage
 * 
 * Main entry point for role-scoped help content.
 * Shows role selection cards.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getRoleCategoryMappings } from '../../data/services/helpCenterMappingService'
import { searchArticles, getAllWordPressDataDirect, getCategoryImageUrl } from '../../data/services/helpCenterDataService'
import type { WordPressCategory } from '../../data/services/wordpressApiService'
import type { HelpArticle } from '../../data/services/helpCenterDataService'
import { getLink, getPath } from '../../utils/routes'
import { debug } from '../../lib/debug'
import { useT } from '../../i18n/useI18n'
import { HelpFeatureLayout } from '../../components/help/HelpFeatureLayout'
import { HelpHeaderSearch } from '../../components/help/HelpHeaderSearch'
import { HelpHomepageSkeleton } from '../../components/help/HelpSkeletons'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import '../../styles/helpCenter.css'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

interface RoleCard {
  role: UserRole
  label: string
  slug: string
  description: string
  categorySlug?: string
  featuredImageUrl?: string
}

export default function HelpHomepage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [roleCards, setRoleCards] = useState<RoleCard[]>([])
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(getLink('auth.login'), { state: { from: getLink('portal.help') } })
    }
  }, [user, authLoading, navigate])

  // Get role cards with translations
  const getRoleCards = useCallback((): RoleCard[] => {
    return [
      {
        role: 'parent',
        label: t('portal.settings.helpCenter.roleGuardians'),
        slug: 'guardians',
        description: t('portal.settings.helpCenter.roleGuardiansDescription'),
      },
      {
        role: 'coach',
        label: t('portal.settings.helpCenter.roleCoaches'),
        slug: 'coaches',
        description: t('portal.settings.helpCenter.roleCoachesDescription'),
      },
      {
        role: 'org_admin',
        label: t('portal.settings.helpCenter.roleOrgAdmins'),
        slug: 'org-admins',
        description: t('portal.settings.helpCenter.roleOrgAdminsDescription'),
      },
      {
        role: 'athlete',
        label: t('portal.settings.helpCenter.roleAthletes'),
        slug: 'athletes',
        description: t('portal.settings.helpCenter.roleAthletesDescription'),
      },
    ]
  }, [t])

  // Load role category mappings to get category slugs
  const loadData = useCallback(async () => {
    // Show cards immediately with fallback slugs
    const baseCards = getRoleCards()
    setRoleCards(baseCards)
    setLoading(false) // Show content immediately
    
    // Load mappings in background and update cards
    try {
      let cardsWithSlugs = baseCards
      const mappingsResult = await getRoleCategoryMappings()
      
      if (mappingsResult.error || !mappingsResult.data) {
        debug.error('HelpHomepage', 'Failed to load role mappings', { error: mappingsResult.error })
      } else {
        const mappings = mappingsResult.data || []
        cardsWithSlugs = baseCards.map(card => {
          const roleMappings = mappings.filter(m => m.role === card.role)
          const roleMapping =
            roleMappings.find(m => m.wordpressCategorySlug === card.slug) ||
            roleMappings[0]
          return {
            ...card,
            categorySlug: roleMapping?.wordpressCategorySlug,
          }
        })
      }

      const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
      if (categoryResult.error || !categoryResult.data) {
        setRoleCards(cardsWithSlugs)
        return
      }

      const categoryMap = new Map(categoryResult.data.map(category => [category.slug, category]))

      const cardsWithFeaturedImages = cardsWithSlugs.map(card => {
        const lookupSlug = card.categorySlug || card.slug
        const category = categoryMap.get(lookupSlug)
        return {
          ...card,
          featuredImageUrl: category ? getCategoryImageUrl(category) : undefined,
        }
      })

      setRoleCards(cardsWithFeaturedImages)
    } catch (err) {
      debug.error('HelpHomepage', 'Exception loading data', { error: err })
    }
  }, [getRoleCards])

  useEffect(() => {
    loadData()
  }, [loadData])

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
          setSearchResults([])
        } else {
          setSearchResults(result.data || [])
          setShowSearchResults(true)
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, userRole])

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchResults.length === 0) return
    navigate(resolveArticleLink(searchResults[0]))
  }


  if (authLoading || loading) {
    return (
      <HelpFeatureLayout
        pageTitle={`${t('portal.settings.helpCenter.heroTitle')} ${t('portal.settings.helpCenter.heroTitleHighlight')}`}
        pageDescription=""
        sidebarSections={[]}
        headerActions={<HelpHeaderSearch scopeRole={null} />}
      >
        <HelpHomepageSkeleton />
      </HelpFeatureLayout>
    )
  }

  return (
    <HelpFeatureLayout
      pageTitle={`${t('portal.settings.helpCenter.heroTitle')} ${t('portal.settings.helpCenter.heroTitleHighlight')}`}
      pageDescription={t('portal.settings.helpCenter.heroSubtitle')}
      sidebarSections={[]}
      headerActions={<HelpHeaderSearch scopeRole={null} />}
      headerRoleSwitcher={undefined}
    >
      <PullToRefreshContainer onRefresh={loadData}>
        <section className="help-uber-panel" style={{ marginBottom: '1.5rem', maxWidth: '920px', marginInline: 'auto' }}>
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
                    to={resolveArticleLink(article)}
                    className="help-uber-search-result-item"
                    onClick={() => {
                      setShowSearchResults(false)
                      setSearchQuery('')
                    }}
                  >
                    <div className="help-uber-search-result-title">{article.title || ''}</div>
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

        <section className="help-uber-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '920px', margin: '0 auto' }}>
          {roleCards.map((card) => {
            const categoryLink = card.categorySlug
              ? getLink('portal.helpCategory', { categorySlug: card.categorySlug })
              : getLink('portal.helpCategory', { categorySlug: card.slug })
            const hasFeaturedImage = Boolean(card.featuredImageUrl)
            
            return (
              <Link
                key={card.role}
                to={categoryLink}
                className={`help-role-card help-role-card--square${hasFeaturedImage ? ' help-role-card--with-image' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '1rem 0.875rem',
                }}
              >
                {hasFeaturedImage && (
                  <>
                    <span
                      className="help-role-card-media"
                      aria-hidden="true"
                      style={{ backgroundImage: `url(${card.featuredImageUrl})` }}
                    />
                    <span className="help-role-card-overlay" aria-hidden="true" />
                  </>
                )}
                <h3
                  className="help-role-card-title"
                  style={{
                    marginTop: 0,
                    marginBottom: 0,
                    color: hasFeaturedImage ? '#ffffff' : undefined,
                    textShadow: hasFeaturedImage ? '0 1px 6px rgba(0, 0, 0, 0.35)' : undefined,
                  }}
                >
                  {card.label}
                </h3>
              </Link>
            )
          })}
        </section>
      </PullToRefreshContainer>
    </HelpFeatureLayout>
  )
}
