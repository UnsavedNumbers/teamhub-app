import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getPrograms, getSportIconUrl, getSports, deleteSportIcon, updateSportCustomization, uploadSportIcon } from '../../data/services/sportsService'
import type { Program, Sport } from '../../data/types/organization'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { AdminPageHeader, Button, Card } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { FileUpload } from '../../components/common/FileUpload'
import { getLink } from '../../utils/routes'
import { hasAnyRole } from '../../utils/roleHelpers'
import './SportDetail.css'
import '../../styles/orgAdmin.css'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Helper to get sport cover image with fallback
const getSportCoverUrl = (sportSlug: string | null | undefined): string => {
  if (sportSlug) {
    return `/images/sports/${sportSlug}/covers/sport-cover.png`
  }
  return '/images/sports/default/covers/sport-cover.png'
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function SportDetail() {
  useDebugLifecycle('SportDetail')
  
  const { sport_slug } = useParams<{ sport_slug: string }>()
  const sportSlugParam = sport_slug?.trim() || ''

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const { isOffline } = useOffline()
  const navigate = useNavigate()
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
  const isCoach = hasAnyRole(currentOrganization, ['coach'])

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

  const sportId = sport?.id ?? ''
  const sportsRoute = getLink('admin.sports.list')
  const programsRoute = getLink('admin.programs.list')
  const structureRoute = getLink('admin.organization.structure')
  const formsRoute = getLink('admin.organization.forms')
  const detailRoute = getLink('admin.sports.detail', { sport_slug: sport?.slug ?? sport?.id ?? sportSlugParam })

  const iconUrl = useMemo(() => getSportIconUrl(sport?.icon ?? null), [sport?.icon])
  // Check if the icon is a Material Icon name (no slashes or dots)
  const isMaterialIcon = sport?.icon && !sport.icon.includes('/') && !sport.icon.includes('.')
  const isColorDirty = useMemo(() => (sport?.color ?? 'var(--org-btn-primary-bg, #137fec)') !== pendingColor, [sport?.color, pendingColor])

  useEffect(() => {
    if (!isReady) return
    if (!sportSlugParam) {
      setError('Sport is required.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const sportsResult = await getSports(context)
        if (sportsResult.error) throw sportsResult.error

        const allSports = Array.isArray(sportsResult.data) ? (sportsResult.data as Sport[]) : []
        const isUuid = UUID_REGEX.test(sportSlugParam)
        const found =
          allSports.find((s) => s.slug === sportSlugParam || s.id === sportSlugParam) ??
          (isUuid ? allSports.find((s) => s.id === sportSlugParam) : null)
        if (!found) {
          setSport(null)
          setPrograms([])
          // If coach can't access this sport, redirect to sports list
          if (isCoach && !isOrgAdmin) {
            navigate(getLink('admin.sports.list'), { replace: true })
            return
          }
          setError('Sport not found (or you may not have access).')
          return
        }

        const programsResult = await getPrograms(context, found.id)
        if (programsResult.error) throw programsResult.error

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
  }, [context, isReady, sportSlugParam])

  // Cover image URL with fallback
  const [coverError, setCoverError] = useState(false)
  const coverUrl = useMemo(() => {
    if (coverError) return '/images/sports/default/covers/sport-cover.png'
    return getSportCoverUrl(sport?.slug)
  }, [sport?.slug, coverError])

  const refreshSport = async () => {
    if (!sport?.id) return
    const sportsResult = await getSports(context)
    if (sportsResult.error) throw sportsResult.error
    const allSports = Array.isArray(sportsResult.data) ? (sportsResult.data as Sport[]) : []
    const found = allSports.find((s) => s.id === sport.id) ?? null
    setSport(found)
    if (found) setPendingColor(found.color || 'var(--org-btn-primary-bg, #137fec)')
  }

  if (loading) {
    return (
      <div className="oa-root sport-detail-page">
        <OfflineBanner />
        <div className="sport-detail-loading">
          <div className="oa-skeleton" style={{ height: '60px' }} />
          <div className="oa-skeleton" style={{ height: '400px' }} />
          <div className="sport-detail-skeleton-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '120px' }} />
            ))}
          </div>
          <div className="sport-detail-skeleton-cards">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '300px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="oa-root sport-detail-page">
      <OfflineBanner />
      
      {/* Hero section with cover image — theme overlay for contrast */}
      <div className="sport-detail-hero">
        <div 
          className="sport-detail-hero-background"
          style={{ backgroundImage: `url(${coverUrl})` }}
        >
          <img 
            src={getSportCoverUrl(sport?.slug)} 
            alt="" 
            style={{ display: 'none' }} 
            onError={() => setCoverError(true)}
          />
        </div>
        <div className="sport-detail-hero-overlay" />
        <div className="sport-detail-hero-content"
        >
          <AdminPageHeader
            title={<span className="sport-detail-hero-title">{sport?.name || 'Sport'}</span>}
            subtitle="Sport details, customizations, and related programs."
            breadcrumbs={[
              { label: 'Organizations', path: structureRoute },
              { label: 'Sports', path: sportsRoute },
              { label: sport?.name || 'Sport' },
            ]}
            actions={
              <div className="oa-flex oa-flex-col sm:oa-flex-row oa-gap-2">
                <Link to={sportsRoute} className="sport-detail-hero-link sport-detail-hero-link--ghost w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto min-h-[44px]">Back to Sports</Button>
                </Link>
                <Link to={sport?.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : `${programsRoute}?sport_id=${sportId}`} className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto min-h-[44px]">View {sport?.name || ''} Programs</Button>
                </Link>
                <Link to={`${formsRoute}?type=program&sport_id=${sportId}&returnUrl=${encodeURIComponent(sport?.slug ? getLink('admin.programs.bySport', { sport_slug: sport.slug }) : programsRoute)}`} className="w-full sm:w-auto">
                  <OrgAdminButton variant="primary" className="w-full sm:w-auto min-h-[44px]">Add Program</OrgAdminButton>
                </Link>
              </div>
            }
          />
        </div>
      </div>

      {successMessage && (
        <Card className="oa-mb-6 sport-detail-alert sport-detail-alert--success">
          <div className="oa-body-m sport-detail-alert-text sport-detail-alert-text--success">
            {successMessage}
          </div>
        </Card>
      )}

      {actionError && (
        <Card className="oa-mb-6 sport-detail-alert sport-detail-alert--error">
          <div className="oa-body-m sport-detail-alert-text sport-detail-alert-text--error">
            {actionError}
          </div>
        </Card>
      )}

      {error && (
        <Card className="oa-mb-6 sport-detail-alert sport-detail-alert--error">
          <div className="oa-body-m sport-detail-alert-text sport-detail-alert-text--error">
            {error}
          </div>
        </Card>
      )}

      {!sport ? null : (
        <div className="sport-detail-grid">
          {false && (
          <div className="oa-card sport-detail-card">
            <div className="oa-card-header">
              <h3 className="oa-card-title">Customization</h3>
            </div>
            <div className="oa-flex oa-flex-col sm:oa-flex-row oa-items-start oa-gap-4" style={{ alignItems: 'flex-start' }}>
              <div style={{ width: '96px', flexShrink: 0 }}>
                <div className="oa-text-sm oa-text-muted sport-detail-label" style={{ marginBottom: '8px' }}>Icon</div>
                <div
                  className="sport-detail-icon-box"
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '12px',
                    border: '1px solid var(--org-border-default, var(--oa-n200))',
                    background: 'var(--org-surface-section, var(--oa-n50))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {iconUrl ? (
                    <img src={iconUrl || undefined} alt={`${sport?.name || 'Sport'} icon`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isMaterialIcon ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: pendingColor }}>{sport?.icon}</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--oa-n400)' }}>sports</span>
                  )}
                </div>
              </div>

              <div className="oa-flex-1">
                <div className="oa-text-sm oa-text-muted sport-detail-label" style={{ marginBottom: '8px' }}>Sport Color</div>
                <div className="oa-flex oa-items-center oa-gap-3" style={{ marginBottom: '12px' }}>
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
                  <div className="oa-text-sm oa-text-muted">{pendingColor}</div>
                  {isOrgAdmin && (
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
                    className="min-h-[44px]"
                  >
                    Save Color
                  </Button>
                  )}
                </div>

                <div className="oa-form-group">
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

                {isOrgAdmin && (
                  <div className="oa-flex oa-flex-col sm:oa-flex-row oa-gap-2" style={{ marginTop: '12px' }}>
                    <Button
                      disabled={!iconFile || uploadingIcon || isOffline || USE_FAKE_DATA}
                      loading={uploadingIcon}
                      className="w-full sm:w-auto min-h-[44px]"
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
                    variant="danger"
                    disabled={!sport?.icon || deletingIcon || isOffline || USE_FAKE_DATA}
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

                    <Link to={`${getLink('admin.sports.update', { sport_id: sport?.id || sportId })}?returnUrl=${encodeURIComponent(detailRoute)}`} className="w-full sm:w-auto">
                      <Button variant="secondary" className="w-full sm:w-auto min-h-[44px]">Edit Sport</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          <div className="oa-card oa-card--no-padding sport-detail-card">
            <div className="oa-card-header">
              <h3 className="oa-card-title sport-detail-programs-title">
                Programs
                <span className="sport-detail-badge" aria-label={`${programs.length} programs`}>
                  {programs.length}
                </span>
              </h3>
            </div>
            {programs.length === 0 ? (
              <div className="sport-detail-empty oa-p-5">
                No programs yet for this sport. Create one to start building out levels and teams.
              </div>
            ) : (
              <div className="oa-stacked-list sport-detail-program-list">
                {programs.map((p) => (
                  <Link
                    key={p.id}
                    to={getLink('admin.programs.detail', { id: p.id })}
                    className="oa-stacked-list-row sport-detail-program-row"
                  >
                    <div className="oa-stacked-list-row-content">
                      <div>
                        <div className="oa-stacked-list-row-title sport-detail-program-name">{p.name}</div>
                        <div className="oa-stacked-list-row-meta sport-detail-program-meta">{p.gender_category}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
