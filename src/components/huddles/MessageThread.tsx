/**
 * MessageThread Component
 * 
 * Displays threaded replies with expand/collapse and jump to original message.
 */

import { useState } from 'react'
import { Thread, useChannelStateContext } from 'stream-chat-react'
import Icon from '../portal/Icon'

interface MessageThreadProps {
  parentMessageId: string
  onClose: () => void
  onJumpToMessage?: (messageId: string) => void
}

export default function MessageThread({
  parentMessageId,
  onClose,
  onJumpToMessage,
}: MessageThreadProps) {
  const { messages } = useChannelStateContext()
  const [collapsed, setCollapsed] = useState(false)
  
  // Find parent message
  const parentMessage = messages?.find(msg => msg.id === parentMessageId)
  
  if (!parentMessage) {
    return null
  }

  const replyCount = parentMessage.reply_count || 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Thread Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="forum" size="text-xl" className="text-slate-400" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Thread
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onJumpToMessage && (
            <button
              onClick={() => onJumpToMessage(parentMessageId)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Jump to original message"
            >
              <Icon name="arrow_upward" size="text-xl" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <Icon name={collapsed ? 'unfold_more' : 'unfold_less'} size="text-xl" />
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title="Close thread"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>
      </div>

      {/* Thread Content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      )}

      {collapsed && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Icon name="forum" size="text-4xl" className="mb-2" />
            <p className="text-sm">Thread collapsed</p>
          </div>
        </div>
      )}
    </div>
  )
}
