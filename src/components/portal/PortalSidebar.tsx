import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Users,
  Megaphone,
  MessageSquare,
  Mail,
  Image,
  Video,
  Ticket,
  Car,
  Shirt,
  User,
  BarChart3,
  CreditCard,
  FileText,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserPlus,
  Search,
  Heart,
  Bookmark,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { getLink } from '../../utils/routes'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { useFeatureGate } from '../../lib/featureGate'
import { cn } from '../../utils/cn'

export type PortalWorkspaceRole = 'guardian' | 'athlete'

interface SidebarSubItem {
  path: string
  label: string
  routeKey?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SidebarMenuItem {
  path?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  routeKey?: string
  roles?: PortalWorkspaceRole[]
  children?: SidebarSubItem[]
}

// Navigation items will be created with translations in the component

function NavItem({
  item,
  isActive,
  isExpanded,
  onToggle,
  onClose,
}: {
  item: SidebarMenuItem
  isActive: boolean
  isExpanded?: boolean
  onToggle?: () => void
  onClose?: () => void
}) {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)] dark:bg-[var(--org-btn-primary-bg)]/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </span>
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')}
          />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            {item.children!.map((child) => (
              <NavSubItem key={child.path} item={child} onClose={onClose} />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <Link
      to={item.path!}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)] dark:bg-[var(--org-btn-primary-bg)]/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function NavSubItem({
  item,
  onClose,
}: {
  item: SidebarSubItem
  onClose?: () => void
}) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.path.replace(/\/$/, ''))
  const Icon = item.icon

  return (
    <Link
      to={item.path}
      onClick={onClose}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-[var(--org-btn-primary-bg)]/10 font-semibold text-[var(--org-link-color)] dark:bg-[var(--org-btn-primary-bg)]/20'
          : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

interface PortalSidebarProps {
  role: PortalWorkspaceRole
  collapsed?: boolean
  onCollapse?: () => void
  /** When true, sidebar is rendered as overlay (e.g. mobile drawer) */
  isOverlay?: boolean
  onClose?: () => void
}

/**
 * Left sidebar for Guardian/Athlete portal.
 * Role-aware: shows Guardian-only or Athlete-only items; primary items shared.
 */
export default function PortalSidebar({
  role,
  collapsed = false,
  onCollapse,
  isOverlay = false,
  onClose,
}: PortalSidebarProps) {
  const location = useLocation()
  const { currentOrganization } = useOrganization()
  const t = useT()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Create navigation items with translations
  const PRIMARY_ITEMS = useMemo<SidebarMenuItem[]>(() => [
    { path: getLink('portal.dashboard'), label: t('nav.home'), icon: Home, routeKey: 'portal.dashboard' },
    {
      label: t('nav.events'),
      icon: Calendar,
      children: [
        { path: getLink('portal.calendar'), label: t('nav.events'), routeKey: 'portal.calendar', icon: Calendar },
        { path: getLink('portal.travel'), label: t('nav.travel'), routeKey: 'portal.travel', icon: Car },
      ],
    },
    {
      label: t('nav.teams'),
      icon: Users,
      children: [
        { path: getLink('portal.athletes'), label: t('nav.myTeams'), routeKey: 'portal.athletes', icon: Users },
        { path: getLink('portal.uniforms'), label: t('nav.uniforms'), routeKey: 'portal.uniforms', icon: Shirt },
      ],
    },
    { path: getLink('portal.messages'), label: 'Messages', icon: Mail, routeKey: 'portal.messages' },
    { path: getLink('portal.announcements'), label: t('nav.announcements'), icon: Megaphone, routeKey: 'portal.messages' },
    { path: getLink('portal.huddles'), label: t('nav.huddles'), icon: MessageSquare, routeKey: 'portal.huddles' },
    {
      label: t('nav.media'),
      icon: Image,
      children: [
        { path: getLink('portal.photos'), label: t('nav.photos'), routeKey: 'portal.photos', icon: Image },
        { path: getLink('portal.videos'), label: t('nav.videos'), routeKey: 'portal.videos', icon: Video },
      ],
    },
    { path: getLink('portal.myTickets'), label: t('nav.tickets'), icon: Ticket, routeKey: 'portal.myTickets' },
    {
      label: t('nav.organizations'),
      icon: Building2,
      children: [
        { path: '/portal/follows', label: t('nav.whoIFollow'), routeKey: 'portal.following', icon: Heart },
        { path: '/portal/discover', label: t('nav.browseOrgs'), routeKey: 'portal.discoverOrgs', icon: Search },
        { path: getLink('portal.join'), label: t('nav.joinTeam'), routeKey: 'portal.join', icon: UserPlus },
        { path: getLink('portal.registrationHub'), label: 'Portal Registration Hub', routeKey: 'portal.registrationHub', icon: FileText },
        { path: getLink('portal.bookmarkedEvents'), label: t('nav.bookmarks'), routeKey: 'portal.bookmarkedEvents', icon: Bookmark },
      ],
    },
  ], [t])

  const GUARDIAN_ITEMS = useMemo<SidebarMenuItem[]>(() => [
    { path: getLink('portal.athletes'), label: t('nav.myAthletes'), icon: Users, routeKey: 'portal.athletes', roles: ['guardian'] },
    { path: getLink('portal.payments'), label: t('nav.paymentsRegistration'), icon: CreditCard, routeKey: 'portal.payments', roles: ['guardian'] },
    { path: '/portal/settings', label: t('nav.medicalForms'), icon: FileText, roles: ['guardian'] },
  ], [t])

  const ATHLETE_ITEMS = useMemo<SidebarMenuItem[]>(() => [
    { path: getLink('portal.athletes'), label: t('nav.myProfile'), icon: User, routeKey: 'portal.athletes', roles: ['athlete'] },
    { path: '/portal/settings', label: t('nav.myStats'), icon: BarChart3, roles: ['athlete'] },
  ], [t])

  const guardianOnly = role === 'guardian'
  const medicalGate = useFeatureGate('medical_enabled')
  const roleItems = guardianOnly ? GUARDIAN_ITEMS.filter(item => {
    // Filter out medical forms if feature is not enabled
    if (item.label === t('nav.medicalForms')) {
      return medicalGate.allowed && !medicalGate.loading
    }
    return true
  }) : ATHLETE_ITEMS

  const isActive = (item: SidebarMenuItem): boolean => {
    if (!item.path) {
      // For items with children, check if any child is active
      if (item.children) {
        return item.children.some((child) =>
          location.pathname.startsWith(child.path.replace(/\/$/, ''))
        )
      }
      return false
    }
    if (item.path === getLink('portal.dashboard')) return location.pathname === '/portal/dashboard'
    return location.pathname.startsWith(item.path.replace(/\/$/, ''))
  }

  // Auto-expand items with active children
  const getExpandedState = (item: SidebarMenuItem): boolean => {
    if (expandedItems.has(item.label)) return true
    // Auto-expand if any child is active
    if (item.children) {
      return item.children.some((child) =>
        location.pathname.startsWith(child.path.replace(/\/$/, ''))
      )
    }
    return false
  }

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-1 p-3">
        {currentOrganization && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-[var(--org-btn-primary-bg)]/20 flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--org-link-color)]">
                {currentOrganization.name?.slice(0, 2).toUpperCase() ?? 'YS'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {currentOrganization.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {role === 'guardian' ? t('nav.guardian') : t('nav.athlete')}
              </p>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-0.5" aria-label="Primary navigation">
          {PRIMARY_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              isActive={isActive(item)}
              isExpanded={getExpandedState(item)}
              onToggle={() => toggleExpanded(item.label)}
              onClose={onClose}
            />
          ))}
        </nav>

        {roleItems.length > 0 && (
          <>
            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
            <nav className="flex flex-col gap-0.5" aria-label={`${role} navigation`}>
              {roleItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={isActive(item)}
                  onClose={onClose}
                />
              ))}
            </nav>
          </>
        )}

        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
        <div>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span className="flex items-center gap-3">
              <Settings className="h-5 w-5 shrink-0" />
              {t('nav.settings')}
            </span>
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 transition-transform', settingsOpen && 'rotate-90')}
            />
          </button>
          {settingsOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <Link
                to="/portal/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                {t('nav.profile')}
              </Link>
              <Link
                to="/portal/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={onClose}
              >
                <Bell className="h-4 w-4" />
                {t('nav.notificationPreferences')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
        </button>
      )}
    </>
  )

  const baseClasses = cn(
    'portal-workspace-sidebar flex flex-col border-r-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
    collapsed ? 'w-0 min-w-0 overflow-hidden' : 'w-[260px] min-w-[260px]',
    isOverlay && 'fixed inset-y-0 left-0 z-50 w-[260px]'
  )

  return (
    <aside className={baseClasses}>
      {sidebarContent}
    </aside>
  )
}
