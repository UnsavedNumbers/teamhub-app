/**
 * Announcement Type Utilities
 * 
 * Centralized mapping of announcement types to emojis and visual treatments
 */

export type AnnouncementType = 
  | 'general'
  | 'reminder'
  | 'schedule_change'
  | 'urgent'
  | 'payment'
  | 'travel'

export interface AnnouncementTypeConfig {
  emoji: string
  label: string
  description: string
  color?: string
}

/**
 * Map of announcement types to their configuration
 */
export const ANNOUNCEMENT_TYPES: Record<AnnouncementType, AnnouncementTypeConfig> = {
  general: {
    emoji: '📢',
    label: 'General',
    description: 'General announcement',
  },
  reminder: {
    emoji: '⏰',
    label: 'Reminder',
    description: 'Important reminder',
  },
  schedule_change: {
    emoji: '📅',
    label: 'Schedule Change',
    description: 'Schedule or time change',
  },
  urgent: {
    emoji: '🚨',
    label: 'Urgent',
    description: 'Urgent announcement',
  },
  payment: {
    emoji: '💳',
    label: 'Payment',
    description: 'Payment or fee information',
  },
  travel: {
    emoji: '✈️',
    label: 'Travel',
    description: 'Travel information',
  },
}

/**
 * Get emoji for an announcement type
 */
export function getAnnouncementEmoji(type: AnnouncementType | string | null | undefined): string {
  if (!type) return ANNOUNCEMENT_TYPES.general.emoji
  const config = ANNOUNCEMENT_TYPES[type as AnnouncementType]
  return config?.emoji || ANNOUNCEMENT_TYPES.general.emoji
}

/**
 * Get label for an announcement type
 */
export function getAnnouncementLabel(type: AnnouncementType | string | null | undefined): string {
  if (!type) return ANNOUNCEMENT_TYPES.general.label
  const config = ANNOUNCEMENT_TYPES[type as AnnouncementType]
  return config?.label || ANNOUNCEMENT_TYPES.general.label
}

/**
 * Get all announcement types as options array
 */
export function getAnnouncementTypeOptions(): Array<{ value: AnnouncementType; label: string; emoji: string }> {
  return Object.entries(ANNOUNCEMENT_TYPES).map(([value, config]) => ({
    value: value as AnnouncementType,
    label: config.label,
    emoji: config.emoji,
  }))
}
