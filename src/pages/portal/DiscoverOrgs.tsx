/**
 * Discover Organizations Page
 * 
 * Allows guardians to browse and discover organizations.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchEntities, followOrg, unfollowOrg } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import Icon from '../../components/portal/Icon'
import EmptyState from '../../components/portal/EmptyState'
import { getLink, RouteKeys } from '../../utils/routes'
import { useI18n } from '../../i18n/useI18n'
import type { SearchEntityResult } from '../../data/services/fanService'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function DiscoverOrgs() {
  useDebugLifecycle('DiscoverOrgs')
  
  const { t } = useI18n()
  const navigate = useNavigate()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Search query - only search for organizations
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['discover-orgs', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        return []
      }
      const { data, error } = await searchEntities(searchQuery.trim(), ['org'], 20)
      if (error) {
        showError(error.message)
        return []
      }
      return data || []
    },
    enabled: searchQuery.trim().length >= 2,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search (300ms)
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim().length >= 2) {
        setHasSearched(true)
      } else {
        setHasSearched(false)
      }
    }, 300)
  }

  const handleFollow = async (entity: SearchEntityResult) => {
    const { error } = await followOrg(entity.id)

    if (error) {
      showError('Failed to follow organization')
    } else {
      showSuccess(`Now following ${entity.name}`)
      // Refresh search results to update follow status
      window.location.reload()
    }
  }

  const handleUnfollow = async (entity: SearchEntityResult) => {
    const { error } = await unfollowOrg(entity.id)

    if (error) {
      showError('Failed to unfollow organization')
    } else {
      showSuccess(`Unfollowed ${entity.name}`)
      // Refresh search results to update follow status
      window.location.reload()
    }
  }

  const handleEntityClick = (entity: SearchEntityResult) => {
    if (entity.entity_type === 'org' && entity.slug) {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { slug: entity.slug }))
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageTitle>{t('portal.fan.discoverOrgs.title' as any) || 'Browse Organizations'}</PageTitle>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('portal.fan.discoverOrgs.description' as any) || 'Discover and follow organizations in your area'}
        </p>

        {/* Search Input */}
        <Card className="p-6 mb-6">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={t('portal.fan.discoverOrgs.searchPlaceholder' as any) || 'Search organizations by name or location...'}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Enter at least 2 characters to search
            </p>
          )}
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        )}

        {/* Search Results */}
        {!isLoading && hasSearched && searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('portal.fan.discoverOrgs.results' as any) || 'Search Results'} ({searchResults.length})
            </h2>
            {searchResults.map((entity) => (
              <Card key={entity.id} className="p-6 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => handleEntityClick(entity)}>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {entity.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {entity.location_city && entity.location_state && (
                        <span className="flex items-center gap-1">
                          <Icon name="location_on" className="text-base" />
                          {entity.location_city}, {entity.location_state}
                        </span>
                      )}
                      {entity.slug && (
                        <span className="flex items-center gap-1">
                          <Icon name="link" className="text-base" />
                          {entity.slug}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {entity.slug && (
                      <Button
                        variant="secondary"
                        onClick={() => handleEntityClick(entity)}
                      >
                        View Profile
                      </Button>
                    )}
                    {entity.isFollowing ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleUnfollow(entity)}
                      >
                        <Icon name="close" className="mr-2" />
                        Unfollow
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleFollow(entity)}
                      >
                        <Icon name="add" className="mr-2" />
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State - No Search */}
        {!isLoading && !hasSearched && (
          <Card>
            <EmptyState
              icon="explore"
              title={t('portal.fan.discoverOrgs.emptyTitle' as any) || 'Discover Organizations'}
              description={t('portal.fan.discoverOrgs.emptyDescription' as any) || 'Search for organizations by name or location to discover new teams and organizations in your area.'}
            />
          </Card>
        )}

        {/* Empty State - No Results */}
        {!isLoading && hasSearched && searchResults.length === 0 && (
          <Card>
            <EmptyState
              icon="search_off"
              title={t('portal.fan.discoverOrgs.noResultsTitle' as any) || 'No organizations found'}
              description={t('portal.fan.discoverOrgs.noResultsDescription' as any) || `No organizations found matching "${searchQuery}". Try a different search term.`}
            />
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
