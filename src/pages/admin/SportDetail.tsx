import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getPrograms, getSportIconUrl, getSports, deleteSportIcon, updateSportCustomization, uploadSportIcon } from '../../data/services/sportsService'
import type { Program, Sport } from '../../data/types/organization'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { AdminPageHeader, Button, Card } from '../../components/platformAdmin'
import { FileUpload } from '../../components/common/FileUpload'
import { getLink } from '../../utils/routes'

export default function SportDetail() {
  const { id } = useParams<{ id: string }>()
  const sportId = id?.trim() || ''

  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [sport, setSport] = useState<Sport | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])

  const [pendingColor, setPendingColor] = useState<string>('var(--org-btn-primary-bg, #137fec)')
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [savingColor, setSavingColor] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [deletingIcon, setDeletingIcon] = useState(false)

  const sportsRoute = getLink('admin.sports.list')
  const programsRoute = getLink('admin.programs.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')
  const detailRoute = getLink('admin.sports.detail', { id: sportId })

  const iconUrl = useMemo(() => getSportIconUrl(sport?.icon ?? null), [sport?.icon])
  const isColorDirty = useMemo(() => (sport?.color ?? 'var(--org-btn-primary-bg, #137fec)') !== pendingColor, [sport?.color, pendingColor])

  useEffect(() => {
    if (!isReady) return
    if (!sportId) {
      setError('Sport ID is required.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [sportsResult, programsResult] = await Promise.all([
          getSports(context),
          getPrograms(context, sportId),
        ])

        if (sportsResult.error) throw sportsResult.error
        if (programsResult.error) throw programsResult.error

        const allSports = Array.isArray(sportsResult.data) ? (sportsResult.data as Sport[]) : []
        const found = allSports.find((s) => s.id === sportId) ?? null
        if (!found) {
          setSport(null)
          setPrograms([])
          setError('Sport not found (or you may not have access).')
          return
        }

        setSport(found)
        setPendingColor(found.color || 'var(--org-btn-primary-bg, #137fec)')
        setPrograms(Array.isArray(programsResult.data) ? (programsResult.data as Program[]) : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sport.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, sportId])

  const refreshSport = async () => {
    const sportsResult = await getSports(context)
    if (sportsResult.error) throw sportsResult.error
    const allSports = Array.isArray(sportsResult.data) ? (sportsResult.data as Sport[]) : []
    const found = allSports.find((s) => s.id === sportId) ?? null
    setSport(found)
    if (found) setPendingColor(found.color || 'var(--org-btn-primary-bg, #137fec)')
  }

  if (loading) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <div className="pa-skeleton" style={{ height: '520px' }} />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title={sport?.name || 'Sport'}
        subtitle="Sport details, customizations, and related programs."
        breadcrumbs={[
          { label: 'Organizations', path: structureRoute },
          { label: 'Sports', path: sportsRoute },
          { label: sport?.name || 'Sport' },
        ]}
        actions={
          <div className="pa-flex pa-gap-2">
            <Link to={sportsRoute}>
              <Button variant="ghost">Back to Sports</Button>
            </Link>
            <Link to={`${programsRoute}?sport_id=${sportId}`}>
              <Button variant="secondary">View {sport?.name || ''} Programs</Button>
            </Link>
            <Link to={`${formsRoute}?type=program&sport_id=${sportId}&returnUrl=${encodeURIComponent(detailRoute)}`}>
              <Button>Add Program</Button>
            </Link>
          </div>
        }
      />

      {successMessage && (
        <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-success)' }}>
          <div className="pa-body-m" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)', color: 'var(--pa-n900)' }}>
            {successMessage}
          </div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            {actionError}
          </div>
        </Card>
      )}

      {error && (
        <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            {error}
          </div>
        </Card>
      )}

      {!sport ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--pa-space-6)' }}>
          <div className="oa-card">
            <div className="oa-card-header">
              <h3 className="oa-card-title">Customization</h3>
            </div>
            <div className="pa-flex pa-items-start pa-gap-4" style={{ alignItems: 'flex-start' }}>
              <div style={{ width: '96px' }}>
                <div className="pa-text-sm pa-text-muted" style={{ marginBottom: '8px' }}>Icon</div>
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '12px',
                    border: '1px solid var(--pa-n200)',
                    background: 'var(--pa-n50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                  className="dark:border-slate-700 dark:bg-slate-800"
                >
                  {iconUrl ? (
                    <img src={iconUrl} alt={`${sport.name} icon`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--pa-n400)' }}>sports</span>
                  )}
                </div>
              </div>

              <div className="pa-flex-1">
                <div className="pa-text-sm pa-text-muted" style={{ marginBottom: '8px' }}>Sport Color</div>
                <div className="pa-flex pa-items-center pa-gap-3" style={{ marginBottom: '12px' }}>
                  <input
                    type="color"
                    value={pendingColor}
                    onChange={(e) => {
                      setPendingColor(e.target.value)
                      setActionError(null)
                      setSuccessMessage(null)
                    }}
                    aria-label="Sport color"
                    style={{ width: '44px', height: '36px' }}
                    disabled={isOffline || USE_FAKE_DATA}
                  />
                  <div className="pa-text-sm pa-text-muted">{pendingColor}</div>
                  <Button
                    variant="secondary"
                    disabled={!isColorDirty || savingColor || isOffline || USE_FAKE_DATA}
                    loading={savingColor}
                    onClick={async () => {
                      setActionError(null)
                      setSuccessMessage(null)

                      if (isOffline) {
                        setActionError('You appear to be offline. Please reconnect and try again.')
                        return
                      }
                      if (USE_FAKE_DATA) {
                        setActionError('This action is not available in demo mode. Please sign in to customize sports.')
                        return
                      }

                      setSavingColor(true)
                      try {
                        const result = await updateSportCustomization(context, sportId, { color: pendingColor })
                        if (result.error) {
                          setActionError(result.error.message || 'Failed to save sport color.')
                        } else {
                          await refreshSport()
                          setSuccessMessage('Sport color updated.')
                        }
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : 'Failed to save sport color.')
                      } finally {
                        setSavingColor(false)
                      }
                    }}
                  >
                    Save Color
                  </Button>
                </div>

                <div className="pa-form-group">
                  <FileUpload
                    label="Upload Icon"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    maxSize={5 * 1024 * 1024}
                    helperText="Upload a custom icon for this sport. PNG, JPEG, WebP, or SVG. Max 5MB."
                    value={iconFile}
                    onFileSelect={(file) => {
                      setIconFile(file)
                      setActionError(null)
                      setSuccessMessage(null)
                    }}
                    disabled={uploadingIcon || deletingIcon || isOffline || USE_FAKE_DATA}
                    buttonText="Choose file"
                    replaceText="Replace file"
                  />
                </div>

                <div className="pa-flex pa-gap-2" style={{ marginTop: '12px' }}>
                  <Button
                    disabled={!iconFile || uploadingIcon || isOffline || USE_FAKE_DATA}
                    loading={uploadingIcon}
                    onClick={async () => {
                      if (!iconFile) return

                      setActionError(null)
                      setSuccessMessage(null)

                      if (isOffline) {
                        setActionError('You appear to be offline. Please reconnect and try again.')
                        return
                      }
                      if (USE_FAKE_DATA) {
                        setActionError('This action is not available in demo mode. Please sign in to customize sports.')
                        return
                      }

                      setUploadingIcon(true)
                      try {
                        const uploadResult = await uploadSportIcon(context, sportId, iconFile)
                        if (uploadResult.error) {
                          setActionError(uploadResult.error.message || 'Failed to upload icon.')
                        } else {
                          await refreshSport()
                          setIconFile(null)
                          setSuccessMessage('Icon uploaded.')
                        }
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : 'Failed to upload icon.')
                      } finally {
                        setUploadingIcon(false)
                      }
                    }}
                  >
                    Upload Icon
                  </Button>

                  <Button
                    variant="ghost"
                    disabled={!sport.icon || deletingIcon || isOffline || USE_FAKE_DATA}
                    loading={deletingIcon}
                    onClick={async () => {
                      setActionError(null)
                      setSuccessMessage(null)

                      if (isOffline) {
                        setActionError('You appear to be offline. Please reconnect and try again.')
                        return
                      }
                      if (USE_FAKE_DATA) {
                        setActionError('This action is not available in demo mode. Please sign in to customize sports.')
                        return
                      }

                      setDeletingIcon(true)
                      try {
                        const result = await deleteSportIcon(context, sportId)
                        if (result.error) {
                          setActionError(result.error.message || 'Failed to delete icon.')
                        } else {
                          await refreshSport()
                          setSuccessMessage('Icon removed.')
                        }
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : 'Failed to delete icon.')
                      } finally {
                        setDeletingIcon(false)
                      }
                    }}
                  >
                    Remove Icon
                  </Button>

                  <Link to={`${formsRoute}?edit=sport&id=${sportId}&returnUrl=${encodeURIComponent(detailRoute)}`}>
                    <Button variant="secondary">View Sport Form</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="oa-card oa-card--no-padding">
            <div className="oa-card-header">
              <h3 className="oa-card-title">Programs ({programs.length})</h3>
            </div>
            {programs.length === 0 ? (
              <div style={{ padding: 'var(--pa-space-5)' }} className="pa-text-muted">
                No programs yet for this sport. Create one to start building out levels and teams.
              </div>
            ) : (
              <div className="pa-stacked-list">
                {programs.map((p) => (
                  <div
                    key={p.id}
                    className="pa-stacked-list-row"
                  >
                    <div className="pa-stacked-list-row-content">
                      <div>
                        <div className="pa-stacked-list-row-title">{p.name}</div>
                        <div className="pa-stacked-list-row-meta">{p.gender_category}</div>
                      </div>
                      <Link to={`${programsRoute}?sport_id=${sportId}`}>
                        <Button variant="ghost" size="dense">Open</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

