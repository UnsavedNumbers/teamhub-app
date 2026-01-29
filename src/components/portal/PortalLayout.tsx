import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PortalHeader from './PortalHeader'
import { useUserContext } from '../../hooks/useUserContext'
import { getContactForCategory } from '../../data/services/organizationContactsService'
import Icon from './Icon'

interface Breadcrumb {
  label: string
  path?: string
}

interface PortalLayoutProps {
  children: React.ReactNode
  breadcrumbs?: Breadcrumb[]
  /**
   * Override the auto-detected role for navigation display.
   * If not provided, the role is determined from the user's organization memberships.
   */
  forceRole?: 'org_admin' | 'coach' | 'parent'
}

export default function PortalLayout({ children, breadcrumbs, forceRole }: PortalLayoutProps) {
  const [generalContact, setGeneralContact] = useState<{ name: string; email: string; phone?: string | null } | null>(null)
  const { context, isReady } = useUserContext()

  useEffect(() => {
    async function fetchGeneralContact() {
        if (!isReady || !context?.orgId) return
        try {
            const { data: contact } = await getContactForCategory(context.orgId, 'general')
            if (contact) {
                setGeneralContact({
                    name: `${contact.first_name} ${contact.last_name}`,
                    email: contact.email,
                    phone: contact.phone
                })
            }
        } catch (err) {
            console.error('Failed to fetch general contact', err)
        }
    }
    fetchGeneralContact()
  }, [isReady, context?.orgId])

  return (
    <div className="oa-theme-active min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Portal Nav with Mega Menu */}
      <PortalHeader forceRole={forceRole} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Breadcrumbs - Hide on mobile if too many */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 sm:mb-6">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                )}
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-[var(--org-link-color)] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 dark:text-white">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {children}
      </main>

      {/* General Contact Footer */}
      {generalContact && (
        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-8">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Questions?</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Icon name="person" size="text-lg" className="text-slate-400" />
                        <span className="font-bold">{generalContact.name}</span>
                    </div>
                    <a href={`mailto:${generalContact.email}`} className="flex items-center gap-2 text-[var(--org-link-color)] hover:underline font-bold text-sm">
                        <Icon name="email" size="text-lg" />
                        {generalContact.email}
                    </a>
                    {generalContact.phone && (
                        <a href={`tel:${generalContact.phone}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors">
                            <Icon name="phone" size="text-lg" className="text-slate-400" />
                            {generalContact.phone}
                        </a>
                    )}
                </div>
            </div>
        </footer>
      )}
    </div>
  )
}
