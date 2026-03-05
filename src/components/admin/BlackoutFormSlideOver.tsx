/**
 * Blackout Form Slide-Over Component
 *
 * Create/edit blackout form in a slide-over panel
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { Input, Select, Button } from './'
import {
    createBlackout,
    updateBlackout,
    getFacilities,
    getResources,
} from '../../data/services/facilitiesService'
import type { FacilityBlackoutFormData } from '../../types/facilities'
import type { FacilityBlackout } from '../../types/facilities'

interface BlackoutFormSlideOverProps {
    isOpen: boolean
    onClose: () => void
    facilityId?: string | null
    blackout: FacilityBlackout | null
    onSaved: () => void
}

export default function BlackoutFormSlideOver({
    isOpen,
    onClose,
    facilityId: propFacilityId,
    blackout,
    onSaved,
}: BlackoutFormSlideOverProps) {
    const { context, isReady } = useUserContext()
    const t = useT()

    const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([])
    const [resources, setResources] = useState<Array<{ id: string; name: string }>>([])
    const [scope, setScope] = useState<'facility' | 'resource'>('facility')
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(propFacilityId || null)
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)

    const [formData, setFormData] = useState<FacilityBlackoutFormData>({
        facility_id: null,
        resource_id: null,
        title: '',
        reason: null,
        start_at: '',
        end_at: '',
        repeats_rule: null,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    // Load facilities
    useEffect(() => {
        if (!isReady || !context.orgId) return

        const loadFacilities = async () => {
            const result = await getFacilities(context.orgId)
            if (result.data) {
                setFacilities(result.data.map((f) => ({ id: f.id, name: f.name })))
            }
        }

        loadFacilities()
    }, [isReady, context.orgId])

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
        if (blackout) {
            setFormData({
                facility_id: blackout.facility_id,
                resource_id: blackout.resource_id,
                title: blackout.title,
                reason: blackout.reason,
                start_at: blackout.start_at,
                end_at: blackout.end_at,
                repeats_rule: blackout.repeats_rule,
            })
            setSelectedFacilityId(blackout.facility_id)
            setSelectedResourceId(blackout.resource_id)
            setScope(blackout.resource_id ? 'resource' : 'facility')
        } else {
            setFormData({
                facility_id: propFacilityId || null,
                resource_id: null,
                title: '',
                reason: null,
                start_at: '',
                end_at: '',
                repeats_rule: null,
            })
            setSelectedFacilityId(propFacilityId || null)
            setSelectedResourceId(null)
            setScope('facility')
        }
        setErrors({})
    }, [blackout, propFacilityId, isOpen])

    const handleFieldChange = (field: keyof FacilityBlackoutFormData, value: any) => {
        setFormData((prev: FacilityBlackoutFormData) => ({ ...prev, [field]: value }))
        const key = field as string
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[key]
                return newErrors
            })
        }
    }

    const handleScopeChange = (newScope: 'facility' | 'resource') => {
        setScope(newScope)
        if (newScope === 'facility') {
            handleFieldChange('resource_id', null)
            setSelectedResourceId(null)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.title.trim()) {
            newErrors.title = t('admin.facilities.form.blackoutTitleRequired')
        }

        if (!selectedFacilityId) {
            newErrors.facility_id = 'Facility is required'
        }

        if (scope === 'resource' && !selectedResourceId) {
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

        const submitData: FacilityBlackoutFormData = {
            ...formData,
            facility_id: selectedFacilityId,
            resource_id: scope === 'resource' ? selectedResourceId : null,
        }

        setSaving(true)
        try {
            let result
            if (blackout) {
                result = await updateBlackout(blackout.id, submitData)
            } else {
                result = await createBlackout(context.orgId, submitData)
            }

            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.createBlackoutFailed'))
            } else {
                showSuccess(
                    blackout
                        ? t('admin.facilities.success.blackoutUpdated')
                        : t('admin.facilities.success.blackoutCreated')
                )
                onSaved()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.createBlackoutFailed'))
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
                        {blackout ? 'Edit Blackout' : 'Create Blackout'}
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
                    {/* Scope */}
                    <div>
                        <label className="oa-label">{t('admin.facilities.form.blackoutScope')}</label>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => handleScopeChange('facility')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: `2px solid ${
                                        scope === 'facility'
                                            ? 'var(--org-btn-primary-bg)'
                                            : 'var(--org-border-default)'
                                    }`,
                                    background:
                                        scope === 'facility'
                                            ? 'var(--org-btn-primary-bg)'
                                            : 'transparent',
                                    color:
                                        scope === 'facility'
                                            ? 'var(--org-btn-primary-text)'
                                            : 'var(--org-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: scope === 'facility' ? '600' : '400',
                                }}
                            >
                                {t('admin.facilities.form.blackoutScopeFacility')}
                            </button>
                            <button
                                onClick={() => handleScopeChange('resource')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: `2px solid ${
                                        scope === 'resource'
                                            ? 'var(--org-btn-primary-bg)'
                                            : 'var(--org-border-default)'
                                    }`,
                                    background:
                                        scope === 'resource'
                                            ? 'var(--org-btn-primary-bg)'
                                            : 'transparent',
                                    color:
                                        scope === 'resource'
                                            ? 'var(--org-btn-primary-text)'
                                            : 'var(--org-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: scope === 'resource' ? '600' : '400',
                                }}
                            >
                                {t('admin.facilities.form.blackoutScopeResource')}
                            </button>
                        </div>
                    </div>

                    {/* Facility Selection */}
                    {!propFacilityId && (
                        <Select
                            label="Facility"
                            value={selectedFacilityId || ''}
                            onChange={(e) => {
                                setSelectedFacilityId(e.target.value || null)
                                if (scope === 'resource') {
                                    setSelectedResourceId(null)
                                }
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
                    {scope === 'resource' && selectedFacilityId && (
                        <Select
                            label="Resource"
                            value={selectedResourceId || ''}
                            onChange={(e) => setSelectedResourceId(e.target.value || null)}
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
                        label={t('admin.facilities.form.blackoutTitle')}
                        value={formData.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        error={errors.title}
                        required
                    />

                    {/* Reason */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.facilities.form.blackoutReason')}</label>
                        <textarea
                            className="oa-input"
                            value={formData.reason || ''}
                            onChange={(e) => handleFieldChange('reason', e.target.value || null)}
                            rows={3}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Start Date/Time */}
                    <div>
                        <label className="oa-label">{t('admin.facilities.form.blackoutStart')}</label>
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
                        <label className="oa-label">{t('admin.facilities.form.blackoutEnd')}</label>
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
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
