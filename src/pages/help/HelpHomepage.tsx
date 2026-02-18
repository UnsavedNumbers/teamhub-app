/**
 * Help Center Homepage
 * 
 * Main entry point for the help center with search and category overview.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { mapAuthRoleToStandardRole } from '../../lib/routeGuard'
import { getCategoriesForRole, searchArticles } from '../../data/services/helpCenterDataService'
import type { HelpCategory, HelpArticle } from '../../data/services/helpCenterDataService'
import { showError } from '../../utils/toast'
import { getLink } from '../../utils/routes'
import { debug } from '../../lib/debug'
import { useT } from '../../i18n/useI18n'

type UserRole = 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'

export default function HelpHomepage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<HelpCategory[]>([])
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

  // Load categories
  useEffect(() => {
    if (userRole) {
      loadCategories()
    }
  }, [userRole])

  async function loadCategories() {
    if (!userRole) return

    setLoading(true)
    try {
      const result = await getCategoriesForRole(userRole)
      if (result.error) {
        showError(t('errorMessages.fetchFailed'))
        return
      }
      setCategories(result.data || [])
    } catch (err) {
      showError(t('errorMessages.fetchFailed'))
      debug.error('HelpHomepage', 'Exception loading categories', { error: err })
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || !userRole || !t) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearching(true)
      try {
        const result = await searchArticles(query, userRole)
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
    }, 300),
    [userRole, t]
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{t('portal.settings.helpCenter.title')}</h1>
          <p className="text-xl text-blue-100">{t('portal.settings.helpCenter.subtitle')}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="relative">
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
              // Delay to allow click on results
              setTimeout(() => setShowSearchResults(false), 200)
            }}
            placeholder="Search help articles... (Press / to focus)"
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg shadow-lg focus:outline-none focus:border-blue-500"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
              {searchResults.map((article) => (
                <Link
                  key={article.id}
                  to={getLink('portal.helpArticle', {
                    categorySlug: article.categorySlug || '',
                    articleSlug: article.slug || '',
                  })}
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

      {/* Category Overview */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {t('portal.settings.helpCenter.noCategories')}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">{t('portal.settings.helpCenter.browseByCategory')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={getLink('portal.helpCategory', { categorySlug: category.slug })}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  {category.thumbnailUrl ? (
                    <img
                      src={category.thumbnailUrl}
                      alt={category.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-gray-400">No thumbnail</span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{category.name || ''}</h3>
                  {category.description && (
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{category.description}</p>
                  )}
                  <p className="text-sm text-gray-500">{t('portal.settings.helpCenter.articleCount', { count: category.articleCount || 0 })}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
