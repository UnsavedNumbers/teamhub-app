import { Link } from 'react-router-dom'
import PortalHeader from './PortalHeader'

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
    </div>
  )
}
