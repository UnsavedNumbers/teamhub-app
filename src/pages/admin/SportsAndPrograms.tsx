/**
 * Sports & Programs Management
 *
 * Master-detail view for sports and programs with contextual actions.
 */

import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, getPrograms, deleteSport } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import type { Sport, Program, Level, Team } from '../../data/types/organization'
import { AdminPageHeader } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

export default function SportsAndPrograms() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingSportId, setDeletingSportId] = useState<string | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [expandedSportId, setExpandedSportId] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [sportsResult, programsResult, levelsResult, teamsResult] = await Promise.all([
          getSports(context), 
          getPrograms(context),
          getLevels(context),
          getTeams(context)
        ])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
        setLevels(levelsResult.data as Level[])
        setTeams(teamsResult.data as Team[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  // Show all sports that have been added to the organization
  // Previously filtered to only show sports with teams, but that hides newly added sports
  // Now showing all sports so users can see and manage all their sports
  const sportsWithTeams = useMemo(() => {
    // Return all sports - they can have programs/levels/teams or be newly added
    return sports
  }, [sports])

  const programsBySport = (sportId: string) => programs.filter((p) => p.sport_id === sportId)

  const toggleSportExpand = (sportId: string) => {
    setExpandedSportId(expandedSportId === sportId ? null : sportId)
  }

  const handleDeleteSport = async (sportId: string, sportName: string) => {
    // Block if offline
    if (isOffline) {
      setActionError('You appear to be offline. Please reconnect and try again.')
      return
    }

    // Block if in demo mode
    if (USE_FAKE_DATA) {
      setActionError('This action is not available in demo mode. Please sign in to remove sports from your organization.')
      return
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to remove "${sportName}" from your organization?\n\n` +
      `This will unlink the sport from your organization. Programs, levels, and teams associated with this sport will not be deleted, but you may need to reassign them.`
    )

    if (!confirmed) return

    setDeletingSportId(sportId)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const result = await deleteSport(context, sportId)
      
      if (result.error) {
        setActionError(result.error.message || 'Failed to remove sport. Please try again.')
      } else {
        // Remove from local state
        setSports((prev) => prev.filter((s) => s.id !== sportId))
        setSuccessMessage(`"${sportName}" has been removed from your organization.`)
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 5000)
      }
    } catch (err) {
      console.error('[SportsAndPrograms] Unexpected error deleting sport:', err)
      setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setDeletingSportId(null)
    }
  }

  // --- Components ---

  const PrimaryButton = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <button className={`inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 ${className}`}>
      {children}
    </button>
  )

  const SecondaryButton = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <button className={`inline-flex items-center justify-center h-12 md:h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200 ${className}`}>
      {children}
    </button>
  )

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-12"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <AdminPageHeader
          title="Sports & Programs"
          subtitle="Define the sports your organization offers and the specific programs within them."
          breadcrumbs={[
            { label: 'Organizations', path: '/admin/organization/structure' },
            { label: 'Sports & Programs' },
          ]}
        />
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <OfflineBanner />
      <AdminPageHeader
        title="Sports & Programs"
        subtitle="Define the sports your organization offers and the specific programs within them."
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization/structure' },
          { label: 'Sports & Programs' },
        ]}
        actions={
          <Link to="/admin/organization/structure/forms?type=sport" className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}>
            <PrimaryButton>
              {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
            </PrimaryButton>
          </Link>
        }
      />

      {successMessage && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 mb-4">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-4">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sportsWithTeams.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sports</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No sports added</h3>
            <p className="text-slate-500 mb-6">Start by adding a sport to your organization. Then you can create programs, levels, and teams.</p>
            <Link to="/admin/organization/structure/forms?type=sport" className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}>
              <PrimaryButton>
                {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
              </PrimaryButton>
            </Link>
          </div>
        ) : (
          sportsWithTeams.map((sport) => {
            const sportPrograms = programsBySport(sport.id)
            const isExpanded = expandedSportId === sport.id

            return (
              <div 
                key={sport.id} 
                className={`group bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${isExpanded ? 'ring-1 ring-slate-200 shadow-md' : ''}`}
              >
                {/* Sport Header */}
                <div
                  className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleSportExpand(sport.id)}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span 
                      className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-slate-600' : ''}`}
                    >
                      expand_more
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {sport.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-400 mt-0.5">
                        {sportPrograms.length} {sportPrograms.length === 1 ? 'program' : 'programs'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto sm:justify-end" onClick={e => e.stopPropagation()}>
                    <Link 
                      to={`/admin/organization/structure/forms?type=program&sport_id=${sport.id}&returnUrl=${encodeURIComponent('/admin/organization/structure/sports-programs')}`} 
                      className={`w-full sm:w-auto ${isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <SecondaryButton className="w-full sm:w-auto">
                        Add Program
                      </SecondaryButton>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSport(sport.id, sport.name)
                      }}
                      disabled={deletingSportId === sport.id || isOffline || USE_FAKE_DATA}
                      className="inline-flex items-center justify-center h-12 md:h-9 px-4 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={USE_FAKE_DATA ? 'Sign in to remove sport' : isOffline ? 'Offline - cannot remove sport' : 'Remove sport from organization'}
                    >
                      {deletingSportId === sport.id ? (
                        <>
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px', marginRight: '4px' }}>refresh</span>
                          Removing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>delete</span>
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Programs List */}
                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-4 pl-14 sm:pl-16 space-y-3 pb-6">
                    {sportPrograms.length > 0 ? (
                      sportPrograms.map((program) => {
                        const programLevels = levels.filter((l) => l.program_id === program.id)
                        const hasTeams = programLevels.some((level) => 
                          teams.some((t) => t.level_id === level.id)
                        )
                        return (
                        <div 
                          key={program.id} 
                          className="flex items-center justify-between p-4 bg-white border border-slate-200/60 rounded-lg shadow-sm hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{program.name}</div>
                            <div className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">
                              {program.gender_category}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/organization/structure/forms?edit=program&id=${program.id}&returnUrl=${encodeURIComponent('/admin/organization/structure/sports-programs')}`}>
                              <SecondaryButton>Edit</SecondaryButton>
                            </Link>
                            <Link 
                              to={`/admin/organization/structure/forms?type=level&program_id=${program.id}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent('/admin/organization/structure/sports-programs')}`}
                              className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
                            >
                              <SecondaryButton>Add Level</SecondaryButton>
                            </Link>
                          </div>
                        </div>
                        )
                      })
                    ) : (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
                        <p className="text-sm text-slate-500 mb-3">No programs found for {sport.name}.</p>
                        <Link to={`/admin/organization/structure/forms?type=program&sport_id=${sport.id}`}>
                          <button className="text-sm font-semibold text-slate-900 hover:underline">
                            Create a Program
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
