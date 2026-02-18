/**
 * Category Landing Page
 * 
 * Displays category cover photo, description, and articles organized by sections.
 */

import { useEffect, useState } from 'react'
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

  // Load category data
  useEffect(() => {
    if (categorySlug && userRole) {
      loadCategoryData()
    }
  }, [categorySlug, userRole])

  async function loadCategoryData() {
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
  }

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

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">{t('portal.settings.helpCenter.categoryNotFound')}</p>
            <Link to={getLink('portal.help')} className="text-blue-600 hover:underline mt-4 inline-block">
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo */}
      {category.coverPhotoUrl && (
        <div className="relative h-64 md:h-96">
          <img
            src={category.coverPhotoUrl}
            alt={category.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="text-sm text-gray-600">
          <Link to={getLink('portal.help')} className="hover:text-blue-600">
            Help
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{category.name || ''}</span>
        </nav>
      </div>

      {/* Category Description */}
      {category.description && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: category.description }}
          />
        </div>
      )}

      {/* Articles by Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {sections.length === 0 && generalArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('portal.settings.helpCenter.noArticles')}</p>
            <Link to={getLink('portal.help')} className="text-blue-600 hover:underline mt-4 inline-block">
              {t('portal.settings.helpCenter.backToHelp')}
            </Link>
          </div>
        ) : (
          <>
            {/* Sections */}
            {sections.map((section) => (
              <div key={section.id} className="mb-12">
                <h2 className="text-2xl font-bold mb-4">{section.name}</h2>
                <div className="space-y-4">
                  {section.articles.map((article) => (
                    <Link
                      key={article.id}
                      to={getLink('portal.helpArticle', {
                        categorySlug: category.slug || '',
                        articleSlug: article.slug || '',
                      })}
                      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                    >
                      <h3 className="text-xl font-semibold mb-2">{article.title || ''}</h3>
                      <p className="text-gray-600 mb-2 line-clamp-2">{article.excerpt || ''}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {article.readingTime && (
                          <span>{t('portal.settings.helpCenter.minRead', { minutes: article.readingTime })}</span>
                        )}
                        <span>
                          {t('portal.settings.helpCenter.updated', { date: article.lastModified ? new Date(article.lastModified).toLocaleDateString() : '' })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* General Articles */}
            {generalArticles.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">{t('portal.settings.helpCenter.general')}</h2>
                <div className="space-y-4">
                  {generalArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={getLink('portal.helpArticle', {
                        categorySlug: category.slug || '',
                        articleSlug: article.slug || '',
                      })}
                      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                    >
                      <h3 className="text-xl font-semibold mb-2">{article.title || ''}</h3>
                      <p className="text-gray-600 mb-2 line-clamp-2">{article.excerpt || ''}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {article.readingTime && (
                          <span>{t('portal.settings.helpCenter.minRead', { minutes: article.readingTime })}</span>
                        )}
                        <span>
                          {t('portal.settings.helpCenter.updated', { date: article.lastModified ? new Date(article.lastModified).toLocaleDateString() : '' })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
