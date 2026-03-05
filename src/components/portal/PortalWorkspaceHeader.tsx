import { Link, useNavigate } from 'react-router-dom'
import { Search, Menu } from 'lucide-react'
import NotificationBell from '../common/NotificationBell'
import UserContextDropdown from '../common/UserContextDropdown'
import ThemeToggle from './ThemeToggle'
import { DemoModeBadge } from '../demo/DemoModeBadge'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useAuth } from '../../hooks/useAuth'
import { getLink } from '../../utils/routes'
import { useTheme } from '../../hooks/useTheme'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { searchPortalEntities, type PortalSearchResult } from '../../data/services/portalSearchService'
import { cn } from '../../utils/cn'

interface PortalWorkspaceHeaderProps {
  onMenuClick?: () => void
  /** Show sidebar toggle button (e.g. on tablet/mobile when sidebar is drawer) */
  showMenuButton?: boolean
}

/**
 * Slim top header for Guardian/Athlete portal workspace.
 * Org logo + name, global search, notifications, profile/org switcher.
 */
export default function PortalWorkspaceHeader({
  onMenuClick,
  showMenuButton = false,
}: PortalWorkspaceHeaderProps) {
  const { currentOrganization } = useOrganization()
  const { hasAnyRole, isOrgAdmin } = useAuth()
  const { resolvedTheme } = useTheme()
  const { context, isReady } = useUserContext()
  const neutralPalette = true
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PortalSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const roleLabel = isOrgAdmin()
    ? 'Admin'
    : hasAnyRole('coach')
      ? 'Coach'
      : hasAnyRole('parent')
        ? 'Guardian'
        : hasAnyRole('athlete')
          ? 'Athlete'
          : 'Member'

  const logoSrc = resolvedTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png'

  // Search with debounce
  useEffect(() => {
    if (!isReady || !context) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearching(true)
      try {
        const result = await searchPortalEntities({
          query: searchQuery,
          context,
          limit: 10,
        })
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
  }, [searchQuery, context, isReady])

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchResults])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchResults.length === 0) return
    navigate(searchResults[0].url)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  const handleResultClick = useCallback((result: PortalSearchResult) => {
    navigate(result.url)
    setSearchQuery('')
    setShowSearchResults(false)
  }, [navigate])

  return (
    <header
      className={cn(
        'portal-workspace-header sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-black',
        'pwa-neutral',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {showMenuButton && (
            <button
              type="button"
              onClick={onMenuClick}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white',
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link
            to={getLink('portal.dashboard')}
            className="flex min-w-0 shrink items-center gap-2 overflow-hidden"
          >
            <img
              src={`${logoSrc}?theme=${resolvedTheme}`}
              alt="YouthSports.team"
              className="h-8 w-auto shrink-0"
            />
            <span className={cn('truncate text-sm font-semibold text-gray-800 dark:text-gray-100 sm:inline')}>
              {currentOrganization?.name ?? 'Youth Sports'}
            </span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 sm:block">
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="search"
                placeholder="Search teams, events, messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true)
                  }
                }}
                className={cn(
                  'w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:border-neutral-800 dark:bg-black dark:text-gray-100 dark:placeholder-gray-500',
                  'focus:border-[var(--org-link-color)] focus:ring-[var(--org-link-color)]',
                )}
              />
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-950 z-50">
                {searchResults.map((result) => (
                  <Link
                    key={`${result.entityType}-${result.id}`}
                    to={result.url}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      'flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors',
                      'border-b border-gray-100 dark:border-gray-800 last:border-b-0'
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {result.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{result.context}</span>
                      {result.metadata && (
                        <>
                          <span>|</span>
                          <span>{result.metadata}</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {showSearchResults && searchQuery && searchResults.length === 0 && !searching && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-950 z-50">
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No results found for "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {currentOrganization && (
            <span className={cn(
              'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-950 dark:text-gray-300 md:inline',
            )}>
              {roleLabel}
            </span>
          )}
          <DemoModeBadge />
          <NotificationBell viewAllPath="/portal/notifications" neutralPalette={neutralPalette} />
          <ThemeToggle variant="icon-only" />
          <UserContextDropdown neutralPalette={neutralPalette} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2 sm:hidden">
        <NotificationBell viewAllPath="/portal/notifications" neutralPalette={neutralPalette} />
        <ThemeToggle variant="icon-only" />
        <UserContextDropdown neutralPalette={neutralPalette} />
      </div>
    </header>
  )
}
