import { useEffect, useState } from 'react'
import UserContextDropdown from '../common/UserContextDropdown'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../../hooks/useTheme'

interface UserNotification {
  id: string
  title: string
  body: string
  created_at: string
}

interface PortalHeaderProps {
  currentPath?: string
}

export default function PortalHeader({ currentPath }: PortalHeaderProps) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const { resolvedTheme } = useTheme()
  const [unread, setUnread] = useState<UserNotification[]>([])
  const [logoError, setLogoError] = useState(false)
  const sb = supabase as any

  const activePath = currentPath || location.pathname
  
  // Determine which logo to show based on resolved theme
  // Light mode: logo-light.png
  // Dark mode: logo-dark.png
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'
  
  // Reset logo error when theme changes
  useEffect(() => {
    setLogoError(false)
  }, [resolvedTheme])

  useEffect(() => {
    const loadNotifications = async () => {
      const { data } = await sb
        .from('user_notifications')
        .select('id, title, body, created_at')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(3)
      setUnread((data as unknown as UserNotification[]) || [])
    }
    loadNotifications()
  }, [])

  const navItems = [
    { path: '/portal/dashboard', label: 'Dashboard' },
    { path: '/portal/calendar', label: 'Schedule' },
    { path: '/portal/children', label: 'Teams' },
    { path: '/portal/payments', label: 'Payments' },
  ]

  return (
    <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/portal/dashboard" className="flex items-center gap-2 group cursor-pointer">
            {!logoError ? (
              <img 
                key={logoSrc}
                src={logoSrc} 
                alt="AthleticPortal" 
                className="h-8 w-auto transition-opacity duration-200"
                onError={() => {
                  console.error('Failed to load logo:', logoSrc)
                  setLogoError(true)
                }}
              />
            ) : (
              // Fallback to icon-based logo if image fails to load
              <>
                <div className="size-8 bg-[#137fec] rounded flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                </div>
                <span className="font-bold text-xl tracking-tight uppercase">
                  Athletic<span className="text-[#137fec]">Portal</span>
                </span>
              </>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = activePath === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm pb-5 mt-5 border-b-2 transition-colors ${
                    isActive
                      ? 'font-semibold border-[#137fec] text-slate-900 dark:text-white'
                      : 'font-medium border-transparent text-slate-500 hover:text-[#137fec]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle variant="icon-only" />
          <button className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
            {unread.length > 0 && (
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
            )}
          </button>
          <UserContextDropdown />
        </div>
      </div>
    </header>
  )
}
