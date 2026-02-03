/**
 * UI-related constants (sizes, breakpoints, z-index, animations)
 */

// Breakpoints (responsive design)
export const BREAKPOINTS = {
  MOBILE_MAX: 767, // 768px - 1px
  TABLET_MIN: 768,
  TABLET_MAX: 1023, // 1024px - 1px
  DESKTOP_MIN: 1024,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const

// Z-index layers
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  POPOVER: 60,
  TOOLTIP: 70,
  TOAST: 80,
  DRAWER: 100,
} as const

// Spacing
export const SPACING = {
  PAGE_PADDING_MOBILE: 16,
  PAGE_PADDING_DESKTOP: 32,
  SECTION_GAP: 24,
  CARD_PADDING: 16,
  GAP_XS: 4,
  GAP_SM: 8,
  GAP_MD: 16,
  GAP_LG: 24,
  GAP_XL: 32,
} as const

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const

// Font sizes
export const FONT_SIZE = {
  XS: 12,
  SM: 14,
  BASE: 16,
  MD: 18,
  LG: 20,
  XL: 24,
  XXL: 32,
} as const

// Border radius
export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  FULL: 9999,
} as const

// Shadow levels
export const SHADOW = {
  SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
} as const
