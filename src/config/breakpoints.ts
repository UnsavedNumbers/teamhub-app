/**
 * Breakpoint constants for consistent responsive behavior
 * 
 * These values are used in both CSS media queries and JavaScript code.
 * Mobile breakpoint: < 1024px (hamburger menu shows)
 * Desktop breakpoint: >= 1024px (full navigation shows)
 */
export const BREAKPOINTS = {
  MOBILE_MAX: 1023, // 1024px - 1px
  TABLET_MIN: 1024,
  DESKTOP_MIN: 1024,
} as const;

/**
 * Media query string for mobile viewport
 * Matches: max-width: 1023px
 */
export const MOBILE_MEDIA_QUERY = `(max-width: ${BREAKPOINTS.MOBILE_MAX}px)`;

/**
 * Media query string for desktop viewport
 * Matches: min-width: 1024px
 */
export const DESKTOP_MEDIA_QUERY = `(min-width: ${BREAKPOINTS.DESKTOP_MIN}px)`;
