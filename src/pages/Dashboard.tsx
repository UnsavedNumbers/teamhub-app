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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/portal/dashboard" className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                YouthSports
              </Link>
              {profile && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary-600/20 text-primary-400 capitalize">
                  {profile.role}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 hidden md:block">{user?.email || user?.phone}</span>
              <Link to="/portal/settings" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <span className="material-symbols-rounded text-[20px]">settings</span>
                Settings
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Welcome back!</h2>
          <p className="mt-1 text-slate-400">Here's what's happening with your teams.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-600/20 rounded-lg">
                <span className="material-symbols-rounded text-primary-400 text-3xl">event</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">Upcoming Events</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <span className="material-symbols-rounded text-green-400 text-3xl">schedule</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">RSVPs Pending</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-600/20 rounded-lg">
                <span className="material-symbols-rounded text-amber-400 text-3xl">payments</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">Payments Due</p>
                <p className="text-2xl font-bold text-white">$0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="card text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700/50 rounded-full mb-4">
            <span className="material-symbols-rounded text-slate-400 text-5xl">groups</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No teams yet</h3>
          <p className="text-slate-400 mb-6">Join a team using an invite code or create your first team.</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary">Join Team</button>
            {profile?.role === 'admin' && (
              <button className="btn-secondary">Create Team</button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
