/**
 * Breakpoint constants for consistent responsive behavior
 * 
 * These values are used in both CSS media queries and JavaScript code.
 * Mobile breakpoint: < 768px (single column, simplified UI)
 * Tablet breakpoint: 768px - 1023px (max 2 columns, reduced actions)
 * Desktop breakpoint: >= 1024px (full layout)
 */
export const BREAKPOINTS = {
  MOBILE_MAX: 767, // 768px - 1px
  TABLET_MIN: 768,
  TABLET_MAX: 1023, // 1024px - 1px
  DESKTOP_MIN: 1024,
} as const;

/**
 * Media query string for mobile viewport
 * Matches: max-width: 767px
 */
export const MOBILE_MEDIA_QUERY = `(max-width: ${BREAKPOINTS.MOBILE_MAX}px)`;

/**
 * Media query string for tablet viewport
 * Matches: min-width: 768px and max-width: 1023px
 */
export const TABLET_MEDIA_QUERY = `(min-width: ${BREAKPOINTS.TABLET_MIN}px) and (max-width: ${BREAKPOINTS.TABLET_MAX}px)`;

/**
 * Media query string for desktop viewport
 * Matches: min-width: 1024px
 */
export const DESKTOP_MEDIA_QUERY = `(min-width: ${BREAKPOINTS.DESKTOP_MIN}px)`;
