/**
 * Sports Management
 *
 * View and manage sports linked to the organization.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, deleteSport } from '../../data/services/sportsService'
import { getPrograms } from '../../data/services/sportsService'
import type { Sport } from '../../data/types/organization'
import { AdminPageHeader, ConfirmDialog, Button, Card } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function Sports() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingSportId, setDeletingSportId] = useState<string | null>(null)
  const [sportToDelete, setSportToDelete] = useState<{ id: string; name: string } | null>(null)

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

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

  const sportsRoute = getLink('admin.sports.list')
  const sportDetailRoute = (id: string) => getLink('admin.sports.detail', { id })
  const programsRoute = getLink('admin.programs.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-12"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>
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
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100">
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
            <Button disabled={isOffline || USE_FAKE_DATA}>
              {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
            </Button>
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
          <Card>
            <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>sports</span>
              <h3 className="pa-h3">No sports added</h3>
              <p className="pa-body-m pa-text-muted pa-mb-4">Start by adding a sport to your organization. Then you can create programs, levels, and teams.</p>
              <Link 
                to={`${formsRoute}?type=sport&returnUrl=${encodeURIComponent(sportsRoute)}`} 
                className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
              >
                <Button disabled={isOffline || USE_FAKE_DATA}>
                  {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="pa-stacked-list" noPadding>
            {allSports.map((sport) => {
              const programCount = programCountBySport(sport.id)

              return (
                <div key={sport.id} className="pa-stacked-list-row">
                  <div className="pa-stacked-list-row-content">
                    <div className="pa-flex-1">
                      <Link to={sportDetailRoute(sport.id)} className="pa-stacked-list-row-title" style={{ textDecoration: 'none', display: 'block' }}>
                        {sport.name}
                      </Link>
                      <Link to={`${programsRoute}?sport_id=${sport.id}`} className="pa-stacked-list-row-meta" style={{ textDecoration: 'none', display: 'block' }}>
                        {programCount} {programCount === 1 ? 'program' : 'programs'}
                      </Link>
                    </div>
                    
                    <div className="pa-stacked-list-row-actions">
                      <Link to={`${programsRoute}?sport_id=${sport.id}`}>
                        <Button variant="secondary" size="dense">
                          View {sport.name} Programs
                        </Button>
                      </Link>
                      <Link 
                        to={`${formsRoute}?type=program&sport_id=${sport.id}&returnUrl=${encodeURIComponent(sportsRoute)}`}
                        className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
                      >
                        <Button variant="secondary" size="dense" disabled={isOffline || USE_FAKE_DATA}>
                          Add Program
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="dense"
                        icon="delete"
                        onClick={() => handleDeleteSport(sport.id, sport.name)}
                        disabled={deletingSportId === sport.id || isOffline || USE_FAKE_DATA || programCount > 0}
                        loading={deletingSportId === sport.id}
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
                        {deletingSportId === sport.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
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
