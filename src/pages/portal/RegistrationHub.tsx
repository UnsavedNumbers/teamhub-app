import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getLink } from '@/utils/routes'
import type { OrgMemberRole } from '@/contexts/OrganizationContext'

type RegistrationRole = 'org_admin' | 'coach' | 'parent' | 'athlete' | 'staff' | 'fan'

interface RegistrationAction {
  label: string
  description: string
  to: string
}

interface RegistrationContent {
  roleLabel: string
  title: string
  description: string
  actions: RegistrationAction[]
}

function getRegistrationRole(hasAnyRole: (role: OrgMemberRole) => boolean): RegistrationRole {
  if (hasAnyRole('org_admin')) return 'org_admin'
  if (hasAnyRole('coach')) return 'coach'
  if (hasAnyRole('parent')) return 'parent'
  if (hasAnyRole('athlete')) return 'athlete'
  if (hasAnyRole('staff')) return 'staff'
  return 'fan'
}

const ROLE_CONTENT: Record<RegistrationRole, RegistrationContent> = {
  org_admin: {
    roleLabel: 'Organization Admin',
    title: 'Admin Registration Workspace',
    description: 'Manage registration flows, monitor incoming registrations, and review participation readiness from inside the portal.',
    actions: [
      { label: 'Registration Overview', description: 'Back to your portal dashboard', to: getLink('portal.dashboard') },
      { label: 'Tryouts & Evaluation', description: 'Registration-related tryout workflows', to: getLink('portal.tryouts') },
      { label: 'Team Join Flows', description: 'Review invite-code based team joining', to: getLink('portal.join') },
    ],
  },
  coach: {
    roleLabel: 'Coach',
    title: 'Coach Registration Workspace',
    description: 'Track athlete onboarding progress and guide families through registration tasks from your portal tools.',
    actions: [
      { label: 'Tryout Registrations', description: 'View and manage athlete tryout status', to: getLink('portal.tryouts') },
      { label: 'Schedule & Onboarding Events', description: 'Coordinate registration-related events', to: getLink('portal.calendar') },
      { label: 'My Athletes', description: 'Review roster and athlete context', to: getLink('portal.athletes') },
    ],
  },
  parent: {
    roleLabel: 'Guardian',
    title: 'Family Registration Workspace',
    description: 'Complete enrollment tasks for your athletes without leaving the portal.',
    actions: [
      { label: 'Join a Team', description: 'Enter an invite code to register with a team', to: getLink('portal.join') },
      { label: 'Request Athlete Attachment', description: 'Connect to an existing athlete profile', to: getLink('portal.requestAttachment') },
      { label: 'Payments & Fees', description: 'Finish registration-related payments', to: getLink('portal.payments') },
    ],
  },
  athlete: {
    roleLabel: 'Athlete',
    title: 'Athlete Registration Workspace',
    description: 'See your registration-related tasks and next steps in the portal.',
    actions: [
      { label: 'Tryouts', description: 'View available tryout opportunities', to: getLink('portal.tryouts') },
      { label: 'My Schedule', description: 'Check upcoming events and onboarding sessions', to: getLink('portal.calendar') },
      { label: 'Announcements', description: 'Stay current on registration updates', to: getLink('portal.announcements') },
    ],
  },
  staff: {
    roleLabel: 'Staff',
    title: 'Staff Registration Workspace',
    description: 'Use portal tools to coordinate registration support and operational follow-up.',
    actions: [
      { label: 'Dashboard', description: 'View your latest portal overview', to: getLink('portal.dashboard') },
      { label: 'Messages', description: 'Coordinate registration communication', to: getLink('portal.messages') },
      { label: 'Contact Org Admin', description: 'Escalate registration issues quickly', to: getLink('portal.contactOrg') },
    ],
  },
  fan: {
    roleLabel: 'Fan',
    title: 'Registration Information',
    description: 'Fans can browse updates and contact the organization for registration guidance.',
    actions: [
      { label: 'Announcements', description: 'Read latest organization updates', to: getLink('portal.announcements') },
      { label: 'Contact Organization', description: 'Request registration information', to: getLink('portal.contactOrg') },
      { label: 'Browse Organizations', description: 'Discover organizations and programs', to: getLink('portal.discoverOrgs') },
    ],
  },
}

export default function RegistrationHub() {
  const { hasAnyRole } = useAuth()

  const content = useMemo(() => {
    const role = getRegistrationRole(hasAnyRole)
    return ROLE_CONTENT[role]
  }, [hasAnyRole])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{content.roleLabel}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Registration Hub</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{content.title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{content.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {content.actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <p className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">{action.label}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
