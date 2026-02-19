/**
 * Help Header Search Component
 * 
 * Search icon that expands into a slide-down search bar with typeahead results.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { searchArticles } from '../../data/services/helpCenterDataService'
import type { HelpArticle } from '../../data/services/helpCenterDataService'
import { getLink, getPath } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import '../../styles/helpCenter.css'

interface HelpHeaderSearchProps {
  scopeRole?: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin' | null
  onSearchClose?: () => void
}

export function HelpHeaderSearch({ scopeRole, onSearchClose }: HelpHeaderSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const t = useT()

  // Close search when navigating away
  useEffect(() => {
    setIsExpanded(false)
    setSearchQuery('')
    setShowResults(false)
  }, [location.pathname])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isExpanded])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!searchQuery.trim() || !scopeRole) {
        setSearchResults([])
        setShowResults(false)
        return
      }

      setSearching(true)
      try {
        const result = await searchArticles(searchQuery, scopeRole)
        if (result.error) {
          console.error('Search error:', result.error)
          setSearchResults([])
        } else {
          setSearchResults(result.data || [])
          setShowResults(true)
        }
      } catch (err) {
        console.error('Search exception:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, scopeRole])

  const handleExpand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsExpanded(false)
    setSearchQuery('')
    setShowResults(false)
    onSearchClose?.()
  }, [onSearchClose])

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

  const handleResultClick = useCallback(() => {
    handleClose()
  }, [handleClose])

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="help-header-search-icon"
        aria-label={t('common.search')}
      >
        <span className="material-symbols-outlined">search</span>
      </button>
    )
  }

  return (
    <div ref={searchRef} className="help-header-search-expanded">
      <div className="help-header-search-bar">
        <span className="material-symbols-outlined help-header-search-icon-left">search</span>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder={t('portal.settings.helpCenter.searchPlaceholder')}
          className="help-header-search-input"
          aria-label={t('portal.settings.helpCenter.searchPlaceholder')}
        />
        {searching && (
          <span className="material-symbols-outlined help-header-search-loading">
            progress_activity
          </span>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="help-header-search-close"
          aria-label={t('common.close')}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="help-header-search-results">
          {searchResults.map((article) => (
            <Link
              key={article.id}
              to={resolveArticleLink(article)}
              className="help-header-search-result-item"
              onClick={handleResultClick}
            >
              <div className="help-header-search-result-title">{article.title || ''}</div>
              {scopeRole && (
                <div className="help-header-search-result-badge">
                  {article.categoryName || ''}
                </div>
              )}
              <div className="help-header-search-result-meta">{article.excerpt || ''}</div>
            </Link>
          ))}
        </div>
      )}

      {showResults && searchQuery && searchResults.length === 0 && !searching && (
        <div className="help-header-search-results">
          <div className="help-header-search-result-item">
            {t('portal.settings.helpCenter.noResults', { query: searchQuery })}
          </div>
        </div>
      )}
    </div>
  )
}
