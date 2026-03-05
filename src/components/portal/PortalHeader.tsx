interface PortalHeaderProps {
  /**
   * Override the auto-detected role for navigation display.
   * If not provided, the role is determined from the user's organization memberships.
   */
  forceRole?: 'org_admin' | 'coach' | 'parent'
}

/**
 * PortalHeader - Main header component for the portal
 *
 * NOTE: PortalNav is currently hidden but code is kept for potential repurposing as a secondary menu.
 */
export default function PortalHeader({ forceRole: _forceRole }: PortalHeaderProps) {
  return null
}
