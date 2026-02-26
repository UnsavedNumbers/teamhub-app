/**
 * Huddles Page - Stream Chat Integration
 * 
 * Replaces the old Messages page with full Stream Chat functionality.
 * Features: team/org channels, DMs, threading, attachments, mentions, pinned messages.
 */

import { useState, useEffect, useRef } from 'react'
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
} from '../lib/streamChat'
import { USE_FAKE_DATA } from '../data/config'

import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import EmptyState from '../components/portal/EmptyState'
import ChannelList from '../components/huddles/ChannelList'
import PinnedMessages from '../components/huddles/PinnedMessages'
import MessageThread from '../components/huddles/MessageThread'
import { getTeamsForParent, getTeams } from '../data/services/teamsService'
import { showError } from '../utils/toast'

interface Team {
  id: string
  name: string
}

export default function Huddles() {
  useDebugLifecycle('Huddles')
  const { user } = useAuth()
  const { context, isReady } = useUserContext()
  const t = useT()

  // Stream Chat state
  const [streamClient, setStreamClient] = useState<StreamChat | null>(null)
  const [streamConnected, setStreamConnected] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel | null>(null)
  const [teamChannels, setTeamChannels] = useState<StreamChannel[]>([])
  const [orgChannels, setOrgChannels] = useState<StreamChannel[]>([])
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])


  // Initialize Stream Chat connection (once)
  const hasInitializedStream = useRef(false)
  const seededDemoTeamChannelIds = useRef<Set<string>>(new Set())
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

        // Load channels after teams are fetched
        // (loadChannels will be called when teams state updates)
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

  // Load Stream channels
  const loadChannels = async () => {
    if (!isReady || !streamClient || !user) return

    try {
      const teamIds = teams.map(t => t.id)
      const orgIds = context.orgId ? [context.orgId] : []
      const teamNamesById = new Map(teams.map(team => [team.id, team.name]))
      const client = getStreamClient()

      const seedTeamChannelIfNeeded = async (channel: StreamChannel, teamName: string) => {
        if (!USE_FAKE_DATA || !channel.id) return
        if (seededDemoTeamChannelIds.current.has(channel.id)) return
        if (channel.state.messages.length > 0) {
          seededDemoTeamChannelIds.current.add(channel.id)
          return
        }

        try {
          const demoSeedMessages = [
            `${teamName} huddle created for demo. Share updates, reminders, and game-day logistics here.`,
            `Practice reminder for ${teamName}: arrive 15 minutes early for warmups.`,
            `Please post your player availability in this thread before Friday.`,
          ]

          for (const text of demoSeedMessages) {
            await channel.sendMessage({
              type: 'system',
              text,
            })
          }
        } catch (error) {
          console.error('Error seeding demo huddle channel:', error)
        } finally {
          seededDemoTeamChannelIds.current.add(channel.id)
        }
      }
      
      // Auto-create team channels if they don't exist
      for (const teamId of teamIds) {
        try {
          const channels = await client.queryChannels({
            type: 'messaging',
            team: teamId,
          })
          const teamName = teamNamesById.get(teamId) || 'Team'
          
          if (channels.length === 0) {
            const channel = client.channel('messaging', `team-${teamId}`, {
              name: `${teamName} Huddle`,
              team: teamId,
              members: [user!.id],
            })
            await channel.create()
            await channel.watch()
            await seedTeamChannelIfNeeded(channel, teamName)
          } else if (USE_FAKE_DATA) {
            for (const channel of channels) {
              await seedTeamChannelIfNeeded(channel, teamName)
            }
          }
        } catch (error) {
          console.error('Error creating channel for team:', teamId, error)
        }
      }
      
      const [teamResult, orgResult] = await Promise.all([
        getUserTeamChannels(teamIds),
        getUserOrgChannels(orgIds),
      ])

      setTeamChannels(teamResult)
      setOrgChannels(orgResult)

      // Auto-select first channel if none selected
      if (!selectedChannel) {
        const firstChannel = teamResult[0] || orgResult[0]
        if (firstChannel) {
          setSelectedChannel(firstChannel)
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error)
    }
  }

  // Fetch teams for Stream Chat channels
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
          console.error('Error fetching teams:', result.error)
          setTeams([])
        } else if (result.data) {
          setTeams(result.data.map((t: Team) => ({ id: t.id, name: t.name })))
        }
      } catch (error) {
        console.error('Error fetching teams:', error)
        setTeams([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [isReady, context])

  // Reload channels when teams change or Stream connects
  useEffect(() => {
    if (streamConnected && streamClient && teams.length >= 0) {
      loadChannels()
    }
  }, [teams, streamConnected, streamClient, user])

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


  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Huddles' },
      ]}
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <PageTitle>Huddles</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide mt-1">
          Team and organization chat channels.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        {/* Left: Channel List */}
        <div className="w-[320px] flex-shrink-0 flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
          {/* List Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                Channels
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {teamChannels.length + orgChannels.length}
              </span>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto">
            {streamLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !streamConnected || !streamClient ? (
              <div className="p-8">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500">{t('portal.huddles.connectingToChat')}</p>
                </div>
              </div>
            ) : teamChannels.length === 0 && orgChannels.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="forum"
                  title="No Channels"
                  description="You don't have access to any channels yet."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {streamClient && (
                  <Chat client={streamClient}>
                    <ChannelList
                      teamChannels={teamChannels}
                      orgChannels={orgChannels}
                      dmChannels={[]}
                      selectedChannel={selectedChannel}
                      onChannelSelect={setSelectedChannel}
                      loading={streamLoading}
                      resolveChannelName={(channel, fallbackName, type) => {
                        if (type !== 'team') return fallbackName
                        const teamId = typeof channel.data?.team === 'string' ? channel.data.team : ''
                        const teamName = teams.find(team => team.id === teamId)?.name
                        if (!teamName) return fallbackName
                        if (!fallbackName || fallbackName === 'Team Channel' || fallbackName === 'Unnamed Channel') {
                          return `${teamName} Huddle`
                        }
                        return fallbackName
                      }}
                    />
                  </Chat>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
          {streamConnected && streamClient && selectedChannel ? (
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="forum"
                title={!streamConnected ? t('portal.huddles.connectingToChat') : 'Select a Channel'}
                description={!streamConnected ? 'Connecting to chat...' : 'Choose a channel from the list to start messaging.'}
              />
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
