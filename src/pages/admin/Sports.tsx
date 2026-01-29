/**
 * Sports Management
 *
 * View and manage sports linked to the organization.
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, deleteSport } from '../../data/services/sportsService'
import { getPrograms } from '../../data/services/sportsService'
import type { Sport } from '../../data/types/organization'
import { AdminPageHeader, ConfirmDialog, Button, Card, EmptyState } from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { Tooltip } from '../../components/admin/Tooltip'
import { getLink } from '../../utils/routes'
import './Sports.css'

export default function Sports() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingSportId, setDeletingSportId] = useState<string | null>(null)
  const [sportToDelete, setSportToDelete] = useState<{ id: string; name: string } | null>(null)

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Array<{ sport_id: string }>>([])

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setActionError(null)

      try {
        const [sportsResult, programsResult] = await Promise.all([
          getSports(context), 
          getPrograms(context),
        ])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Array<{ sport_id: string }>)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const programCountBySport = (sportId: string) => 
    programs.filter((p) => p.sport_id === sportId).length

  const handleDeleteSport = (sportId: string, sportName: string) => {
    if (isOffline) {
      setActionError('You appear to be offline. Please reconnect and try again.')
      return
    }
    if (USE_FAKE_DATA) {
      setActionError('This action is not available in demo mode.')
      return
    }
    setSportToDelete({ id: sportId, name: sportName })
  }

  const confirmDeleteSport = async () => {
    if (!sportToDelete) return

    setDeletingSportId(sportToDelete.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const result = await deleteSport(context, sportToDelete.id)

      if (result.error) {
        setActionError(result.error.message || 'Failed to remove sport.')
      } else {
        setSports((prev) => prev.filter((s) => s.id !== sportToDelete.id))
        setSuccessMessage(`"${sportToDelete.name}" has been removed.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setDeletingSportId(null)
      setSportToDelete(null)
    }
  }

  const sportsRoute = getLink('admin.sports.list')
  const programsRoute = getLink('admin.programs.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')

  if (loading) {
    return (
      <div className="pa-root sports-page">
        <div className="sports-skeleton pa-skeleton pa-mb-8" style={{ width: '40%', height: '40px' }} />
        <div className="sports-skeleton pa-skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  return (
    <div className="pa-root sports-page">
      <OfflineBanner />
      <AdminPageHeader
        title="Sports"
        subtitle="Manage the sports your organization offers."
        breadcrumbs={[
          { label: 'Organizations', path: structureRoute },
          { label: 'Sports' },
        ]}
        actions={
          <OrgAdminButton
            icon="add"
            variant="primary"
            onClick={() => navigate(`${formsRoute}?type=sport&returnUrl=${encodeURIComponent(sportsRoute)}`)}
            disabled={isOffline || USE_FAKE_DATA}
            className="w-full sm:w-auto"
          >
            {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
          </OrgAdminButton>
        }
      />

      {successMessage && (
        <Card className="pa-mb-4" noPadding>
          <div className="sports-alert sports-alert--success pa-p-4">
            <div className="pa-text-sm pa-font-medium sports-alert-text sports-alert-text--success">{successMessage}</div>
          </div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-4" noPadding>
          <div className="sports-alert sports-alert--error pa-p-4">
            <div className="pa-text-sm pa-font-medium sports-alert-text sports-alert-text--error">{actionError}</div>
          </div>
        </Card>
      )}

      <div className="pa-flex pa-flex-col pa-gap-4">
        {sports.length === 0 ? (
          <Card>
            <EmptyState
              icon="sports"
              title="No sports added"
              description="Start by adding a sport to your organization."
              noCard
            >
                <Button 
                    icon="add"
                    onClick={() => navigate(`${formsRoute}?type=sport&returnUrl=${encodeURIComponent(sportsRoute)}`)}
                    disabled={isOffline || USE_FAKE_DATA}
                >
                    {USE_FAKE_DATA ? 'Sign in to Add Sport' : 'Add Sport'}
                </Button>
            </EmptyState>
          </Card>
        ) : (
          <Card className="pa-stacked-list" noPadding>
            {sports.map((sport) => {
              const programCount = programCountBySport(sport.id)

              return (
                <div key={sport.id} className="pa-stacked-list-row sports-list-row">
                  <div className="pa-stacked-list-row-content">
                    <div className="pa-flex-1">
                      <span
                        role="button"
                        tabIndex={0}
                        className="pa-stacked-list-row-title sports-sport-name pa-cursor-pointer hover:pa-underline pa-block pa-mb-1"
                        onClick={() => navigate(getLink('admin.sports.detail', { sport_slug: sport.slug || sport.id }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(getLink('admin.sports.detail', { sport_slug: sport.slug || sport.id }))
                          }
                        }}
                      >
                        {sport.name}
                      </span>
                      <div className="pa-flex pa-items-center pa-gap-2">
                        <span
                          role="button"
                          tabIndex={0}
                          className="sports-program-count pa-text-xs pa-font-semibold sports-program-count-badge pa-cursor-pointer"
                          onClick={() => navigate(sport.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : `${programsRoute}?sport_id=${sport.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(sport.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : `${programsRoute}?sport_id=${sport.id}`)
                            }
                          }}
                        >
                          {programCount} {programCount === 1 ? 'PROGRAM' : 'PROGRAMS'}
                        </span>
                      </div>
                    </div>

                    <div className="pa-stacked-list-row-actions">
                      <Button
                        variant="secondary"
                        size="dense"
                        onClick={() => navigate(sport.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : `${programsRoute}?sport_id=${sport.id}`)}
                      >
                        View {sport.name} Programs
                      </Button>
                      <Button
                        variant="secondary"
                        size="dense"
                        icon="add"
                        onClick={() => navigate(`${formsRoute}?type=program&sport_id=${sport.id}&returnUrl=${encodeURIComponent(sport.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : programsRoute)}`)}
                        disabled={isOffline || USE_FAKE_DATA}
                      >
                        Add Program
                      </Button>
                      <div className="sports-delete-tooltip-wrapper">
                        <Tooltip
                          content={programCount > 0 ? 'Cannot remove sport with active programs' : 'Remove sport'}
                          side="top"
                        >
                          <span>
                            <Button
                              variant="danger"
                              size="dense"
                              icon="delete"
                              onClick={() => handleDeleteSport(sport.id, sport.name)}
                              disabled={deletingSportId === sport.id || isOffline || USE_FAKE_DATA || programCount > 0}
                              loading={deletingSportId === sport.id}
                            >
                              Delete
                            </Button>
                          </span>
                        </Tooltip>
                      </div>
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
            ? `Are you sure you want to remove "${sportToDelete.name}"? This action will unlink the sport from your organization.`
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
