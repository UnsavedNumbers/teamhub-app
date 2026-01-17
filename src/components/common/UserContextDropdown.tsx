import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'

export default function UserContextDropdown() {
  const { user, profile, signOut } = useAuth()
  const { currentOrganization, organizations, switchOrganization } = useOrganization()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/portal/login')
  }

  const handleSwitchOrg = (orgId: string) => {
    switchOrganization(orgId)
    setIsOpen(false)
    // Avoid full page reload (keeps SPA routing + avoids \"blue screen\" on bad paths)
    // Navigate to a known-good portal route after switching org.
    navigate('/portal/dashboard')
  }

  const initials = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = profile?.display_name || user?.email || 'User'
  const email = user?.email || ''

  // Roles in current org
  const currentRoles = currentOrganization?.roles || []
  
  // Role-based links configuration
  const roleLinks = [
    { role: 'parent', label: 'My Children', path: '/portal/children', icon: 'family_restroom' as const },
    { role: 'parent', label: 'Payments', path: '/portal/payments', icon: 'receipt_long' as const },
    { role: 'coach', label: 'Teams', path: '/portal/children', icon: 'sports_soccer' as const },
    { role: 'org_admin', label: 'Organization Settings', path: '/admin/organization', icon: 'admin_panel_settings' as const },
  ]

  // Filter links based on current roles
  const visibleRoleLinks = roleLinks.filter(link => currentRoles.includes(link.role as any))

  const hasMultipleOrgs = organizations.length > 1
  const singleOrgName = organizations.length > 0 ? organizations[0].name : null

  return (
    <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center p-0 border-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
            aria-expanded={isOpen}
            aria-haspopup="true"
        >
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition-transform hover:scale-105 active:scale-95">
                {initials}
            </div>
        </button>

        {/* Menu */}
        {isOpen && (
            <div 
                className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl overflow-hidden z-50"
                style={{
                    background: 'var(--pa-glass-bg, rgba(255, 255, 255, 0.85))',
                    backdropFilter: 'var(--pa-glass-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--pa-glass-blur, blur(20px))',
                    border: '1px solid var(--pa-glass-border, rgba(0, 0, 0, 0.06))',
                    boxShadow: 'var(--pa-shadow-3, 0 16px 40px rgba(0, 0, 0, 0.18))',
                }}
            >
                
                {/* 1. User Identity */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={displayName}>{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={email}>{email}</p>
                    {currentOrganization && (
                         <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {currentOrganization.name}
                         </span>
                    )}
                </div>

                {/* 2. Organization Context */}
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Organization
                    </div>
                    {hasMultipleOrgs ? (
                        organizations.map(org => {
                            const isActive = currentOrganization?.id === org.id
                            return (
                                <button
                                    key={org.id}
                                    onClick={() => handleSwitchOrg(org.id)}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group ${isActive ? 'bg-slate-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="flex flex-col">
                                        <span>{org.name}</span>
                                        <span className="text-xs text-slate-400 font-normal">
                                            {org.roles.join(', ')}
                                        </span>
                                    </div>
                                    {isActive && <span className="material-symbols-outlined text-lg">check</span>}
                                </button>
                            )
                        })
                    ) : (
                        <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300" title="You are a member of only one organization">
                            {singleOrgName || "No Organization"}
                        </div>
                    )}
                </div>

                {/* 3. Personal Settings */}
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                     <Link 
                        to="/portal/settings"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <span className="material-symbols-outlined mr-3 text-lg text-slate-400">settings</span>
                        My Settings
                    </Link>
                </div>

                {/* 4. Role-Specific Links */}
                {visibleRoleLinks.length > 0 && (
                    <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                         {visibleRoleLinks.map(link => (
                            <Link 
                                key={link.path}
                                to={link.path} 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <span className="material-symbols-outlined mr-3 text-lg text-slate-400">{link.icon}</span>
                                {link.label}
                            </Link>
                         ))}
                    </div>
                )}

                {/* 5. Support */}
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                    <Link to="/portal/settings" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined mr-3 text-lg text-slate-400">help</span>
                        Help & Support
                    </Link>
                </div>

                {/* 6. Logout */}
                <div className="py-1">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <span className="material-symbols-outlined mr-3 text-lg text-red-500">logout</span>
                        Log out
                    </button>
                </div>

            </div>
        )}
    </div>
  )
}
