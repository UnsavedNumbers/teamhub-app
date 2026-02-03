/**
 * Date formats, timezone defaults, and time constants
 */

// Date format strings
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  DISPLAY_SHORT: 'MMM d',
  INPUT: 'yyyy-MM-dd',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  ISO_DATE: 'yyyy-MM-dd',
  TIME_ONLY: 'h:mm a',
  TIME_ONLY_24H: 'HH:mm',
  MONTH_YEAR: 'MMMM yyyy',
  DAY_OF_WEEK: 'EEEE',
  DAY_MONTH_YEAR: 'EEEE, MMMM d, yyyy',
  YEAR: 'yyyy',
  MONTH: 'MMMM',
  DAY: 'd',
} as const

// Time constants
export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 365,
  WEEKS_PER_YEAR: 52,
  HOURS_PER_WEEK: 168,
  MINUTES_PER_DAY: 1440,
  SECONDS_PER_DAY: 86400,
  MILLISECONDS_PER_MINUTE: 60000,
  MILLISECONDS_PER_HOUR: 3600000,
  MILLISECONDS_PER_DAY: 86400000,
  MILLISECONDS_PER_WEEK: 604800000,
  MILLISECONDS_PER_MONTH: 2592000000,
  MILLISECONDS_PER_YEAR: 31536000000,
} as const

// Time duration helpers (in milliseconds)
export const DURATIONS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
  
  // Common durations (in milliseconds)
  '5_MINUTES': 5 * 60 * 1000,
  '10_MINUTES': 10 * 60 * 1000,
  '15_MINUTES': 15 * 60 * 1000,
  '30_MINUTES': 30 * 60 * 1000,
  '1_HOUR': 60 * 60 * 1000,
  '2_HOURS': 2 * 60 * 60 * 1000,
  '24_HOURS': 24 * 60 * 60 * 1000,
  '7_DAYS': 7 * 24 * 60 * 60 * 1000,
  '14_DAYS': 14 * 24 * 60 * 60 * 1000,
  '30_DAYS': 30 * 24 * 60 * 60 * 1000,
  '90_DAYS': 90 * 24 * 60 * 60 * 1000,
  '365_DAYS': 365 * 24 * 60 * 60 * 1000,
} as const

// Debounce delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTOSAVE: 1000,
  RESIZE: 150,
  SCROLL: 100,
  INPUT: 200,
} as const

// Throttle delays (in milliseconds)
export const THROTTLE_DELAYS = {
  SCROLL: 100,
  RESIZE: 200,
  MOUSE_MOVE: 50,
} as const

// Timezone defaults
export const TIMEZONE_DEFAULTS = {
  APP: 'America/New_York',
  DISPLAY: 'en-US',
} as const

// Relative time thresholds
export const RELATIVE_TIME_THRESHOLDS = {
  JUST_NOW: 60 * 1000, // 1 minute
  MINUTES_AGO: 60 * 60 * 1000, // 1 hour
  HOURS_AGO: 24 * 60 * 60 * 1000, // 1 day
  DAYS_AGO: 7 * 24 * 60 * 60 * 1000, // 1 week
  WEEKS_AGO: 30 * 24 * 60 * 60 * 1000, // 1 month
  MONTHS_AGO: 365 * 24 * 60 * 60 * 1000, // 1 year
} as const

// Event scheduling defaults
export const EVENT_SCHEDULING = {
  DEFAULT_DURATION_MINUTES: 90,
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 480, // 8 hours
  MIN_ADVANCE_DAYS: 1,
  MAX_ADVANCE_DAYS: 365,
} as const

// Travel planning defaults
export const TRAVEL_PLANNING = {
  CHECK_IN_TIME_DEFAULT: '14:00',
  CHECK_OUT_TIME_DEFAULT: '11:00',
  MIN_STAY_DAYS: 1,
  MAX_STAY_DAYS: 14,
} as const
