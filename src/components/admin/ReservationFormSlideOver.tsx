/**
 * Reservation Form Slide-Over Component
 *
 * Create/edit reservation form in a slide-over panel
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { Input, Select, Button } from './'
import {
    createReservation,
    updateReservation,
    getFacilities,
    getResources,
    getResourceById,
    checkReservationConflicts,
} from '../../data/services/facilitiesService'
import { getTeams } from '../../data/services/teamsService'
import type { FacilityReservation, ReservationType, ReservationStatus, FacilityReservationFormData } from '../../types/facilities'
import ReservationAlternativesModal from './ReservationAlternativesModal'

interface ReservationFormSlideOverProps {
    isOpen: boolean
    onClose: () => void
    reservation: FacilityReservation | null
    initialFacilityId?: string | null
    initialResourceId?: string | null
    initialStartAt?: string | null
    initialEndAt?: string | null
    onSaved: () => void
}

const RESERVATION_TYPES: { value: ReservationType; label: string }[] = [
    { value: 'practice', label: 'Practice' },
    { value: 'game', label: 'Game' },
    { value: 'tournament', label: 'Tournament' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'rental', label: 'Rental' },
    { value: 'maintenance', label: 'Maintenance' },
]

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
    { value: 'tentative', label: 'Tentative' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
]

export default function ReservationFormSlideOver({
    isOpen,
    onClose,
    reservation,
    initialFacilityId,
    initialResourceId,
    initialStartAt,
    initialEndAt,
    onSaved,
}: ReservationFormSlideOverProps) {
    const { context, isReady } = useUserContext()
    const t = useT()

    const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([])
    const [resources, setResources] = useState<Array<{ id: string; name: string }>>([])
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(initialFacilityId || null)
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(initialResourceId || null)
    const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; message: string } | null>(null)
    const [alternativesModalOpen, setAlternativesModalOpen] = useState(false)

    const [formData, setFormData] = useState<FacilityReservationFormData>({
        facility_id: '',
        resource_id: '',
        reservation_type: 'practice',
        status: 'confirmed',
        start_at: '',
        end_at: '',
        title: '',
        event_id: null,
        team_id: null,
        program_id: null,
        sport_id: null,
        notes: null,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [checkingConflicts, setCheckingConflicts] = useState(false)

    // Load facilities and teams
    useEffect(() => {
        if (!isReady || !context.orgId) return

        const loadData = async () => {
            const [facilitiesResult, teamsResult] = await Promise.all([
                getFacilities(context.orgId),
                getTeams(context, {}),
            ])

            if (facilitiesResult.data) {
                setFacilities(facilitiesResult.data.map((f) => ({ id: f.id, name: f.name })))
            }

            if (teamsResult.data) {
                setTeams(teamsResult.data.map((t) => ({ id: t.id, name: t.name })))
            }
        }

        loadData()
    }, [isReady, context.orgId, context])

    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) {
                onClose()
            }
        }
        
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, saving, onClose])

    // Load resources when facility changes
    useEffect(() => {
        if (!isReady || !context.orgId || !selectedFacilityId) {
            setResources([])
            return
        }

        const loadResources = async () => {
            const result = await getResources(context.orgId, { facility_id: selectedFacilityId })
            if (result.data) {
                setResources(result.data.map((r) => ({ id: r.id, name: r.name })))
            }
        }

        loadResources()
    }, [isReady, context.orgId, selectedFacilityId])

    // Initialize form data
    useEffect(() => {
        if (reservation) {
            setFormData({
                facility_id: reservation.facility_id,
                resource_id: reservation.resource_id,
                reservation_type: reservation.reservation_type,
                status: reservation.status,
                start_at: reservation.start_at,
                end_at: reservation.end_at,
                title: reservation.title,
                event_id: reservation.event_id,
                team_id: reservation.team_id,
                program_id: reservation.program_id,
                sport_id: reservation.sport_id,
                notes: reservation.notes,
            })
            setSelectedFacilityId(reservation.facility_id)
            setSelectedResourceId(reservation.resource_id)
        } else {
            setFormData({
                facility_id: initialFacilityId || '',
                resource_id: initialResourceId || '',
                reservation_type: 'practice',
                status: 'confirmed',
                start_at: initialStartAt || '',
                end_at: initialEndAt || '',
                title: '',
                event_id: null,
                team_id: null,
                program_id: null,
                sport_id: null,
                notes: null,
            })
            setSelectedFacilityId(initialFacilityId || null)
            setSelectedResourceId(initialResourceId || null)
        }
        setErrors({})
        setConflictCheck(null)
    }, [reservation, initialFacilityId, initialResourceId, initialStartAt, initialEndAt, isOpen])

    const handleFieldChange = (field: keyof FacilityReservationFormData, value: any) => {
        setFormData((prev: FacilityReservationFormData) => ({ ...prev, [field]: value }))
        const key = field as string
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[key]
                return newErrors
            })
        }
        // Clear conflict check when times change
        if (field === 'start_at' || field === 'end_at' || field === 'resource_id') {
            setConflictCheck(null)
        }
    }

    const handleCheckConflicts = async () => {
        if (!selectedResourceId || !formData.start_at || !formData.end_at) {
            return
        }

        setCheckingConflicts(true)
        try {
            const result = await checkReservationConflicts(
                context.orgId,
                selectedResourceId,
                formData.start_at,
                formData.end_at,
                reservation?.id
            )

            if (result.data) {
                setConflictCheck({
                    hasConflict: result.data.has_conflict,
                    message: result.data.has_conflict
                        ? `Conflicts detected: ${result.data.conflicting_reservations.length} reservations, ${result.data.conflicting_blackouts.length} blackouts`
                        : 'No conflicts detected',
                })
            }
        } catch (err) {
            console.error('Error checking conflicts:', err)
        } finally {
            setCheckingConflicts(false)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.title.trim()) {
            newErrors.title = t('admin.facilities.form.reservationTitleRequired')
        }

        if (!selectedFacilityId) {
            newErrors.facility_id = 'Facility is required'
        }

        if (!selectedResourceId) {
            newErrors.resource_id = 'Resource is required'
        }

        if (!formData.start_at) {
            newErrors.start_at = 'Start date/time is required'
        }

        if (!formData.end_at) {
            newErrors.end_at = 'End date/time is required'
        }

        if (formData.start_at && formData.end_at && formData.start_at >= formData.end_at) {
            newErrors.end_at = 'End time must be after start time'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!isReady || !context.orgId) return

        if (!validateForm()) {
            return
        }

        const submitData: FacilityReservationFormData = {
            ...formData,
            facility_id: selectedFacilityId!,
            resource_id: selectedResourceId!,
        }

        setSaving(true)
        try {
            let result
            if (reservation) {
                result = await updateReservation(reservation.id, submitData)
            } else {
                result = await createReservation(context.orgId, submitData)
            }

            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.createReservationFailed'))
            } else {
                showSuccess(
                    reservation
                        ? t('admin.facilities.success.reservationUpdated')
                        : t('admin.facilities.success.reservationCreated')
                )
                onSaved()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.createReservationFailed'))
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'flex-end',
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
        >
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    transition: 'opacity 0.3s',
                    opacity: isOpen ? 1 : 0,
                }}
                onClick={onClose}
            />

            {/* Slide-Over Panel */}
            <div
                style={{
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '600px',
                    maxWidth: '90vw',
                    height: '100%',
                    background: 'var(--org-surface-card)',
                    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '24px',
                        borderBottom: '1px solid var(--org-border-default)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: 'var(--org-text-primary)',
                            margin: 0,
                        }}
                    >
                        {reservation ? t('admin.facilities.schedule.editReservation') : t('admin.facilities.schedule.createReservation')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--org-text-secondary)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            close
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                    }}
                >
                    {/* Facility Selection */}
                    {!initialFacilityId && (
                        <Select
                            label="Facility"
                            value={selectedFacilityId || ''}
                            onChange={(e) => {
                                setSelectedFacilityId(e.target.value || null)
                                setSelectedResourceId(null)
                            }}
                            options={[
                                { value: '', label: 'Select Facility' },
                                ...facilities.map((f) => ({ value: f.id, label: f.name })),
                            ]}
                            error={errors.facility_id}
                            required
                        />
                    )}

                    {/* Resource Selection */}
                    {selectedFacilityId && (
                        <Select
                            label="Resource"
                            value={selectedResourceId || ''}
                            onChange={(e) => {
                                setSelectedResourceId(e.target.value || null)
                                handleFieldChange('resource_id', e.target.value)
                            }}
                            options={[
                                { value: '', label: 'Select Resource' },
                                ...resources.map((r) => ({ value: r.id, label: r.name })),
                            ]}
                            error={errors.resource_id}
                            required
                        />
                    )}

                    {/* Title */}
                    <Input
                        label={t('admin.facilities.form.reservationTitle')}
                        value={formData.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        error={errors.title}
                        required
                    />

                    {/* Reservation Type */}
                    <Select
                        label={t('admin.facilities.form.reservationType')}
                        value={formData.reservation_type}
                        onChange={(e) => handleFieldChange('reservation_type', e.target.value)}
                        options={RESERVATION_TYPES}
                    />

                    {/* Status */}
                    <Select
                        label={t('admin.facilities.form.reservationStatus')}
                        value={formData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        options={STATUS_OPTIONS}
                    />

                    {/* Start Date/Time */}
                    <div>
                        <label className="oa-label">{t('admin.facilities.form.reservationStart')}</label>
                        <input
                            type="datetime-local"
                            className="oa-input"
                            value={formData.start_at ? formData.start_at.slice(0, 16) : ''}
                            onChange={(e) =>
                                handleFieldChange('start_at', e.target.value ? new Date(e.target.value).toISOString() : '')
                            }
                            style={{ marginTop: '8px' }}
                        />
                        {errors.start_at && (
                            <div className="oa-helper oa-helper--error">{errors.start_at}</div>
                        )}
                    </div>

                    {/* End Date/Time */}
                    <div>
                        <label className="oa-label">{t('admin.facilities.form.reservationEnd')}</label>
                        <input
                            type="datetime-local"
                            className="oa-input"
                            value={formData.end_at ? formData.end_at.slice(0, 16) : ''}
                            onChange={(e) =>
                                handleFieldChange('end_at', e.target.value ? new Date(e.target.value).toISOString() : '')
                            }
                            style={{ marginTop: '8px' }}
                        />
                        {errors.end_at && (
                            <div className="oa-helper oa-helper--error">{errors.end_at}</div>
                        )}
                    </div>

                    {/* Check Conflicts Button */}
                    {selectedResourceId && formData.start_at && formData.end_at && (
                        <div>
                            <Button
                                variant="secondary"
                                onClick={handleCheckConflicts}
                                disabled={checkingConflicts}
                            >
                                {checkingConflicts ? 'Checking...' : t('admin.facilities.schedule.checkAvailability')}
                            </Button>
                            {conflictCheck && (
                                <div style={{ marginTop: '12px' }}>
                                    <div
                                        style={{
                                            padding: '12px',
                                            borderRadius: '8px',
                                            background: conflictCheck.hasConflict
                                                ? 'var(--pa-danger-light)'
                                                : 'var(--pa-success-light)',
                                            color: conflictCheck.hasConflict
                                                ? 'var(--pa-danger)'
                                                : 'var(--pa-success)',
                                            fontSize: '14px',
                                            marginBottom: conflictCheck.hasConflict ? '12px' : '0',
                                        }}
                                    >
                                        {conflictCheck.message}
                                    </div>
                                    {conflictCheck.hasConflict && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => setAlternativesModalOpen(true)}
                                            style={{ marginTop: '8px' }}
                                        >
                                            {t('admin.facilities.schedule.suggestAlternatives')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Team Selection */}
                    <Select
                        label={t('admin.facilities.form.linkToTeam')}
                        value={formData.team_id || ''}
                        onChange={(e) => handleFieldChange('team_id', e.target.value || null)}
                        options={[
                            { value: '', label: 'None' },
                            ...teams.map((t) => ({ value: t.id, label: t.name })),
                        ]}
                    />

                    {/* Notes */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.facilities.form.notes')}</label>
                        <textarea
                            className="oa-input"
                            value={formData.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value || null)}
                            rows={4}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '24px',
                        borderTop: '1px solid var(--org-border-default)',
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                    }}
                >
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving || (conflictCheck?.hasConflict && !reservation)}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </div>

            {/* Alternatives Modal */}
            {isReady && context.orgId && (
                <ReservationAlternativesModal
                    isOpen={alternativesModalOpen}
                    onClose={() => setAlternativesModalOpen(false)}
                    orgId={context.orgId}
                    startAt={formData.start_at}
                    endAt={formData.end_at}
                    facilityId={selectedFacilityId || undefined}
                    resourceId={selectedResourceId || undefined}
                    onSelectAlternative={async (alt) => {
                        if (alt.resource_id && context.orgId) {
                            const resourceResult = await getResourceById(alt.resource_id)
                            if (resourceResult.data) {
                                const resource = resourceResult.data
                                setSelectedFacilityId(resource.facility_id)
                                handleFieldChange('facility_id', resource.facility_id)
                            }
                        }
                        setSelectedResourceId(alt.resource_id)
                        handleFieldChange('resource_id', alt.resource_id)
                        handleFieldChange('start_at', alt.suggested_start_at)
                        handleFieldChange('end_at', alt.suggested_end_at)
                        setConflictCheck(null)
                    }}
                />
            )}
        </div>
    )
}
