/**
 * Sports Management
 *
 * View and manage sports linked to the organization.
 */

import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, deleteSport } from '../../data/services/sportsService'
import { getPrograms } from '../../data/services/sportsService'
import type { Sport } from '../../data/types/organization'
import { AdminPageHeader, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function Sports() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingSportId, setDeletingSportId] = useState<string | null>(null)
  const [sportToDelete, setSportToDelete] = useState<{ id: string; name: string } | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Array<{ sport_id: string }>>([])

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [sportsResult, programsResult] = await Promise.all([
          getSports(context), 
          getPrograms(context),
        ])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Array<{ sport_id: string }>)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  // Show all sports that have been added to the organization
  const allSports = useMemo(() => {
    return sports
  }, [sports])

  const programCountBySport = (sportId: string) => 
    programs.filter((p) => p.sport_id === sportId).length

  const handleDeleteSport = (sportId: string, sportName: string) => {
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

    setSportToDelete({ id: sportId, name: sportName })
  }

  const confirmDeleteSport = async (_reason: string) => {
    if (!sportToDelete) return

    setDeletingSportId(sportToDelete.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const result = await deleteSport(context, sportToDelete.id)

      if (result.error) {
        setActionError(result.error.message || 'Failed to remove sport. Please try again.')
      } else {
        // Remove from local state
        setSports((prev) => prev.filter((s) => s.id !== sportToDelete.id))
        setSuccessMessage(`"${sportToDelete.name}" has been removed from your organization.`)

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 5000)
      }
    } catch (err) {
      console.error('[Sports] Unexpected error deleting sport:', err)
      setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setDeletingSportId(null)
      setSportToDelete(null)
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

  const sportsRoute = getLink('admin.organization.sports')
  const programsRoute = getLink('admin.organization.programs')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')

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
          title="Sports"
          subtitle="Manage the sports your organization offers."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Sports' },
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
        title="Sports"
        subtitle="Manage the sports your organization offers."
        breadcrumbs={[
          { label: 'Organizations', path: structureRoute },
          { label: 'Sports' },
        ]}
        actions={
          <Link 
            to={`${formsRoute}?type=sport&returnUrl=${encodeURIComponent(sportsRoute)}`} 
            className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
          >
            <PrimaryButton>
              {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
            </PrimaryButton>
          </Link>
        }
      />

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg border-l-4 border-green-500 mb-4">
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 mb-4">
          <div className="text-sm font-medium">{actionError}</div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {allSports.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sports</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No sports added</h3>
            <p className="text-slate-500 mb-6">Start by adding a sport to your organization. Then you can create programs, levels, and teams.</p>
            <Link 
              to={`${formsRoute}?type=sport&returnUrl=${encodeURIComponent(sportsRoute)}`} 
              className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
            >
              <PrimaryButton>
                {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
              </PrimaryButton>
            </Link>
          </div>
        ) : (
          allSports.map((sport) => {
            const programCount = programCountBySport(sport.id)

            return (
              <div 
                key={sport.id} 
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Sport Header */}
                <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {sport.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-400 mt-0.5">
                        {programCount} {programCount === 1 ? 'program' : 'programs'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto sm:justify-end">
                    <Link 
                      to={`${programsRoute}?sport_id=${sport.id}`}
                      className="w-full sm:w-auto"
                    >
                      <SecondaryButton className="w-full sm:w-auto">
                        View Programs
                      </SecondaryButton>
                    </Link>
                    <Link 
                      to={`${formsRoute}?type=program&sport_id=${sport.id}&returnUrl=${encodeURIComponent(sportsRoute)}`} 
                      className={`w-full sm:w-auto ${isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <SecondaryButton className="w-full sm:w-auto">
                        Add Program
                      </SecondaryButton>
                    </Link>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => handleDeleteSport(sport.id, sport.name)}
                        disabled={deletingSportId === sport.id || isOffline || USE_FAKE_DATA || programCount > 0}
                        className="inline-flex items-center justify-center h-12 md:h-9 px-4 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          USE_FAKE_DATA 
                            ? 'Sign in to remove sport' 
                            : isOffline 
                            ? 'Offline - cannot remove sport' 
                            : programCount > 0
                            ? `Cannot remove: This sport contains ${programCount} ${programCount === 1 ? 'program' : 'programs'} and cannot be removed.`
                            : 'Remove sport from organization'
                        }
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
                      {programCount > 0 && (
                        <p className="text-xs text-slate-500 text-right max-w-[200px]">
                          This item contains sub-items and cannot be removed.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      <ConfirmDialog
        open={Boolean(sportToDelete)}
        title="Remove sport?"
        description={
          sportToDelete
            ? `Are you sure you want to remove "${sportToDelete.name}" from your organization? This will unlink the sport from your organization. Programs, levels, and teams associated with this sport will not be deleted, but you may need to reassign them.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteSport}
        onCancel={() => setSportToDelete(null)}
      />
    </div>
  )
}
