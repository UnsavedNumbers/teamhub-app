/**
 * Guardian / Athlete Video Library Page
 *
 * Fan-style video gallery for guardians and athletes. RLS restricts visible
 * videos to team videos, org-wide videos, and athlete-linked videos the user
 * can access. No upload, delete, or admin controls.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import PortalLayout from '@/components/portal/PortalLayout'
import { PageTitle } from '@/components/portal/Typography'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { VideoCard } from '@/components/video'
import { useOrganization } from '@/contexts/OrganizationContext'
import { usePortalVideoLibrary } from '@/hooks/useVideos'
import { cn } from '@/utils/cn'
import type { Video } from '@/types/video'

const PAGE_SIZE = 24
const SEARCH_DEBOUNCE_MS = 300

type SortOption = 'recorded_at' | 'created_at' | 'title'

export default function GuardianVideos() {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id ?? undefined

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recorded_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const {
    videos,
    total,
    isLoading,
    error,
    hasMore,
    refresh,
    loadMore,
  } = usePortalVideoLibrary({
    orgId,
    enabled: !!orgId,
    filters: {
      search: searchQuery || undefined,
      team_id: teamId ?? undefined,
    },
    pagination: {
      page: 1,
      limit: PAGE_SIZE,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  })

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    videos.forEach((v) => {
      if (v.team?.id && v.team?.name) map.set(v.team.id, { id: v.team.id, name: v.team.name })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [videos])

  const hasFilters = searchQuery !== '' || teamId !== null

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    setTeamId(null)
  }, [])

  if (!orgId) {
    return (
      <PortalLayout breadcrumbs={[{ label: 'Home', path: '/portal/dashboard' }, { label: 'Video Library' }]}>
        <div className="mb-8">
          <PageTitle>Video Library</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Select an organization to view videos.</p>
        </div>
      </PortalLayout>
    )
  }

  if (error) {
    return (
      <PortalLayout breadcrumbs={[{ label: 'Home', path: '/portal/dashboard' }, { label: 'Video Library' }]}>
        <div className="mb-8">
          <PageTitle>Video Library</PageTitle>
        </div>
        <Card className="text-center py-12">
          <Icon name="error" size="text-4xl" className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load videos</h3>
          <p className="text-slate-500 mb-4">{error.message}</p>
          <Button onClick={refresh}>Try Again</Button>
        </Card>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Video Library' },
      ]}
    >
      <div className="mb-8">
        <PageTitle>Video Library</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
          Watch team and athlete videos. Use search and filters to find what you need.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mobile-stack-controls mb-6 sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon name="search" size="text-lg" />
          </span>
          <input
            type="search"
            placeholder="Search videos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
            aria-label="Search videos"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {teams.length > 0 && (
            <select
              value={teamId ?? ''}
              onChange={(e) => setTeamId(e.target.value || null)}
              className="w-full sm:w-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 min-w-0 sm:min-w-[140px] focus:ring-2 focus:ring-[var(--org-btn-primary-bg)]"
              aria-label="Filter by team"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = (e.target.value as string).split('-') as [SortOption, 'asc' | 'desc']
              setSortBy(by)
              setSortOrder(order)
            }}
            className="w-full sm:w-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 min-w-0 sm:min-w-[160px] focus:ring-2 focus:ring-[var(--org-btn-primary-bg)]"
            aria-label="Sort"
          >
            <option value="recorded_at-desc">Newest first</option>
            <option value="recorded_at-asc">Oldest first</option>
            <option value="created_at-desc">Recently added</option>
            <option value="title-asc">Title A–Z</option>
          </select>
          {hasFilters && (
            <Button variant="secondary" onClick={handleClearFilters} className="shrink-0">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && videos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} noPadding className="animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="text-center py-12">
          <Icon name="videocam_off" size="text-4xl" className="text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {hasFilters ? 'No videos match your filters' : 'No videos yet'}
          </h3>
          <p className="text-slate-500 mb-4">
            {hasFilters
              ? 'Try clearing filters or a different team.'
              : 'When your organization adds videos for your team or athlete, they will appear here.'}
          </p>
          {hasFilters && (
            <Button onClick={handleClearFilters}>Clear filters</Button>
          )}
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {total} {total === 1 ? 'video' : 'videos'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <PortalVideoCard key={video.id} video={video} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" onClick={loadMore} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  )
}

function PortalVideoCard({ video }: { video: Video }) {
  return (
    <VideoCard
      video={video}
      linkTo={`/portal/videos/${video.id}`}
      showActions={false}
      showNewNotes={false}
      compact={false}
      className={cn(
        'rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700',
        'hover:border-[var(--org-btn-primary-bg)] hover:shadow-md transition-all'
      )}
    />
  )
}
