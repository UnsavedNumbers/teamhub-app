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
  getUserDMChannels,
} from '../lib/streamChat'

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
  const [dmChannels, setDMChannels] = useState<StreamChannel[]>([])
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])


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
      
      // Auto-create team channels if they don't exist
      const client = getStreamClient()
      for (const teamId of teamIds) {
        try {
          const channels = await client.queryChannels({
            type: 'messaging',
            team: teamId,
          })
          
          if (channels.length === 0) {
            const channel = client.channel('messaging', `team-${teamId}`, {
              name: `Team Channel`,
              team: teamId,
              members: [user!.id],
            })
            await channel.create()
          }
        } catch (error) {
          console.error('Error creating channel for team:', teamId, error)
        }
      }
      
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
          Team chat and messaging.
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
                {teamChannels.length + orgChannels.length + dmChannels.length}
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
            ) : teamChannels.length === 0 && orgChannels.length === 0 && dmChannels.length === 0 ? (
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
                      dmChannels={dmChannels}
                      selectedChannel={selectedChannel}
                      onChannelSelect={setSelectedChannel}
                      loading={streamLoading}
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
