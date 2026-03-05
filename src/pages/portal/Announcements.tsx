/**
 * Announcements Page
 * 
 * Main announcements page for guardians and athletes.
 * Three-column layout: list view (left) + detail panel (right).
 * Follows portal design principles: clean, neutral, no gradients, no shadows.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { getAnnouncements, getAnnouncementById, type Announcement } from '@/data/services/messagesService'
import { getTeamsForParent } from '@/data/services/teamsService'
import { getAnnouncementEmoji, getAnnouncementLabel } from '@/utils/announcementTypes'
import PortalLayout from '@/components/portal/PortalLayout'
import { PageTitle } from '@/components/portal/Typography'
import EmptyState from '@/components/portal/EmptyState'
import Icon from '@/components/portal/Icon'
import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

interface Team {
  id: string
  name: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function Announcements() {
  useDebugLifecycle('Announcements')
  const { context, isReady } = useUserContext()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { announcementId } = useParams<{ announcementId?: string }>()
  
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const selectedAnnouncementId = announcementId || null

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams', context.orgId],
    queryFn: async () => {
      if (!context.orgId) return []
      const { data, error } = await getTeamsForParent(context)
      if (error) throw error
      return (data || []) as Team[]
    },
    enabled: isReady && !!context.orgId,
  })

  // Fetch announcements
  const { data: announcementsResponse, isLoading } = useQuery({
    queryKey: ['announcements', context.orgId, selectedTeam],
    queryFn: async () => {
      if (!context.orgId) return { data: [], error: null }
      return await getAnnouncements(context, {
        teamId: selectedTeam || undefined,
        includeOrgWide: true,
      })
    },
    enabled: isReady && !!context.orgId,
  })

  const announcements = useMemo(
    () => (announcementsResponse?.data || []) as Announcement[],
    [announcementsResponse]
  )

  // Auto-select first announcement in the URL if none selected
  useEffect(() => {
    if (!selectedAnnouncementId && announcements.length > 0) {
      navigate(`/portal/announcements/${announcements[0].id}`, { replace: true })
    }
  }, [announcements, selectedAnnouncementId, navigate])

  // Fetch selected announcement details
  const { data: selectedAnnouncementResponse } = useQuery({
    queryKey: ['announcement', selectedAnnouncementId],
    queryFn: async () => {
      if (!selectedAnnouncementId) return { data: null, error: null }
      return await getAnnouncementById(context, selectedAnnouncementId)
    },
    enabled: !!selectedAnnouncementId && isReady,
  })

  const selectedAnnouncement = selectedAnnouncementResponse?.data || null

  // Filter options
  const filterOptions = useMemo((): { value: string | null; label: string }[] => {
    const options: { value: string | null; label: string }[] = [
      { value: null, label: t('portal.fan.announcements.all', { defaultValue: 'All Announcements' }) },
    ]
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        options.push({ value: team.id, label: team.name })
      })
    }
    return options
  }, [teams, t])

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: t('nav.announcements') },
      ]}
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <PageTitle>{t('nav.announcements')}</PageTitle>
        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide mt-1">
          {t('portal.fan.announcements.subtitle', { defaultValue: 'Stay updated with important announcements from your organization' })}
        </p>
      </div>

      {/* Three-column layout */}
      <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        {/* Left: Announcements List */}
        <div className="w-[320px] flex-shrink-0 flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          {/* List Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
                {t('portal.fan.announcements.list', { defaultValue: 'Announcements' })}
              </h2>
              <span className="text-xs font-bold text-gray-400">
                {announcements.length}
              </span>
            </div>
            
            {/* Filter Dropdown */}
            {filterOptions.length > 1 && (
              <select
                value={selectedTeam || ''}
                onChange={(e) => setSelectedTeam(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)]"
              >
                {filterOptions.map(option => (
                  <option key={option.value || 'all'} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="campaign"
                  title={t('portal.fan.announcements.empty', { defaultValue: 'No announcements' })}
                  description={t('portal.fan.announcements.emptyDescription', { defaultValue: 'No announcements have been posted yet.' })}
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {announcements.map(ann => {
                  const emoji = getAnnouncementEmoji(ann.type || 'general')
                  const isOrgWide = ann.team_id === null
                  const isSelected = selectedAnnouncementId === ann.id
                  
                  return (
                    <button
                      key={ann.id}
                      onClick={() => navigate(`/portal/announcements/${ann.id}`)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isOrgWide && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded bg-purple-500/10 text-purple-500">
                                Org
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                              (ann.author?.role || 'admin') === 'coach'
                                ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                                : 'bg-purple-500/10 text-purple-500'
                            }`}>
                              {ann.author?.role || 'Admin'}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                            {ann.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {ann.content}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {formatDate(ann.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          {selectedAnnouncement ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAnnouncementEmoji(selectedAnnouncement.type || 'general')}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {selectedAnnouncement.title}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedAnnouncement.team_id === null && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded bg-purple-500/10 text-purple-500">
                            {t('portal.fan.announcements.orgWide', { defaultValue: 'Organization-Wide' })}
                          </span>
                        )}
                        {selectedAnnouncement.team && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {selectedAnnouncement.team.name}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded ${
                          (selectedAnnouncement.author?.role || 'admin') === 'coach'
                            ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                            : 'bg-purple-500/10 text-purple-500'
                        }`}>
                          {selectedAnnouncement.author?.role || 'Admin'}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {getAnnouncementLabel(selectedAnnouncement.type || 'general')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                  {/* Metadata */}
                  <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon name="schedule" size="text-base" className="text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatFullDate(selectedAnnouncement.created_at)}
                        </span>
                      </div>
                      {selectedAnnouncement.author?.email && (
                        <div className="flex items-center gap-2">
                          <Icon name="person" size="text-base" className="text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {selectedAnnouncement.author.email}
                          </span>
                        </div>
                      )}
                      {selectedAnnouncement.priority === 'urgent' && (
                        <div className="flex items-center gap-2">
                          <Icon name="priority_high" size="text-base" className="text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {t('portal.fan.announcements.urgent', { defaultValue: 'Urgent' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedAnnouncement.content}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="campaign"
                title={t('portal.fan.announcements.select', { defaultValue: 'Select an announcement' })}
                description={t('portal.fan.announcements.selectDescription', { defaultValue: 'Choose an announcement from the list to view details.' })}
              />
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}

