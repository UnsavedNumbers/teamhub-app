/**
 * Type definitions for mobile menu components
 */

/**
 * Menu state for state machine pattern
 * Prevents invalid transitions and flicker from rapid clicks
 */
export type MenuState = 'closed' | 'opening' | 'open' | 'closing';

/**
 * Props for mobile navigation drawer
 */
export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
}

/**
 * Navigation section with groups of links
 * Used by both GlobalNav and PortalNav
 */
export interface NavSection {
  label: string;
  route?: string; // Optional route for direct links (PortalNav uses this)
  groups: NavGroup[];
}

/**
 * Navigation group containing links
 */
export interface NavGroup {
  label: string;
  items: NavLink[];
}

/**
 * Navigation link item
 */
export interface NavLink {
  text: string;
  icon: string;
  path: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Props for mobile bottom sheet
 */
export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}
