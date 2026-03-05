/**
 * ChannelList Component
 * 
 * Displays a list of available Stream Chat channels (teams, org-wide, DMs)
 * with unread counts and channel type indicators.
 */

import { useState, useEffect } from 'react'
import { Channel } from 'stream-chat'
import Icon from '../portal/Icon'
import { SectionHeader } from '../portal/Typography'

interface ChannelListProps {
  onChannelSelect: (channel: Channel) => void
  selectedChannel: Channel | null
  teamChannels: Channel[]
  orgChannels: Channel[]
  dmChannels: Channel[]
  loading?: boolean
  resolveChannelName?: (channel: Channel, fallbackName: string, type: 'team' | 'org' | 'dm') => string
}

export default function ChannelList({
  onChannelSelect,
  selectedChannel,
  teamChannels,
  orgChannels,
  dmChannels,
  loading = false,
  resolveChannelName,
}: ChannelListProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Update unread counts when channels change
  useEffect(() => {
    const allChannels = [...teamChannels, ...orgChannels, ...dmChannels]
    const counts: Record<string, number> = {}

    allChannels.forEach(channel => {
      const state = channel.state
      counts[channel.id!] = state.unreadCount || 0
    })

    setUnreadCounts(counts)

    // Listen for new messages to update counts
    const handleNewMessage = (channel: Channel) => {
      setUnreadCounts(prev => ({
        ...prev,
        [channel.id!]: channel.state.unreadCount || 0,
      }))
    }

    allChannels.forEach(channel => {
      channel.on('message.new', () => handleNewMessage(channel))
    })

    return () => {
      allChannels.forEach(channel => {
        channel.off('message.new', () => handleNewMessage(channel))
      })
    }
  }, [teamChannels, orgChannels, dmChannels])

  const renderChannel = (channel: Channel, type: 'team' | 'org' | 'dm') => {
    const isSelected = selectedChannel?.id === channel.id
    const unreadCount = unreadCounts[channel.id!] || 0
    const channelData = channel.data as Record<string, unknown> | undefined
    const fallbackName = (channelData?.name as string | undefined) || 'Unnamed Channel'
    const channelName = resolveChannelName?.(channel, fallbackName, type) || fallbackName
    const threadRole = typeof channelData?.created_by_role_context === 'string'
      ? channelData.created_by_role_context
      : null
    const guardianVisible = channelData?.requires_parental_copy_notice === true
    
    let icon = 'forum'
    if (type === 'team') icon = 'groups'
    if (type === 'org') icon = 'business'
    if (type === 'dm') icon = 'person'

    return (
      <button
        key={channel.id}
        onClick={() => onChannelSelect(channel)}
        className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors font-medium flex items-center justify-between group ${
          isSelected
            ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
            : 'hover:bg-gray-50 dark:hover:bg-neutral-900 text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon 
            name={icon} 
            size="text-lg" 
            className={isSelected ? 'text-[var(--org-link-color)]' : 'text-gray-400'} 
          />
          <div className="min-w-0 flex-1">
            <span className="truncate block">{channelName}</span>
            {(threadRole || guardianVisible) && (
              <div className="mt-0.5 flex items-center gap-1">
                {threadRole && (
                  <span className="inline-flex rounded bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {threadRole}
                  </span>
                )}
                {guardianVisible && (
                  <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                    Guardian Visible
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="bg-[var(--org-btn-primary-bg)] text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  const hasChannels = teamChannels.length > 0 || orgChannels.length > 0 || dmChannels.length > 0

  if (!hasChannels) {
    return (
      <div className="text-center py-8 px-4">
        <Icon name="chat_bubble" size="text-4xl" className="text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No channels available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Channels */}
      {teamChannels.length > 0 && (
        <div>
          <SectionHeader className="mb-3 px-2 flex items-center gap-2">
            <Icon name="groups" size="text-base" className="text-gray-400" />
            Team Channels
          </SectionHeader>
          <div>
            {teamChannels.map(channel => renderChannel(channel, 'team'))}
          </div>
        </div>
      )}

      {/* Org-wide Channels */}
      {orgChannels.length > 0 && (
        <div>
          <SectionHeader className="mb-3 px-2 flex items-center gap-2">
            <Icon name="business" size="text-base" className="text-gray-400" />
            Organization
          </SectionHeader>
          <div>
            {orgChannels.map(channel => renderChannel(channel, 'org'))}
          </div>
        </div>
      )}

      {/* Direct Messages */}
      {dmChannels.length > 0 && (
        <div>
          <SectionHeader className="mb-3 px-2 flex items-center gap-2">
            <Icon name="person" size="text-base" className="text-gray-400" />
            Direct Messages
          </SectionHeader>
          <div>
            {dmChannels.map(channel => renderChannel(channel, 'dm'))}
          </div>
        </div>
      )}
    </div>
  )
}
