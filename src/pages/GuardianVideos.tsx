/**
 * Guardian Videos Page
 * 
 * Video library for guardians to view videos featuring their athletes.
 * Displays videos with coach notes organized by review status.
 */

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { PageTitle } from '@/components/portal/Typography'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { useUserContext } from '@/hooks/useUserContext'
import { useAthleteVideos } from '@/hooks/useVideos'
import { getGuardianAthletes } from '@/data/services/guardianService'
import { cn } from '@/utils/cn'
import type { Video } from '@/types/video'
import type { Athlete } from '@/types/family'

type TabKey = 'needs_review' | 'recent' | 'library'

interface Tab {
  key: TabKey
  label: string
}

const TABS: Tab[] = [
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'recent', label: 'Recent' },
  { key: 'library', label: 'Library' }
]

export default function GuardianVideos() {
  const { context, isReady } = useUserContext()
  const [activeTab, setActiveTab] = useState<TabKey>('needs_review')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true)
  
  // Load guardian's linked athletes using the same method as /portal/athletes
  useEffect(() => {
    if (!isReady || !context.userId || !context.orgId) return
    
    const loadAthletes = async () => {
      setIsLoadingAthletes(true)
      const { data, error } = await getGuardianAthletes(context.userId, context.orgId)
      
      if (!error && data) {
        setAthletes(data)
      }
      setIsLoadingAthletes(false)
    }
    
    loadAthletes()
  }, [context.userId, context.orgId, isReady])
  
  // Get all athlete IDs for the guardian
  const athleteIds = useMemo(() => athletes.map(a => a.id), [athletes])
  
  // Get the first athlete for the guardian (in a real app, would support multiple)
  const athleteId = athleteIds[0]
  
  // Fetch videos for the athlete
  const { videos, total: _total, isLoading, error, refresh } = useAthleteVideos({
    athleteId,
    enabled: isReady && !!athleteId
  })
  
  // Filter videos based on active tab
  const filteredVideos = useMemo(() => {
    let filtered = videos
    
    // Apply team filter
    if (selectedTeam) {
      filtered = filtered.filter(v => v.team_id === selectedTeam)
    }
    
    // Apply season filter
    if (selectedSeason) {
      filtered = filtered.filter(v => v.season_id === selectedSeason)
    }
    
    // For "needs review" - would need notes_count from backend
    // For now, show all as needing review
    if (activeTab === 'needs_review') {
      // In real implementation, filter by videos with unread notes
      return filtered
    }
    
    // For "recent" - last 7 days
    if (activeTab === 'recent') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return filtered.filter(v => new Date(v.created_at) >= weekAgo)
    }
    
    // For "library" - all videos
    return filtered
  }, [videos, activeTab, selectedTeam, selectedSeason])
  
  // Get unique teams and seasons for filters
  const teams = useMemo(() => {
    const teamMap = new Map<string, { id: string; name: string }>()
    videos.forEach(v => {
      if (v.team?.id && v.team?.name) {
        teamMap.set(v.team.id, { id: v.team.id, name: v.team.name })
      }
    })
    return Array.from(teamMap.values())
  }, [videos])
  
  // Loading state
  if (!isReady || isLoading || isLoadingAthletes) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Videos' }
        ]}
      >
        <div className="mb-8">
          <PageTitle>Guardian Video</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
            Review and manage athlete video feedback and game highlights.
          </p>
        </div>
        
        {/* Loading Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} noPadding className="animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </PortalLayout>
    )
  }
  
  // Error state
  if (error) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Videos' }
        ]}
      >
        <div className="mb-8">
          <PageTitle>Guardian Video</PageTitle>
        </div>
        
        <Card className="text-center py-12">
          <Icon name="error" size="text-4xl" className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Failed to load videos
          </h3>
          <p className="text-slate-500 mb-4">{error.message}</p>
          <Button onClick={refresh}>Try Again</Button>
        </Card>
      </PortalLayout>
    )
  }
  
  // No athlete linked
  if (athletes.length === 0) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Videos' }
        ]}
      >
        <div className="mb-8">
          <PageTitle>Guardian Video</PageTitle>
        </div>
        
        <Card className="text-center py-12">
          <Icon name="videocam_off" size="text-4xl" className="text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No Athletes Linked
          </h3>
          <p className="text-slate-500 mb-4">
            Link an athlete to your account to view their videos.
          </p>
          <Button as={Link} to="/portal/athletes">
            View My Athletes
          </Button>
        </Card>
      </PortalLayout>
    )
  }
  
  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Videos' }
      ]}
    >
      {/* Page Heading */}
      <div className="mb-8">
        <PageTitle>Guardian Video</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
          Review and manage athlete video feedback and game highlights.
        </p>
      </div>
      
      {/* Tab System */}
      <div className="mb-2">
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-10">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-col items-center justify-center border-b-[3px] pb-4 pt-2 transition-colors",
                activeTab === tab.key
                  ? "border-[var(--org-btn-primary-bg)] text-[var(--org-btn-primary-bg)]"
                  : "border-transparent text-slate-500 dark:text-slate-500 hover:text-[var(--org-link-color)]"
              )}
            >
              <p className="text-sm font-bold tracking-wider uppercase">{tab.label}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Filter Bar */}
      <div className="flex gap-3 py-6 flex-wrap">
        {/* Team Filter */}
        {teams.length > 0 && (
          <button
            onClick={() => setSelectedTeam(null)} // TODO: Add dropdown
            className="flex h-10 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 shadow-sm hover:border-[var(--org-btn-primary-bg)] transition-all group"
          >
            <p className="text-slate-900 dark:text-white text-sm font-semibold">
              TEAM: <span className="text-[var(--org-link-color)]">
                {selectedTeam ? teams.find(t => t.id === selectedTeam)?.name : 'All Teams'}
              </span>
            </p>
            <Icon name="expand_more" className="text-slate-900 dark:text-white group-hover:text-[var(--org-link-color)] transition-colors" />
          </button>
        )}
        
        {/* Season Filter */}
        <button
          onClick={() => setSelectedSeason(null)} // TODO: Add dropdown
          className="flex h-10 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 shadow-sm hover:border-[var(--org-btn-primary-bg)] transition-all group"
        >
          <p className="text-slate-900 dark:text-white text-sm font-semibold">
            SEASON: <span className="text-[var(--org-link-color)]">All Seasons</span>
          </p>
          <Icon name="expand_more" className="text-slate-900 dark:text-white group-hover:text-[var(--org-link-color)] transition-colors" />
        </button>
      </div>
      
      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <Card className="text-center py-12">
          <Icon name="videocam" size="text-4xl" className="text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No videos found
          </h3>
          <p className="text-slate-500">
            {activeTab === 'needs_review'
              ? 'No videos require review at this time.'
              : activeTab === 'recent'
              ? 'No recent videos in the last 7 days.'
              : 'No videos have been shared with your athlete yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.map((video) => (
            <GuardianVideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
      
      {/* Info Section */}
      <section className="mt-20 py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-[var(--org-btn-primary-bg)]/5 dark:bg-[var(--org-btn-primary-bg)]/10 rounded-2xl p-8 border border-[var(--org-btn-primary-bg)]/20">
          <div className="max-w-xl">
            <h3 className="text-slate-900 dark:text-white text-2xl font-bold mb-3">
              Keep your athlete on track
            </h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Coach feedback is critical for development. Make sure to review all "Needs Review" videos to see specific visual tags and comments on athlete performance from the recent season.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" as={Link} to="/portal/athletes">
              VIEW PROGRESS REPORT
            </Button>
          </div>
        </div>
      </section>
    </PortalLayout>
  )
}

/**
 * Guardian Video Card Component
 * 
 * Extended video card with "View Notes" button for guardian portal.
 */
function GuardianVideoCard({ video }: { video: Video }) {
  // Mock new notes count - in real app, would come from backend
  const newNotesCount = Math.floor(Math.random() * 5) + 1
  
  return (
    <Card noPadding className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div 
        className="relative w-full aspect-video bg-center bg-no-repeat bg-cover"
        style={{ 
          backgroundImage: video.thumbnail_url 
            ? `url(${video.thumbnail_url})` 
            : undefined 
        }}
      >
        {!video.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <Icon name="videocam" size="text-4xl" className="text-slate-400" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
        
        {/* New Notes Badge */}
        {newNotesCount > 0 && (
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <Icon name="chat_bubble" size="text-[12px]" />
              {newNotesCount} NEW {newNotesCount === 1 ? 'NOTE' : 'NOTES'}
            </span>
          </div>
        )}
        
        {/* Duration Badge */}
        {video.duration_seconds && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
            {formatDuration(video.duration_seconds)}
          </div>
        )}
        
        {/* Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="size-12 bg-white/90 rounded-full flex items-center justify-center text-[var(--org-btn-primary-bg)] shadow-lg">
            <Icon name="play_arrow" size="text-3xl" />
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-slate-900 dark:text-white text-xl font-bold leading-tight group-hover:text-[var(--org-link-color)] transition-colors uppercase">
            {video.title}
          </h3>
          {video.team?.name && (
            <div className="mt-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Icon name="groups" size="text-sm" />
              <p className="text-sm font-medium">{video.team.name}</p>
            </div>
          )}
          {video.recorded_at && (
            <div className="mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Icon name="calendar_today" size="text-sm" />
              <p className="text-xs font-normal">
                {new Date(video.recorded_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
        
        <Link
          to={`/portal/videos/${video.id}`}
          className="w-full org-btn-primary font-bold py-3 rounded-lg text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="edit_note" size="text-lg" />
          VIEW NOTES
        </Link>
      </div>
    </Card>
  )
}

/**
 * Format duration helper
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}:${String(remainingMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
