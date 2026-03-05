/**
 * Facility Detail Page
 *
 * Shows facility details with tabs: Overview, Resources, Availability, Schedule
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/admin'
import {
    getFacilityById,
    deleteFacility,
    getResources,
    deleteResource,
    getBlackouts,
    deleteBlackout,
    getReservations,
    deleteReservation,
} from '../../data/services/facilitiesService'
import type { Facility, FacilityResource, FacilityBlackout, FacilityReservation } from '../../types/facilities'
import ResourceFormSlideOver from '../../components/admin/ResourceFormSlideOver'
import BlackoutFormSlideOver from '../../components/admin/BlackoutFormSlideOver'
import ReservationFormSlideOver from '../../components/admin/ReservationFormSlideOver'
import '../../styles/orgAdmin.css'

export default function FacilityDetail() {
    const { id } = useParams<{ id: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'overview'

    const [facility, setFacility] = useState<Facility | null>(null)
    const [resources, setResources] = useState<FacilityResource[]>([])
    const [blackouts, setBlackouts] = useState<FacilityBlackout[]>([])
    const [reservations, setReservations] = useState<FacilityReservation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Forms
    const [resourceFormOpen, setResourceFormOpen] = useState(false)
    const [resourceFormEditing, setResourceFormEditing] = useState<FacilityResource | null>(null)
    const [blackoutFormOpen, setBlackoutFormOpen] = useState(false)
    const [blackoutFormEditing, setBlackoutFormEditing] = useState<FacilityBlackout | null>(null)
    const [reservationFormOpen, setReservationFormOpen] = useState(false)
    const [reservationFormEditing, setReservationFormEditing] = useState<FacilityReservation | null>(null)

    // Delete dialogs
    const [deleteFacilityDialog, setDeleteFacilityDialog] = useState(false)
    const [deleteResourceDialog, setDeleteResourceDialog] = useState<FacilityResource | null>(null)
    const [deleteBlackoutDialog, setDeleteBlackoutDialog] = useState<FacilityBlackout | null>(null)
    const [deleteReservationDialog, setDeleteReservationDialog] = useState<FacilityReservation | null>(null)
    const [, setActionLoading] = useState(false)

    const { context, isReady } = useUserContext()
    const navigate = useNavigate()
    const t = useT()

    const fetchFacility = useCallback(async () => {
        if (!id || !isReady) return

        setLoading(true)
        setError(null)

        try {
            const result = await getFacilityById(id)
            if (result.error || !result.data) {
                setError(result.error?.message || 'Facility not found')
                setFacility(null)
            } else {
                setFacility(result.data)
            }
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load facility')
            setFacility(null)
        } finally {
            setLoading(false)
        }
    }, [id, isReady])

    const fetchResources = useCallback(async () => {
        if (!id || !isReady || !context.orgId) return

        try {
            const result = await getResources(context.orgId, { facility_id: id })
            if (result.data) {
                setResources(result.data)
            }
        } catch (err) {
            console.error('Error loading resources:', err)
        }
    }, [id, isReady, context.orgId])

    const fetchBlackouts = useCallback(async () => {
        if (!id || !isReady || !context.orgId) return

        try {
            const result = await getBlackouts(context.orgId, id)
            if (result.data) {
                setBlackouts(result.data)
            }
        } catch (err) {
            console.error('Error loading blackouts:', err)
        }
    }, [id, isReady, context.orgId])

    const fetchReservations = useCallback(async () => {
        if (!id || !isReady || !context.orgId) return

        try {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

            const result = await getReservations({
                org_id: context.orgId,
                facility_ids: [id],
                start,
                end,
            })
            if (result.data) {
                setReservations(result.data)
            }
        } catch (err) {
            console.error('Error loading reservations:', err)
        }
    }, [id, isReady, context.orgId])

    useEffect(() => {
        fetchFacility()
    }, [fetchFacility])

    useEffect(() => {
        if (facility && activeTab === 'resources') {
            fetchResources()
        }
    }, [facility, activeTab, fetchResources])

    useEffect(() => {
        if (facility && activeTab === 'availability') {
            fetchBlackouts()
        }
    }, [facility, activeTab, fetchBlackouts])

    useEffect(() => {
        if (facility && activeTab === 'schedule') {
            fetchReservations()
        }
    }, [facility, activeTab, fetchReservations])

    const handleDeleteFacility = async () => {
        if (!facility) return

        setActionLoading(true)
        try {
            const result = await deleteFacility(facility.id)
            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.deleteFailed'))
            } else {
                showSuccess(t('admin.facilities.success.deleted'))
                navigate(getLink('admin.facilities.list'))
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteFailed'))
        } finally {
            setActionLoading(false)
            setDeleteFacilityDialog(false)
        }
    }

    const tabs = [
        { id: 'overview', label: t('admin.facilities.detail.overview') },
        { id: 'resources', label: t('admin.facilities.detail.resources') },
        { id: 'availability', label: t('admin.facilities.detail.availability') },
        { id: 'schedule', label: t('admin.facilities.detail.schedule') },
    ]

    if (!isReady) {
        return (
            <div>
                <div
                    className="rounded-xl border p-8 text-center"
                    style={{
                        background: 'var(--pa-surface)',
                        borderColor: 'var(--pa-border-default)',
                    }}
                >
                    <div
                        className="animate-pulse rounded"
                        style={{
                            width: '100%',
                            height: '400px',
                            background: 'var(--pa-surface-panel)',
                        }}
                    />
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div style={{ padding: '64px', textAlign: 'center' }}>
                <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>
                    refresh
                </span>
                <div style={{ marginTop: '16px', color: 'var(--org-text-secondary)' }}>
                    {t('common.loading')}
                </div>
            </div>
        )
    }

    if (error || !facility) {
        return (
            <div>
                <AdminPageHeader title="Facility Not Found" />
                <Card>
                    <p>{error || 'Facility not found'}</p>
                    <Button variant="primary" onClick={() => navigate(getLink('admin.facilities.list'))}>
                        {t('common.back')}
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <AdminPageHeader
                title={facility.name}
                subtitle={facility.formatted_address || ''}
                breadcrumbs={[
                    { label: t('admin.facilities.title'), path: getLink('admin.facilities.list') },
                    { label: facility.name },
                ]}
                actions={
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                            variant="secondary"
                            onClick={() => navigate(getLink('admin.facilities.schedule') + '?facility=' + encodeURIComponent(facility.id))}
                            icon="calendar_month"
                        >
                            {t('admin.facilities.viewSchedule')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => setDeleteFacilityDialog(true)}
                            icon="delete"
                        >
                            {t('admin.facilities.delete')}
                        </Button>
                    </div>
                }
            />

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    borderBottom: '1px solid var(--org-border-default)',
                    marginBottom: '24px',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSearchParams({ tab: tab.id })}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            background: 'transparent',
                            borderBottom: `2px solid ${
                                activeTab === tab.id ? 'var(--org-btn-primary-bg)' : 'transparent'
                            }`,
                            color:
                                activeTab === tab.id
                                    ? 'var(--org-btn-primary-bg)'
                                    : 'var(--org-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: activeTab === tab.id ? '600' : '400',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card title="Details">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                    Type
                                </label>
                                <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                    {facility.facility_type || 'Not specified'}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                    Status
                                </label>
                                <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                    {facility.status === 'active' ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                    Timezone
                                </label>
                                <p style={{ marginTop: '4px', fontSize: '14px' }}>{facility.timezone}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                    Public
                                </label>
                                <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                    {facility.is_public ? 'Yes' : 'No'}
                                </p>
                            </div>
                        </div>
                        {facility.description && (
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                    Description
                                </label>
                                <p style={{ marginTop: '4px', fontSize: '14px' }}>{facility.description}</p>
                            </div>
                        )}
                    </Card>

                    {(facility.parking_notes || facility.entry_instructions) && (
                        <Card title="Instructions">
                            {facility.parking_notes && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                        Parking Notes
                                    </label>
                                    <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                        {facility.parking_notes}
                                    </p>
                                </div>
                            )}
                            {facility.entry_instructions && (
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                        Entry Instructions
                                    </label>
                                    <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                        {facility.entry_instructions}
                                    </p>
                                </div>
                            )}
                        </Card>
                    )}

                    {(facility.contact_name || facility.contact_phone || facility.contact_email) && (
                        <Card title="Contact Information">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {facility.contact_name && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                            Name
                                        </label>
                                        <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                            {facility.contact_name}
                                        </p>
                                    </div>
                                )}
                                {facility.contact_phone && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                            Phone
                                        </label>
                                        <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                            {facility.contact_phone}
                                        </p>
                                    </div>
                                )}
                                {facility.contact_email && (
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                            Email
                                        </label>
                                        <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                            {facility.contact_email}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === 'resources' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Resources</h3>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setResourceFormEditing(null)
                                setResourceFormOpen(true)
                            }}
                            icon="add"
                        >
                            {t('admin.facilities.addResource')}
                        </Button>
                    </div>

                    {resources.length === 0 ? (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>inventory_2</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">No resources yet</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create your first resource for this facility</p>
                                    <Button variant="primary" onClick={() => { setResourceFormEditing(null); setResourceFormOpen(true); }} icon="add">
                                        Add Resource
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {resources.map((resource) => (
                                <Card key={resource.id} title={resource.name}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Type
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {resource.resource_type || 'Not specified'}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Status
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {resource.status === 'active' ? 'Active' : 'Inactive'}
                                            </p>
                                        </div>
                                    </div>
                                    {resource.sport_tags.length > 0 && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Sport Tags
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                                {resource.sport_tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            background: 'var(--org-btn-primary-bg)',
                                                            color: 'var(--org-btn-primary-text)',
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => {
                                                setResourceFormEditing(resource)
                                                setResourceFormOpen(true)
                                            }}
                                        >
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => setDeleteResourceDialog(resource)}
                                            style={{ color: 'var(--pa-danger)' }}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'availability' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Blackouts</h3>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setBlackoutFormEditing(null)
                                setBlackoutFormOpen(true)
                            }}
                            icon="add"
                        >
                            Create Blackout
                        </Button>
                    </div>

                    {blackouts.length === 0 ? (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>block</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">No blackouts</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create blackouts to block time periods</p>
                                    <Button variant="primary" onClick={() => { setBlackoutFormEditing(null); setBlackoutFormOpen(true); }} icon="add">
                                        Create Blackout
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {blackouts.map((blackout) => (
                                <Card key={blackout.id} title={blackout.title}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Start
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {new Date(blackout.start_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                End
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {new Date(blackout.end_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {blackout.reason && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Reason
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>{blackout.reason}</p>
                                        </div>
                                    )}
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => {
                                                setBlackoutFormEditing(blackout)
                                                setBlackoutFormOpen(true)
                                            }}
                                        >
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => setDeleteBlackoutDialog(blackout)}
                                            style={{ color: 'var(--pa-danger)' }}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'schedule' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Reservations</h3>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setReservationFormEditing(null)
                                setReservationFormOpen(true)
                            }}
                            icon="add"
                        >
                            {t('admin.facilities.schedule.createReservation')}
                        </Button>
                    </div>

                    {reservations.length === 0 ? (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>event_available</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">No reservations</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create reservations to schedule facility usage</p>
                                    <Button variant="primary" onClick={() => { setReservationFormEditing(null); setReservationFormOpen(true); }} icon="add">
                                        Create Reservation
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {reservations.map((reservation) => (
                                <Card key={reservation.id} title={reservation.title}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Resource
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {reservation.resource?.name || 'Unknown'}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Type
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {reservation.reservation_type}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                Start
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {new Date(reservation.start_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                                                End
                                            </label>
                                            <p style={{ marginTop: '4px', fontSize: '14px' }}>
                                                {new Date(reservation.end_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => {
                                                setReservationFormEditing(reservation)
                                                setReservationFormOpen(true)
                                            }}
                                        >
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => setDeleteReservationDialog(reservation)}
                                            style={{ color: 'var(--pa-danger)' }}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Forms */}
            <ResourceFormSlideOver
                isOpen={resourceFormOpen}
                onClose={() => {
                    setResourceFormOpen(false)
                    setResourceFormEditing(null)
                }}
                facilityId={facility.id}
                resource={resourceFormEditing}
                onSaved={() => {
                    setResourceFormOpen(false)
                    setResourceFormEditing(null)
                    fetchResources()
                }}
            />

            <BlackoutFormSlideOver
                isOpen={blackoutFormOpen}
                onClose={() => {
                    setBlackoutFormOpen(false)
                    setBlackoutFormEditing(null)
                }}
                facilityId={facility.id}
                blackout={blackoutFormEditing}
                onSaved={() => {
                    setBlackoutFormOpen(false)
                    setBlackoutFormEditing(null)
                    fetchBlackouts()
                }}
            />

            <ReservationFormSlideOver
                isOpen={reservationFormOpen}
                onClose={() => {
                    setReservationFormOpen(false)
                    setReservationFormEditing(null)
                }}
                reservation={reservationFormEditing}
                initialFacilityId={facility.id}
                onSaved={() => {
                    setReservationFormOpen(false)
                    setReservationFormEditing(null)
                    fetchReservations()
                }}
            />

            {/* Delete Dialogs */}
            <ConfirmDialog
                open={deleteFacilityDialog}
                onCancel={() => setDeleteFacilityDialog(false)}
                onConfirm={handleDeleteFacility}
                title={t('admin.facilities.delete')}
                description={t('admin.facilities.detail.confirmDelete', { name: facility.name })}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
            />

            {deleteResourceDialog && (
                <ConfirmDialog
                    open={!!deleteResourceDialog}
                    onCancel={() => setDeleteResourceDialog(null)}
                    onConfirm={async () => {
                        if (!deleteResourceDialog) return
                        setActionLoading(true)
                        try {
                            const result = await deleteResource(deleteResourceDialog.id)
                            if (result.error) {
                                showError(result.error.message || t('admin.facilities.errors.deleteResourceFailed'))
                            } else {
                                showSuccess(t('admin.facilities.success.resourceDeleted'))
                                setDeleteResourceDialog(null)
                                fetchResources()
                            }
                        } catch (err) {
                            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteResourceFailed'))
                        } finally {
                            setActionLoading(false)
                        }
                    }}
                    title={t('common.delete')}
                    description={t('admin.facilities.detail.confirmDeleteResource', { name: deleteResourceDialog.name })}
                    confirmLabel={t('common.delete')}
                    cancelLabel={t('common.cancel')}
                    variant="danger"
                />
            )}

            {deleteBlackoutDialog && (
                <ConfirmDialog
                    open={!!deleteBlackoutDialog}
                    onCancel={() => setDeleteBlackoutDialog(null)}
                    onConfirm={async () => {
                        if (!deleteBlackoutDialog) return
                        setActionLoading(true)
                        try {
                            const result = await deleteBlackout(deleteBlackoutDialog.id)
                            if (result.error) {
                                showError(result.error.message || t('admin.facilities.errors.deleteBlackoutFailed'))
                            } else {
                                showSuccess(t('admin.facilities.success.blackoutDeleted'))
                                setDeleteBlackoutDialog(null)
                                fetchBlackouts()
                            }
                        } catch (err) {
                            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteBlackoutFailed'))
                        } finally {
                            setActionLoading(false)
                        }
                    }}
                    title={t('common.delete')}
                    description={t('admin.facilities.detail.confirmDeleteBlackout')}
                    confirmLabel={t('common.delete')}
                    cancelLabel={t('common.cancel')}
                    variant="danger"
                />
            )}

            {deleteReservationDialog && (
                <ConfirmDialog
                    open={!!deleteReservationDialog}
                    onCancel={() => setDeleteReservationDialog(null)}
                    onConfirm={async () => {
                        if (!deleteReservationDialog) return
                        setActionLoading(true)
                        try {
                            const result = await deleteReservation(deleteReservationDialog.id)
                            if (result.error) {
                                showError(result.error.message || t('admin.facilities.errors.deleteReservationFailed'))
                            } else {
                                showSuccess(t('admin.facilities.success.reservationDeleted'))
                                setDeleteReservationDialog(null)
                                fetchReservations()
                            }
                        } catch (err) {
                            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteReservationFailed'))
                        } finally {
                            setActionLoading(false)
                        }
                    }}
                    title={t('common.delete')}
                    description={t('admin.facilities.detail.confirmDeleteReservation')}
                    confirmLabel={t('common.delete')}
                    cancelLabel={t('common.cancel')}
                    variant="danger"
                />
            )}
        </div>
    )
}
