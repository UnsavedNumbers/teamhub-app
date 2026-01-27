/**
 * PinnedMessages Component
 * 
 * Displays pinned messages at the top of a channel.
 * Allows coaches and admins to pin/unpin messages.
 */

import { useState } from 'react'
import { Channel } from 'stream-chat'
import { useChannelStateContext } from 'stream-chat-react'
import Icon from '../portal/Icon'
import { canPinMessage } from '../../lib/streamChat'

interface PinnedMessagesProps {
  channel: Channel
  userRole: string
  onJumpToMessage?: (messageId: string) => void
}

export default function PinnedMessages({ channel, userRole, onJumpToMessage }: PinnedMessagesProps) {
  const { messages } = useChannelStateContext()
  const [expanded, setExpanded] = useState(true)
  
  // Get pinned messages from channel state
  const pinnedMessages = (messages || []).filter(msg => msg.pinned)
  
  const canPin = canPinMessage(userRole)

  const handleUnpin = async (messageId: string) => {
    try {
      await (channel as any).unpinMessage({ id: messageId })
    } catch (error) {
      console.error('Error unpinning message:', error)
    }
  }

  if (pinnedMessages.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon name="push_pin" size="text-base" className="text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">
              Pinned Messages ({pinnedMessages.length})
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
          >
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size="text-xl" />
          </button>
        </div>

        {expanded && (
          <div className="space-y-2">
            {pinnedMessages.map(message => (
              <div
                key={message.id}
                className="bg-white dark:bg-slate-800 rounded p-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white mb-1">
                      {message.user?.name || 'Unknown User'}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 break-words">
                      {message.text}
                    </div>
                    {message.created_at && (
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(message.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onJumpToMessage && (
                      <button
                        onClick={() => onJumpToMessage(message.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title="Jump to message"
                      >
                        <Icon name="arrow_downward" size="text-sm" />
                      </button>
                    )}
                    {canPin && (
                      <button
                        onClick={() => handleUnpin(message.id)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 p-1"
                        title="Unpin message"
                      >
                        <Icon name="push_pin" size="text-sm" className="rotate-45" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
