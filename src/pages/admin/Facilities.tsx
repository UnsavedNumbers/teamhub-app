/**
 * Facilities List Page
 *
 * Lists all facilities in the organization with filtering and view options.
 * Complete action audit implementation with full CRUD support.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { AdminPageHeader, ConfirmDialog, Button, Card } from '../../components/admin'
import { getFacilities, deleteFacility } from '../../data/services/facilitiesService'
import type { Facility, FacilityFilters } from '../../types/facilities'
import FacilitiesFilters from '../../components/admin/FacilitiesFilters'
import FacilityFormSlideOver from '../../components/admin/FacilityFormSlideOver'
import ResourceFormSlideOver from '../../components/admin/ResourceFormSlideOver'
import { hasAnyRole } from '../../utils/roleHelpers'
import '../../styles/orgAdmin.css'

const DEFAULT_FILTERS: FacilityFilters = {
    search: '',
    status: undefined,
    facility_type: undefined,
}

export default function Facilities() {
    // Data state
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [filters, setFilters] = useState<FacilityFilters>(DEFAULT_FILTERS)
    const [filtersOpen, setFiltersOpen] = useState(false)

    // Forms
    const [facilityFormOpen, setFacilityFormOpen] = useState(false)
    const [facilityFormEditing, setFacilityFormEditing] = useState<Facility | null>(null)
    const [resourceFormOpen, setResourceFormOpen] = useState(false)
    const [resourceFormFacilityId, setResourceFormFacilityId] = useState<string | null>(null)

    // Delete dialog
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; facility: Facility | null }>({
        open: false,
        facility: null,
    })
    const [, setActionLoading] = useState(false)

    const { context, isReady } = useUserContext()
    const { currentOrganization } = useOrganization()
    const navigate = useNavigate()
    const t = useT()
    const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])

    const fetchFacilities = useCallback(async () => {
        if (!isReady || !context.orgId) return

        setLoading(true)
        setError(null)

        try {
            const result = await getFacilities(context.orgId, filters)

            if (result.error) {
                setError(result.error.message)
                setFacilities([])
            } else {
                setFacilities(result.data || [])
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err) || t('admin.facilities.errors.loadFailed')
            setError(errorMessage)
            setFacilities([])
        } finally {
            setLoading(false)
        }
    }, [isReady, context.orgId, filters, t])

    useEffect(() => {
        fetchFacilities()
    }, [fetchFacilities])

    // Action handlers
    const handleCreateFacility = () => {
        setFacilityFormEditing(null)
        setFacilityFormOpen(true)
    }

    const handleEditFacility = (facility: Facility) => {
        setFacilityFormEditing(facility)
        setFacilityFormOpen(true)
    }

    const handleDeleteFacility = (facility: Facility) => {
        setDeleteDialog({ open: true, facility })
    }

    const handleConfirmDelete = async () => {
        if (!deleteDialog.facility) return

        setActionLoading(true)
        try {
            const result = await deleteFacility(deleteDialog.facility.id)

            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.deleteFailed'))
            } else {
                showSuccess(t('admin.facilities.success.deleted'))
                setDeleteDialog({ open: false, facility: null })
                fetchFacilities()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteFailed'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleFacilitySaved = () => {
        setFacilityFormOpen(false)
        setFacilityFormEditing(null)
        fetchFacilities()
    }

    const handleCreateResource = () => {
        // If no facilities, show error
        if (facilities.length === 0) {
            showError('Please create a facility first')
            return
        }
        // If only one facility, pre-select it
        if (facilities.length === 1) {
            setResourceFormFacilityId(facilities[0].id)
            setResourceFormOpen(true)
        } else {
            // Show facility selector or open form with facility selection
            setResourceFormFacilityId(null)
            setResourceFormOpen(true)
        }
    }

    const handleResourceSaved = () => {
        setResourceFormOpen(false)
        setResourceFormFacilityId(null)
        fetchFacilities()
    }

    const handleFacilityClick = (facility: Facility) => {
        navigate(getLink('admin.facilities.detail', { id: facility.id }))
    }

    const handleViewSchedule = () => {
        navigate(getLink('admin.facilities.schedule'))
    }

    const handleOpenSchedule = (facility: Facility) => {
        navigate(getLink('admin.facilities.schedule') + '?facility=' + encodeURIComponent(facility.id))
    }

    const handleClearFilters = () => {
        setFilters(DEFAULT_FILTERS)
    }

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

    return (
        <div>
            <AdminPageHeader
                title={t('admin.facilities.title')}
                subtitle={t('admin.facilities.subtitle')}
                actions={
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                            variant="secondary"
                            onClick={() => setFiltersOpen(true)}
                            icon="filter_list"
                        >
                            {t('common.search')}
                        </Button>
                        <Button variant="secondary" onClick={handleViewSchedule} icon="calendar_month">
                            {t('admin.facilities.viewSchedule')}
                        </Button>
                        {isOrgAdmin && (
                            <>
                                <Button variant="secondary" onClick={handleCreateResource} icon="add">
                                    {t('admin.facilities.addResource')}
                                </Button>
                                <Button variant="primary" onClick={handleCreateFacility} icon="add">
                                    {t('admin.facilities.create')}
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            {error && (
                <div
                    style={{
                        padding: '16px',
                        marginBottom: '24px',
                        background: 'var(--pa-danger-light)',
                        color: 'var(--pa-danger)',
                        borderRadius: '8px',
                    }}
                >
                    {error}
                    <Button
                        variant="ghost"
                        onClick={fetchFacilities}
                        style={{ marginLeft: '12px' }}
                    >
                        {t('common.retry')}
                    </Button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '64px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>
                        refresh
                    </span>
                    <div style={{ marginTop: '16px', color: 'var(--org-text-secondary)' }}>
                        {t('common.loading')}
                    </div>
                </div>
            ) : facilities.length === 0 ? (
                <Card className="oa-border-2 oa-border-dashed">
                    <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                        <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>location_city</span>
                        <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                            <h3 className="oa-h3 oa-mb-0">{t('admin.facilities.empty.title')}</h3>
                            <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.facilities.empty.message')}</p>
                            {isOrgAdmin && (
                                <Button variant="primary" onClick={handleCreateFacility} icon="add">
                                    {t('admin.facilities.empty.createButton')}
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {facilities.map((facility) => (
                        <div role="button" tabIndex={0} onClick={() => handleFacilityClick(facility)} onKeyDown={(e) => e.key === 'Enter' && handleFacilityClick(facility)} style={{ cursor: 'pointer' }}>
                        <Card
                            key={facility.id}
                            title={facility.name}
                        >
                            <div style={{ marginBottom: '16px' }}>
                                {facility.description && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        {facility.description}
                                    </p>
                                )}
                                {facility.formatted_address && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        {facility.formatted_address}
                                    </p>
                                )}
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                        marginTop: '12px',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '16px', color: 'var(--org-text-tertiary)' }}
                                    >
                                        location_city
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--org-text-tertiary)',
                                        }}
                                    >
                                        {facility.facility_type || 'Facility'}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--org-text-tertiary)',
                                            marginLeft: 'auto',
                                        }}
                                    >
                                        {facility.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid var(--org-border-default)',
                                }}
                            >
                                <Button
                                    variant="ghost"
                                    size="compact"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation()
                                        handleOpenSchedule(facility)
                                    }}
                                    icon="calendar_month"
                                >
                                    {t('admin.facilities.openSchedule')}
                                </Button>
                                {isOrgAdmin && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                e.stopPropagation()
                                                handleEditFacility(facility)
                                            }}
                                            icon="edit"
                                        >
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                e.stopPropagation()
                                                handleDeleteFacility(facility)
                                            }}
                                            icon="delete"
                                            style={{ color: 'var(--pa-danger)' }}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters Slide-Over */}
            <FacilitiesFilters
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onFiltersChange={setFilters}
                onClearAll={handleClearFilters}
            />

            {/* Facility Form Slide-Over */}
            <FacilityFormSlideOver
                isOpen={facilityFormOpen}
                onClose={() => {
                    setFacilityFormOpen(false)
                    setFacilityFormEditing(null)
                }}
                facility={facilityFormEditing}
                onSaved={handleFacilitySaved}
            />

            {/* Resource Form Slide-Over */}
            <ResourceFormSlideOver
                isOpen={resourceFormOpen}
                onClose={() => {
                    setResourceFormOpen(false)
                    setResourceFormFacilityId(null)
                }}
                facilityId={resourceFormFacilityId}
                resource={null}
                onSaved={handleResourceSaved}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                onCancel={() => setDeleteDialog({ open: false, facility: null })}
                onConfirm={handleConfirmDelete}
                title={t('admin.facilities.detail.confirmDelete')}
                description={
                    deleteDialog.facility
                        ? t('admin.facilities.detail.confirmDelete', {
                              name: deleteDialog.facility.name,
                          })
                        : ''
                }
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
            />
        </div>
    )
}
