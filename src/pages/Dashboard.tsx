import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
} from '../utils/setupOrganization'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  // Safety net: If user landed here with setupOrganization flag, redirect to onboarding
  useEffect(() => {
    if (getSetupOrganizationFlag()) {
      clearSetupOrganizationFlag()
      navigate('/admin/onboarding', { replace: true })
    }
  }, [navigate])

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'GOOD MORNING'
    if (hour < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }

  // Get user's display name
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'PARENT'
  const firstName = displayName.split(' ')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Top Navigation */}
      <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/portal/dashboard" className="flex items-center gap-2 group cursor-pointer">
              <div className="size-8 bg-[#137fec] rounded flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <span className="font-bold text-xl tracking-tight uppercase">
                Athletic<span className="text-[#137fec]">Portal</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link 
                to="/portal/dashboard" 
                className="text-sm font-semibold border-b-2 border-[#137fec] pb-5 mt-5 text-slate-900 dark:text-white"
              >
                Dashboard
              </Link>
              <Link 
                to="/portal/calendar" 
                className="text-sm font-medium text-slate-500 hover:text-[#137fec] transition-colors pb-5 mt-5 border-b-2 border-transparent"
              >
                Schedule
              </Link>
              <Link 
                to="/portal/children" 
                className="text-sm font-medium text-slate-500 hover:text-[#137fec] transition-colors pb-5 mt-5 border-b-2 border-transparent"
              >
                Teams
              </Link>
              <Link 
                to="/portal/payments" 
                className="text-sm font-medium text-slate-500 hover:text-[#137fec] transition-colors pb-5 mt-5 border-b-2 border-transparent"
              >
                Payments
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
            </button>
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border border-slate-100 dark:border-slate-800">
              {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumbs & Greeting */}
        <div className="mb-12">
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            <Link to="/portal/dashboard" className="hover:text-[#137fec] transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-slate-900 dark:text-white">Parent Portal</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-2 leading-none">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
                Elite performance starts with the right logistics.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Season</span>
                <span className="font-bold text-slate-900 dark:text-white">Spring 2024</span>
              </div>
              <div className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Players</span>
                <span className="font-bold text-slate-900 dark:text-white">2 Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content: Priority Actions */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Priority Actions</h2>
              <Link to="/portal/calendar" className="text-xs font-bold text-[#137fec] cursor-pointer hover:underline">
                View Full Calendar
              </Link>
            </div>
            <div className="space-y-6">
              {/* Event Card 1 - Example */}
              <div className="group bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 aspect-[4/3] bg-cover bg-center bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#137fec]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#137fec]">Live Now • Field 4</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase">
                        Varsity Soccer Practice
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-light mb-6">
                        Equipment Check: Shin guards, water bottle, and alternate jersey required.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center gap-2">
                        CHECK IN <span className="material-symbols-outlined text-sm">login</span>
                      </button>
                      <button className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 rounded font-bold text-sm tracking-wide transition-all text-slate-900 dark:text-white flex items-center gap-2">
                        LOCATION <span className="material-symbols-outlined text-sm">location_on</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Card 2 - Example */}
              <div className="group bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 aspect-[4/3] bg-cover bg-center bg-slate-200 dark:bg-slate-800 grayscale group-hover:grayscale-0 transition-all duration-500"></div>
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tomorrow • 10:00 AM</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase">
                        U12 Basketball Playoffs
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-light mb-6">
                        Arrive 30 minutes early for warm-ups at South Gymnasium.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center gap-2">
                        RSVP NOW <span className="material-symbols-outlined text-sm">event_available</span>
                      </button>
                      <button className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 rounded font-bold text-sm tracking-wide transition-all text-slate-900 dark:text-white">
                        VIEW DETAILS
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">event</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No upcoming events</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Check back later for scheduled activities.</p>
                <Link to="/portal/calendar" className="inline-block bg-[#137fec] hover:bg-[#137fec]/90 text-white px-6 py-3 rounded font-bold text-sm tracking-wide transition-all">
                  View Calendar
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar: Status Lines & Announcements */}
          <div className="lg:col-span-4 space-y-12">
            {/* Financials */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                Financial Overview
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between group py-2">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-500"></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Spring Registration</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Varsity Soccer</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-500">PAID</span>
                </div>
                <div className="h-px bg-slate-50 dark:bg-slate-800 w-full"></div>
                <div className="flex items-center justify-between group py-2">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-[#137fec] animate-pulse"></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Tournament Fees</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Basketball</p>
                    </div>
                  </div>
                  <Link to="/portal/payments" className="text-xs font-bold text-[#137fec] underline">
                    PAY $45.00
                  </Link>
                </div>
                <div className="h-px bg-slate-50 dark:bg-slate-800 w-full"></div>
                <div className="flex items-center justify-between group py-2">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-slate-300"></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Uniform Package</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Upcoming May 1</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">PENDING</span>
                </div>
              </div>
            </div>

            {/* Bulletin */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">campaign</span> Bulletin Board
              </h2>
              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-[#137fec]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider">Weather Update</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    Fields are currently open. In case of lightning, we will transition to the indoor facility.
                  </p>
                </div>
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider">Coach&apos;s Note</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    Great hustle in yesterday&apos;s game. Focus for next week: defensive positioning.
                  </p>
                </div>
              </div>
              <Link 
                to="/portal/messages"
                className="w-full mt-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors block text-center"
              >
                All Announcements
              </Link>
            </div>

            {/* Team Quick Links */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Support</h2>
              <Link 
                to="/portal/settings" 
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#137fec] flex items-center justify-between group"
              >
                Contact League Office
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </Link>
              <a 
                href="#" 
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#137fec] flex items-center justify-between group"
              >
                Help & Documentation
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
