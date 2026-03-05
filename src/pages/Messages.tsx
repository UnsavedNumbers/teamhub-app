/**
 * Messages Page
 *
 * Dedicated direct user-to-user messaging surface.
 * Team and organization chat stays in /portal/huddles.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import { getStreamToken, startDirectMessage } from '../data/services/huddlesService'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import {
  getStreamClient,
  connectUser,
  disconnectUser,
  getDMChannel,
  getUserDMChannels,
} from '../lib/streamChat'
import { getTeamsForParent, getTeams } from '../data/services/teamsService'
import { DEMO_USER_IDS, USE_FAKE_DATA } from '../data/config'
import {
  DEFAULT_ORG_MESSAGING_SETTINGS,
  evaluateDmAttempt,
  type DmPolicyDecision,
  type MessagingRoleContext,
} from '../lib/messaging'

import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import EmptyState from '../components/portal/EmptyState'
import ChannelList from '../components/huddles/ChannelList'
import { showError } from '../utils/toast'

interface Team {
  id: string
  name: string
}

interface DemoRecipient {
  id: string
  userId: string
  name: string
  teamName: string
  roleContext: MessagingRoleContext
}

const DEMO_DIRECT_MESSAGE_RECIPIENTS: Array<{
  userId: string
  name: string
  roleContext: MessagingRoleContext
}> = [
  { userId: DEMO_USER_IDS['coach-only@example.com'], name: 'Coach Jordan Reed', roleContext: 'coach' },
  { userId: DEMO_USER_IDS['parent-coach@example.com'], name: 'Coach Mia Carter', roleContext: 'coach' },
  { userId: DEMO_USER_IDS['admin-only@example.com'], name: 'Admin Alex Lee', roleContext: 'org_admin' },
  { userId: DEMO_USER_IDS['staff-only@example.com'], name: 'Team Manager Sam Patel', roleContext: 'staff' },
]

export default function Messages() {
  useDebugLifecycle('Messages')
  const { user } = useAuth()
  const { context, isReady } = useUserContext()

  const [streamClient, setStreamClient] = useState<StreamChat | null>(null)
  const [streamConnected, setStreamConnected] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel | null>(null)
  const [dmChannels, setDmChannels] = useState<StreamChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [actingRoleContext, setActingRoleContext] = useState<MessagingRoleContext>('parent')
  const [policyDecisionByChannelId, setPolicyDecisionByChannelId] = useState<Record<string, DmPolicyDecision>>({})

  const hasInitializedStream = useRef(false)
  const seededDemoChannelIds = useRef<Set<string>>(new Set())

  const demoRecipients = useMemo<DemoRecipient[]>(() => {
    if (!USE_FAKE_DATA || teams.length === 0) return []
    return teams.slice(0, DEMO_DIRECT_MESSAGE_RECIPIENTS.length).map((team, index) => {
      const recipient = DEMO_DIRECT_MESSAGE_RECIPIENTS[index]
      return {
        id: `demo-recipient-${recipient.userId}-${team.id}`,
        userId: recipient.userId,
        name: recipient.name,
        teamName: team.name,
        roleContext: recipient.roleContext,
      }
    }).filter((recipient) => recipient.userId !== user?.id)
  }, [teams, user?.id])

  const roleContextOptions = useMemo<Array<{ value: MessagingRoleContext; label: string }>>(() => {
    const options: Array<{ value: MessagingRoleContext; label: string }> = []
    const roles = context.roles || []

    if (roles.includes('org_admin')) options.push({ value: 'org_admin', label: 'Org Admin' })
    if (roles.includes('coach')) options.push({ value: 'coach', label: 'Coach' })
    if (roles.includes('staff')) options.push({ value: 'staff', label: 'Staff' })
    if (roles.includes('parent') || roles.includes('guardian')) options.push({ value: 'parent', label: 'Parent' })
    if (roles.includes('athlete')) options.push({ value: 'athlete_minor', label: 'Athlete' })

    if (options.length === 0) options.push({ value: 'parent', label: 'Parent' })
    return options
  }, [context.roles])

  useEffect(() => {
    if (roleContextOptions.length === 0) return
    setActingRoleContext((previous) => {
      const exists = roleContextOptions.some((option) => option.value === previous)
      return exists ? previous : roleContextOptions[0].value
    })
  }, [roleContextOptions])

  useEffect(() => {
    if (!isReady || !user || hasInitializedStream.current) return
    hasInitializedStream.current = true

    const initializeStreamChat = async () => {
      setStreamLoading(true)
      try {
        const result = await getStreamToken()

        if ('error' in result) {
          console.error('Failed to get Stream token:', result.error)
          showError('Failed to connect to messages')
          setStreamLoading(false)
          return
        }

        const client = getStreamClient()
        await connectUser(user.id, result.token, result.user)
        setStreamClient(client)
        setStreamConnected(true)
      } catch (error) {
        console.error('Error initializing direct messages:', error)
        showError('Failed to connect to messages')
      } finally {
        setStreamLoading(false)
      }
    }

    initializeStreamChat()

    return () => {
      if (hasInitializedStream.current) {
        disconnectUser()
        hasInitializedStream.current = false
      }
    }
  }, [isReady, user])

  useEffect(() => {
    if (!isReady) return

    const fetchTeams = async () => {
      try {
        const isParent = context.roles?.includes('parent') && !context.roles?.includes('org_admin')
        const result = isParent
          ? await getTeamsForParent(context)
          : await getTeams(context, { activeOnly: true })

        if (result.error) {
          console.error('Error fetching teams for messages:', result.error)
          setTeams([])
          return
        }

        const nextTeams = (result.data ?? []).map((team: Team) => ({ id: team.id, name: team.name }))
        setTeams(nextTeams)
      } catch (error) {
        console.error('Error fetching teams for messages:', error)
        setTeams([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [isReady, context])

  const seedDemoChannel = useCallback(async (channel: StreamChannel, recipient: DemoRecipient) => {
    if (!USE_FAKE_DATA || !channel.id) return
    if (seededDemoChannelIds.current.has(channel.id)) return

    if (channel.state.messages.length > 0) {
      seededDemoChannelIds.current.add(channel.id)
      return
    }

    try {
      await channel.sendMessage({
        type: 'system',
        text: `Direct message thread started with ${recipient.name} (${recipient.teamName}).`,
      })
      await channel.sendMessage({
        text: `Hi ${recipient.name.split(' ')[1] ?? recipient.name}, checking in about ${recipient.teamName}.`,
      })
      await channel.sendMessage({
        text: `Can you confirm arrival time for the next ${recipient.teamName} event?`,
      })
    } catch (error) {
      console.error('Error seeding demo direct message channel:', error)
    } finally {
      seededDemoChannelIds.current.add(channel.id)
    }
  }, [])

  const loadDirectMessageChannels = useCallback(async () => {
    if (!isReady || !streamClient || !user) return

    try {
      let channels = await getUserDMChannels()

      if (USE_FAKE_DATA && channels.length === 0 && demoRecipients.length > 0) {
        for (const recipient of demoRecipients) {
          const channel = await getDMChannel(user.id, recipient.userId, {
            name: `${recipient.name} - ${recipient.teamName}`,
          })
          await seedDemoChannel(channel, recipient)
        }
        channels = await getUserDMChannels()
      }

      setDmChannels(channels)

      if (!selectedChannel) {
        const firstChannel = channels[0]
        if (firstChannel) {
          setSelectedChannel(firstChannel)
        }
      }
    } catch (error) {
      console.error('Error loading direct message channels:', error)
    }
  }, [isReady, streamClient, user, demoRecipients, seedDemoChannel, selectedChannel])

  useEffect(() => {
    if (streamConnected && streamClient) {
      loadDirectMessageChannels()
    }
  }, [streamConnected, streamClient, loadDirectMessageChannels])

  const handleStartDemoDirectMessage = useCallback(async (recipient: DemoRecipient) => {
    if (!user) return
    if (!streamConnected || !streamClient) {
      showError('Messages are still connecting. Please try again in a moment.')
      return
    }

    setStreamLoading(true)
    try {
      let decision: DmPolicyDecision
      let channelIdOverride: string | undefined
      let members: string[] | undefined

      if (USE_FAKE_DATA) {
        decision = evaluateDmAttempt({
          actor_user_id: user.id,
          recipient_user_id: recipient.userId,
          org_id: context.orgId,
          channel_mode: 'dm',
          acting_role_context: actingRoleContext,
          recipient_role_context: recipient.roleContext,
          org_settings: {
            org_id: context.orgId,
            ...DEFAULT_ORG_MESSAGING_SETTINGS,
          },
          is_same_team: true,
        })
      } else {
        const dmResult = await startDirectMessage({
          actor_user_id: user.id,
          recipient_user_id: recipient.userId,
          org_id: context.orgId,
          acting_role_context: actingRoleContext,
          recipient_role_context: recipient.roleContext,
          idempotency_key: `messages:${user.id}:${recipient.userId}:${Date.now()}`,
        })

        if ('error' in dmResult) {
          const reasonCode = dmResult.decision?.reason_code
          const errorMessage = reasonCode
            ? `Message blocked by policy: ${reasonCode}`
            : dmResult.error.message
          showError(errorMessage)
          return
        }

        decision = dmResult.data.decision
        channelIdOverride = dmResult.data.channel.stream_channel_id
        members = dmResult.data.decision.final_recipients
      }

      if (!decision.allowed) {
        showError(`Message blocked by policy: ${decision.reason_code}`)
        return
      }

      const channel = await getDMChannel(user.id, recipient.userId, {
        name: `${recipient.name} - ${recipient.teamName}`,
        channelId: channelIdOverride,
        members,
        data: {
          policy_version: decision.policy_version,
          rule_id_at_creation: decision.rule_id,
          guardian_copy_mode: decision.guardian_copy_targets.length > 0 ? 'full_thread' : 'none',
          created_by_role_context: actingRoleContext,
          requires_parental_copy_notice: decision.requires_parental_copy_notice,
        },
      })
      await seedDemoChannel(channel, recipient)

      if (channel.id) {
        setPolicyDecisionByChannelId((previous) => ({
          ...previous,
          [channel.id!]: decision,
        }))
      }

      await loadDirectMessageChannels()
      setSelectedChannel(channel)
    } catch (error) {
      console.error('Error creating direct message channel:', error)
      showError('Failed to start direct message')
    } finally {
      setStreamLoading(false)
    }
  }, [user, streamConnected, streamClient, seedDemoChannel, loadDirectMessageChannels, context.orgId, actingRoleContext])

  const selectedChannelPolicyNotice = useMemo(() => {
    if (!selectedChannel?.id) return null
    const selectedChannelData = selectedChannel.data as Record<string, unknown> | undefined
    const decision = policyDecisionByChannelId[selectedChannel.id]
    if (decision?.requires_parental_copy_notice) {
      return "This message will be visible to the athlete's guardians."
    }
    const channelNotice = selectedChannelData?.requires_parental_copy_notice
    if (channelNotice) {
      return "This message will be visible to the athlete's guardians."
    }
    return null
  }, [selectedChannel, policyDecisionByChannelId])

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
        { label: 'Messages' },
      ]}
    >
      <div className="mb-6 sm:mb-8">
        <PageTitle>Messages</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide mt-1">
          Direct messages between users.
        </p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        <div className="w-[360px] flex-shrink-0 flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                Direct Messages
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {dmChannels.length}
              </span>
            </div>

            <div className="mb-3 rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Sending As
              </p>
              <select
                value={actingRoleContext}
                onChange={(event) => setActingRoleContext(event.target.value as MessagingRoleContext)}
                className="w-full text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1"
              >
                {roleContextOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Messaging policies now enforce youth safety visibility and role-based restrictions.
            </div>

            {USE_FAKE_DATA && demoRecipients.length > 0 && (
              <div className="space-y-2">
                {demoRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    onClick={() => handleStartDemoDirectMessage(recipient)}
                    className="w-full text-left px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{recipient.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{recipient.teamName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {streamLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !streamConnected || !streamClient ? (
              <div className="p-8">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500">Connecting to messages...</p>
                </div>
              </div>
            ) : dmChannels.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="mail"
                  title="No direct messages yet"
                  description="Start a new direct message to chat one-to-one."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                <Chat client={streamClient}>
                  <ChannelList
                    teamChannels={[]}
                    orgChannels={[]}
                    dmChannels={dmChannels}
                    selectedChannel={selectedChannel}
                    onChannelSelect={setSelectedChannel}
                    loading={streamLoading}
                  />
                </Chat>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
          {streamConnected && streamClient && selectedChannel ? (
            <Chat client={streamClient}>
              <Channel channel={selectedChannel}>
                <Window>
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      Active role: <strong>{roleContextOptions.find((option) => option.value === actingRoleContext)?.label ?? actingRoleContext}</strong>
                    </span>
                    {Boolean((selectedChannel.data as Record<string, unknown> | undefined)?.created_by_role_context) && (
                      <span className="uppercase tracking-wide text-[10px] text-slate-500">
                        Thread role: {String((selectedChannel.data as Record<string, unknown>).created_by_role_context)}
                      </span>
                    )}
                  </div>
                  {selectedChannelPolicyNotice && (
                    <div className="mx-4 mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {selectedChannelPolicyNotice}
                    </div>
                  )}
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
              </Channel>
            </Chat>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="mail"
                title={!streamConnected ? 'Connecting to messages' : 'Select a conversation'}
                description={!streamConnected ? 'Connecting to direct messages...' : 'Choose a direct message from the list.'}
              />
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
