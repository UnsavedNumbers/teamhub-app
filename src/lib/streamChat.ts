/**
 * Stream Chat Service
 * 
 * Initializes and manages Stream Chat client for real-time messaging.
 * Handles token generation, user connection, and channel operations.
 */

import { StreamChat, Channel, ChannelFilters, ChannelOptions, ChannelSort } from 'stream-chat'

// Stream Chat client singleton
let streamChatClient: StreamChat | null = null
const STREAM_CHANNEL_ID_DISALLOWED = /[^a-zA-Z0-9_-]/g

function sanitizeStreamChannelId(rawChannelId: string): string {
  const normalized = rawChannelId
    .trim()
    .replace(STREAM_CHANNEL_ID_DISALLOWED, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  if (!normalized) {
    throw new Error('Unable to build a valid Stream channel id')
  }

  return normalized
}

/**
 * Stream Chat user type
 */
export interface StreamUser {
  id: string
  name?: string
  email?: string
  image?: string
  role?: string
  org_ids?: string[]
  team_ids?: string[]
}

/**
 * Channel member with role
 */
export interface ChannelMember {
  user_id: string
  role: 'coach' | 'guardian' | 'org_admin' | 'staff' | 'parent' | 'athlete_minor' | 'athlete_adult'
  name?: string
  email?: string
  image?: string
}

/**
 * Get or initialize Stream Chat client
 */
export function getStreamClient(): StreamChat {
  if (!streamChatClient) {
    const apiKey = import.meta.env.VITE_STREAM_API_KEY
    
    if (!apiKey) {
      throw new Error('VITE_STREAM_API_KEY environment variable is not set')
    }
    
    streamChatClient = StreamChat.getInstance(apiKey)
  }
  
  return streamChatClient
}

/**
 * Connect user to Stream Chat
 * Requires a valid Stream token from the server
 */
export async function connectUser(
  userId: string,
  userToken: string,
  userData: StreamUser
): Promise<void> {
  const client = getStreamClient()
  
  if (client.userID === userId) {
    // Already connected
    return
  }
  
  await client.connectUser(
    {
      id: userId,
      name: userData.name,
      email: userData.email,
      image: userData.image,
      role: userData.role,
      org_ids: userData.org_ids,
      team_ids: userData.team_ids,
    },
    userToken
  )
}

/**
 * Disconnect user from Stream Chat
 */
export async function disconnectUser(): Promise<void> {
  const client = getStreamClient()
  
  if (client.userID) {
    await client.disconnectUser()
  }
}

/**
 * Get or create a team channel
 */
export async function getTeamChannel(
  teamId: string,
  teamName: string,
  members?: ChannelMember[]
): Promise<Channel> {
  const client = getStreamClient()
  const channelId = sanitizeStreamChannelId(`team-${teamId}`)
  
  const channel = client.channel('messaging', channelId, {
    name: teamName,
    team: teamId,
    members: members?.map(m => m.user_id) || [],
  })
  
  await channel.watch()
  
  return channel
}

/**
 * Get or create an org-wide channel
 */
export async function getOrgChannel(
  orgId: string,
  orgName: string,
  members?: ChannelMember[]
): Promise<Channel> {
  const client = getStreamClient()
  const channelId = sanitizeStreamChannelId(`org-${orgId}`)
  
  const channel = client.channel('messaging', channelId, {
    name: `${orgName} Organization`,
    org: orgId,
    members: members?.map(m => m.user_id) || [],
  })
  
  await channel.watch()
  
  return channel
}

/**
 * Get or create a DM channel between two users
 */
export async function getDMChannel(
  userId1: string,
  userId2: string,
  options?: {
    name?: string
    image?: string
    members?: string[]
    channelId?: string
    data?: Record<string, unknown>
  }
): Promise<Channel> {
  const client = getStreamClient()
  
  // Sort user IDs to ensure consistent channel ID
  const [user1, user2] = [userId1, userId2].sort()
  const channelId = sanitizeStreamChannelId(options?.channelId || `dm-${user1}-${user2}`)
  const members = Array.from(new Set([user1, user2, ...(options?.members || [])]))
  
  const channel = client.channel('messaging', channelId, {
    members,
    ...(options?.name ? { name: options.name } : {}),
    ...(options?.image ? { image: options.image } : {}),
    ...(options?.data || {}),
  })
  
  await channel.watch()
  
  return channel
}

/**
 * Query channels for a user
 */
export async function queryChannels(
  filters: ChannelFilters,
  sort: ChannelSort = { last_message_at: -1 },
  options: ChannelOptions = { limit: 30 }
): Promise<Channel[]> {
  const client = getStreamClient()
  
  const channels = await client.queryChannels(filters, sort, options)
  
  return channels
}

/**
 * Get user's team channels
 */
export async function getUserTeamChannels(teamIds: string[]): Promise<Channel[]> {
  if (!teamIds || teamIds.length === 0) {
    return []
  }
  
  return queryChannels({
    type: 'messaging',
    team: { $in: teamIds },
  })
}

/**
 * Get user's org channels
 */
export async function getUserOrgChannels(orgIds: string[]): Promise<Channel[]> {
  if (!orgIds || orgIds.length === 0) {
    return []
  }
  
  return queryChannels({
    type: 'messaging',
    org: { $in: orgIds },
  })
}

/**
 * Get user's DM channels
 */
export async function getUserDMChannels(): Promise<Channel[]> {
  return queryChannels({
    type: 'messaging',
    members: { $in: [getStreamClient().userID!] },
    team: { $exists: false },
    org: { $exists: false },
  })
}

/**
 * Add members to a channel
 */
export async function addChannelMembers(
  channel: Channel,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return
  
  await channel.addMembers(userIds)
}

/**
 * Remove members from a channel
 */
export async function removeChannelMembers(
  channel: Channel,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return
  
  await channel.removeMembers(userIds)
}

/**
 * Pin a message in a channel
 */
export async function pinMessage(
  channel: Channel,
  messageId: string
): Promise<void> {
  await (channel as any).pinMessage({ id: messageId })
}

/**
 * Unpin a message in a channel
 */
export async function unpinMessage(
  channel: Channel,
  messageId: string
): Promise<void> {
  await (channel as any).unpinMessage({ id: messageId })
}

/**
 * Delete a message (soft delete by default)
 */
export async function deleteMessage(
  messageId: string,
  hard: boolean = false
): Promise<void> {
  const client = getStreamClient()
  await client.deleteMessage(messageId, hard)
}

/**
 * Update a message
 */
export async function updateMessage(
  messageId: string,
  text: string
): Promise<void> {
  const client = getStreamClient()
  await client.updateMessage({
    id: messageId,
    text,
  })
}

/**
 * Search messages in a channel
 */
export async function searchMessages(
  channelId: string,
  query: string
) {
  const client = getStreamClient()
  
  return client.search(
    {
      type: 'messaging',
      id: channelId,
    },
    query
  )
}

/**
 * Mark channel as read
 */
export async function markChannelRead(channel: Channel): Promise<void> {
  await channel.markRead()
}

/**
 * Get unread count for user
 */
export async function getUnreadCount(): Promise<number> {
  const client = getStreamClient()
  const unread = await client.getUnreadCount()
  return unread.total_unread_count || 0
}

/**
 * Upload file to Stream
 */
export async function uploadFile(
  channel: Channel,
  file: File
): Promise<{ file: string }> {
  return channel.sendFile(file)
}

/**
 * Upload image to Stream
 */
export async function uploadImage(
  channel: Channel,
  file: File
): Promise<{ file: string }> {
  return channel.sendImage(file)
}

/**
 * Create a system message
 */
export async function sendSystemMessage(
  channel: Channel,
  text: string,
  metadata?: Record<string, any>
): Promise<void> {
  await channel.sendMessage({
    text,
    type: 'system',
    ...metadata,
  })
}

/**
 * Mute a channel for the current user
 */
export async function muteChannel(channel: Channel): Promise<void> {
  await channel.mute()
}

/**
 * Unmute a channel for the current user
 */
export async function unmuteChannel(channel: Channel): Promise<void> {
  await channel.unmute()
}

/**
 * Check if user can delete message
 * Admins can delete any message, coaches can delete own messages
 */
export function canDeleteMessage(
  messageUserId: string,
  currentUserId: string,
  userRole: string
): boolean {
  if (userRole === 'org_admin') {
    return true
  }
  
  if (userRole === 'coach' && messageUserId === currentUserId) {
    return true
  }
  
  return false
}

/**
 * Check if user can edit message
 * Users can edit own messages within time limit (5 minutes)
 */
export function canEditMessage(
  messageUserId: string,
  currentUserId: string,
  messageCreatedAt: Date,
  timeLimit: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  if (messageUserId !== currentUserId) {
    return false
  }
  
  const timeSinceCreation = Date.now() - messageCreatedAt.getTime()
  return timeSinceCreation <= timeLimit
}

/**
 * Check if user can pin messages
 * Only coaches and admins can pin messages
 */
export function canPinMessage(userRole: string): boolean {
  return userRole === 'coach' || userRole === 'org_admin'
}

/**
 * Extract mentions from message text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }
  
  return mentions
}

/**
 * Format message with mention highlights
 */
export function highlightMentions(text: string): string {
  return text.replace(
    /@(\w+)/g,
    '<span class="mention">@$1</span>'
  )
}
