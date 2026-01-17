import PortalNav from './PortalNav'

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
 * This component wraps PortalNav which provides:
 * - Role-based mega menu navigation
 * - Organization Admin, Coach, and Parent views
 * - Glass-style design with theme support
 * - Full accessibility features
 */
export default function PortalHeader({ forceRole }: PortalHeaderProps) {
  return <PortalNav forceRole={forceRole} />
}
