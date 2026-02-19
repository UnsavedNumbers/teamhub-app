/**
 * Huddles Page - Stream Chat Integration
 * 
 * Replaces the old Messages page with full Stream Chat functionality.
 * Features: team/org channels, DMs, threading, attachments, mentions, pinned messages.
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { StreamChat, Channel as StreamChannel } from 'stream-chat'
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Window,
} from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'

import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { useT } from '../i18n/useI18n'
import { getStreamToken } from '../data/services/huddlesService'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import {
  getStreamClient,
  connectUser,
  disconnectUser,
  getUserTeamChannels,
  getUserOrgChannels,
  getUserDMChannels,
} from '../lib/streamChat'

import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import ChannelList from '../components/huddles/ChannelList'
import PinnedMessages from '../components/huddles/PinnedMessages'
import MessageThread from '../components/huddles/MessageThread'
import CreateAnnouncementModal from '../components/portal/CreateAnnouncementModal'
import { getAnnouncements, createAnnouncement, type Announcement } from '../data/services/messagesService'
import { getTeamsForParent, getTeams } from '../data/services/teamsService'
import { showError, showSuccess } from '../utils/toast'
import { getAnnouncementEmoji } from '../utils/announcementTypes'

interface Team {
  id: string
  name: string
}

type Tab = 'announcements' | 'huddles'

export default function Huddles() {
  useDebugLifecycle('Huddles')
  const { user, profile } = useAuth()
  const { context, isReady } = useUserContext()
  const t = useT()

  // Stream Chat state
  const [streamClient, setStreamClient] = useState<StreamChat | null>(null)
  const [streamConnected, setStreamConnected] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel | null>(null)
  const [teamChannels, setTeamChannels] = useState<StreamChannel[]>([])
  const [orgChannels, setOrgChannels] = useState<StreamChannel[]>([])
  const [dmChannels, setDMChannels] = useState<StreamChannel[]>([])
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null)

  // UI state - derive from URL path
  const currentPath = window.location.pathname
  const tab: Tab = currentPath.includes('/chat') ? 'huddles' : 'announcements'
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)

  // Announcements state (kept from old Messages.tsx)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [fetchingAnnouncements, setFetchingAnnouncements] = useState(false)

  const canCreateAnnouncements = isReady && (
    context.roles.includes('coach') ||
    context.roles.includes('org_admin') ||
    profile?.isPlatformAdmin === true
  )

  // Initialize Stream Chat connection (once)
  const hasInitializedStream = useRef(false)
  useEffect(() => {
    if (!isReady || !user || hasInitializedStream.current) return
    hasInitializedStream.current = true

    const initializeStreamChat = async () => {
      setStreamLoading(true)
      try {
        const result = await getStreamToken()
        
        if ('error' in result) {
          console.error('Failed to get Stream token:', result.error)
          showError('Failed to connect to chat')
          setStreamLoading(false)
          return
        }

        const client = getStreamClient()
        await connectUser(user.id, result.token, result.user)
        
        setStreamClient(client)
        setStreamConnected(true)
        setStreamLoading(false)

        // Auto-create team channels then load
        await createTeamChannels(result.user.team_ids || [])
        await loadChannels()
      } catch (error) {
        console.error('Error initializing Stream Chat:', error)
        showError('Failed to connect to chat')
        setStreamLoading(false)
      }
    }

    initializeStreamChat()

    return () => {
      // Cleanup on unmount
      if (hasInitializedStream.current) {
        disconnectUser()
        hasInitializedStream.current = false
      }
    }
  }, [isReady, user])

  // Auto-create team channels
  const createTeamChannels = async (teamIds: string[]) => {
    if (!teamIds || teamIds.length === 0) return

    const client = getStreamClient()
    
    for (const teamId of teamIds) {
      try {
        // Check if channel exists
        const channels = await client.queryChannels({
          type: 'messaging',
          team: teamId,
        })
        
        // If no channel for this team, create one
        if (channels.length === 0) {
          const channel = client.channel('messaging', `team-${teamId}`, {
            name: `Team Channel`,
            team: teamId,
            members: [user!.id],
          })
          await channel.create()
          console.log('Created channel for team:', teamId)
        }
      } catch (error) {
        console.error('Error creating channel for team:', teamId, error)
      }
    }
  }

  // Load Stream channels
  const loadChannels = async () => {
    if (!isReady) return

    try {
      const teamIds = teams.map(t => t.id)
      const orgIds = context.orgId ? [context.orgId] : []
      const [teamResult, orgResult, dmResult] = await Promise.all([
        getUserTeamChannels(teamIds),
        getUserOrgChannels(orgIds),
        getUserDMChannels(),
      ])

      setTeamChannels(teamResult)
      setOrgChannels(orgResult)
      setDMChannels(dmResult)

      // Auto-select first channel if none selected
      if (!selectedChannel) {
        const firstChannel = teamResult[0] || orgResult[0] || dmResult[0]
        if (firstChannel) {
          setSelectedChannel(firstChannel)
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error)
    }
  }

  // Fetch teams for announcements
  useEffect(() => {
    if (!isReady) return

    const fetchTeams = async () => {
      try {
        const isParent = context.roles?.includes('parent') && !context.roles?.includes('org_admin')
        
        let result
        if (isParent) {
          result = await getTeamsForParent(context)
        } else {
          result = await getTeams(context, { activeOnly: true })
        }

        if (result.error) {
          showError(result.error.message || 'Failed to load teams')
          setTeams([])
        } else if (result.data) {
          setTeams(result.data.map(t => ({ id: t.id, name: t.name })))
          if (!selectedTeam && result.data.length > 0) {
            setSelectedTeam(result.data[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [isReady])

  // Fetch announcements when team changes
  useEffect(() => {
    if (!selectedTeam || tab !== 'announcements') return

    const fetchAnnouncements = async () => {
      setFetchingAnnouncements(true)
      try {
        const result = await getAnnouncements(context, { teamId: selectedTeam })
        if (result.error) {
          showError(result.error.message || 'Failed to load announcements')
        } else {
          setAnnouncements((result.data as Announcement[]) || [])
        }
      } catch (error) {
        console.error('Error fetching announcements:', error)
      } finally {
        setFetchingAnnouncements(false)
      }
    }

    fetchAnnouncements()
  }, [selectedTeam, tab])

  const handleCreateAnnouncement = async (
    title: string,
    content: string,
    priority: 'normal' | 'urgent',
    teamId: string,
    type: Announcement['type'],
    isOrgWide: boolean
  ) => {
    if (!selectedTeam) return

    try {
      const result = await createAnnouncement(
        context,
        title,
        content,
        priority,
        isOrgWide ? null : teamId,
        context.userId,
        context.orgId,
        type,
        isOrgWide
      )

      if (result.error) {
        showError(result.error.message || 'Failed to create announcement')
      } else {
        showSuccess('Announcement created successfully')
        setIsCreateModalOpen(false)
        // Refresh announcements
        const refreshResult = await getAnnouncements(context, { teamId: selectedTeam })
        if (refreshResult.data) {
          setAnnouncements(refreshResult.data as Announcement[])
        }
      }
    } catch (error) {
      console.error('Error creating announcement:', error)
      showError('Failed to create announcement')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Show loading state
  if (!isReady || loading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  // Show empty state when no teams
  if (teams.length === 0) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: t('common.home'), path: '/portal/dashboard' },
          { label: 'Huddles' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Huddles</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            Team chat and announcements.
          </p>
        </div>
        
        <Card className="text-center py-12">
          <Icon name="forum" size="text-6xl" className="text-slate-400 mb-4" />
          <CardTitle className="mb-2">No Teams Available</CardTitle>
          <p className="text-slate-500 dark:text-slate-400">
            You are not currently associated with any teams.
          </p>
        </Card>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Huddles' },
      ]}
    >
      <div className="mb-8">
        <PageTitle>Huddles</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
          Team chat and announcements.
        </p>
      </div>

      <div className="fixed left-0 right-0 top-[4rem] bottom-0 overflow-hidden" style={{ top: '14rem' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-white dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <PageTitle className="text-2xl mb-2">Huddles</PageTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Team chat</p>
            </div>

            {/* Tab Selector */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <Link
                  to="/portal/huddles/announcements"
                  className={`flex-1 px-3 py-2 rounded text-sm font-bold transition-colors text-center ${
                    tab === 'announcements'
                      ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Announcements
                </Link>
                <Link
                  to="/portal/huddles/chat"
                  className={`flex-1 px-3 py-2 rounded text-sm font-bold transition-colors text-center ${
                    tab === 'huddles'
                      ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Chat
                </Link>
              </div>
            </div>

            {/* Content based on tab */}
            <div className="flex-1 overflow-y-auto p-3">
              {tab === 'announcements' && (
                <div>
                  <SectionHeader className="mb-4 px-2">All Teams</SectionHeader>
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors font-bold ${
                        selectedTeam === team.id
                          ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'huddles' && streamConnected && streamClient && (
                <Chat client={streamClient}>
                  <ChannelList
                    teamChannels={teamChannels}
                    orgChannels={orgChannels}
                    dmChannels={dmChannels}
                    selectedChannel={selectedChannel}
                    onChannelSelect={setSelectedChannel}
                    loading={streamLoading}
                  />
                </Chat>
              )}

              {tab === 'huddles' && !streamConnected && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500">{t('portal.huddles.connectingToChat')}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              {tab === 'announcements' && canCreateAnnouncements && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full px-4 py-2.5 bg-[var(--org-btn-primary-bg)] text-white rounded font-bold hover:bg-[var(--org-btn-primary-bg)]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="add" size="text-lg" />
                  New Announcement
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {tab === 'announcements' && (
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                {fetchingAnnouncements ? (
                  <Card className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading announcements...</p>
                  </Card>
                ) : announcements.length === 0 ? (
                  <Card className="text-center py-12">
                    <Icon name="campaign" size="text-6xl" className="text-slate-400 mb-4" />
                    <CardTitle className="mb-2">No Announcements</CardTitle>
                    <p className="text-slate-500 dark:text-slate-400">
                      {canCreateAnnouncements
                        ? 'Create your first announcement to get started.'
                        : 'No announcements have been posted yet.'}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {announcements.map(ann => {
                      const emoji = getAnnouncementEmoji(ann.type || 'general')
                      const isOrgWide = ann.team_id === null
                      
                      return (
                        <Link key={ann.id} to={`/portal/messages/${ann.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{emoji}</span>
                                {isOrgWide && (
                                  <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded bg-purple-500/10 text-purple-500">
                                    Org-Wide
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded ${
                                  (ann.author?.role || 'admin') === 'coach'
                                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                                    : 'bg-purple-500/10 text-purple-500'
                                }`}>
                                  {ann.author?.role || 'Admin'}
                                </span>
                                <CardTitle className="text-lg">{ann.title}</CardTitle>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {formatDate(ann.created_at)}
                              </span>
                            </div>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'huddles' && streamConnected && streamClient && selectedChannel && (
              <Chat client={streamClient}>
                <Channel channel={selectedChannel}>
                  <Window>
                    <PinnedMessages
                      channel={selectedChannel}
                      userRole={context.roles.includes('org_admin') ? 'org_admin' : context.roles.includes('coach') ? 'coach' : 'guardian'}
                    />
                    <ChannelHeader />
                    <MessageList />
                    <MessageInput />
                  </Window>
                  {threadMessageId && (
                    <MessageThread
                      parentMessageId={threadMessageId}
                      onClose={() => setThreadMessageId(null)}
                    />
                  )}
                </Channel>
              </Chat>
            )}

            {tab === 'huddles' && (!streamConnected || !selectedChannel) && (
              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                  <Icon name="forum" size="text-6xl" className="text-slate-300 mb-4" />
                  <p className="text-slate-500">
                    {!streamConnected ? t('portal.huddles.connectingToChat') : t('portal.huddles.selectChannelToChat')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAnnouncement}
        teams={teams}
        selectedTeamId={selectedTeam}
      />
    </PortalLayout>
  )
}
