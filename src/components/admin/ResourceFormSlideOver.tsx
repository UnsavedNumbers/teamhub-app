/**
 * Resource Form Slide-Over Component
 *
 * Create/edit resource form in a slide-over panel
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { Input, Select, Button } from './'
import { createResource, updateResource, getFacilities } from '../../data/services/facilitiesService'
import type { FacilityResource, ResourceType, ResourceStatus, FacilityResourceFormData } from '../../types/facilities'

interface ResourceFormSlideOverProps {
    isOpen: boolean
    onClose: () => void
    facilityId: string | null
    resource: FacilityResource | null
    onSaved: () => void
}

const RESOURCE_TYPES: { value: ResourceType | ''; label: string }[] = [
    { value: '', label: 'Select Type' },
    { value: 'field', label: 'Field' },
    { value: 'court', label: 'Court' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'rink', label: 'Rink' },
    { value: 'pool', label: 'Pool' },
    { value: 'room', label: 'Room' },
    { value: 'track', label: 'Track' },
    { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

const DIMENSION_UNITS = [
    { value: 'feet', label: 'Feet' },
    { value: 'yards', label: 'Yards' },
    { value: 'meters', label: 'Meters' },
]

export default function ResourceFormSlideOver({
    isOpen,
    onClose,
    facilityId: propFacilityId,
    resource,
    onSaved,
}: ResourceFormSlideOverProps) {
    const { context, isReady } = useUserContext()
    const t = useT()

    const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([])
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(propFacilityId)
    const [formData, setFormData] = useState<FacilityResourceFormData>({
        name: '',
        resource_type: null,
        sport_tags: [],
        status: 'active',
        surface_type: null,
        dimensions: null,
        lighting: null,
        indoor: null,
        capacity: null,
        reservable: true,
        notes: null,
    })

    const [sportTagInput, setSportTagInput] = useState('')
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

    // Initialize form data
    useEffect(() => {
        if (resource) {
            setFormData({
                name: resource.name,
                resource_type: resource.resource_type,
                sport_tags: resource.sport_tags || [],
                status: resource.status,
                surface_type: resource.surface_type,
                dimensions: resource.dimensions,
                lighting: resource.lighting,
                indoor: resource.indoor,
                capacity: resource.capacity,
                reservable: resource.reservable,
                notes: resource.notes,
            })
            setSelectedFacilityId(resource.facility_id)
        } else {
            setFormData({
                name: '',
                resource_type: null,
                sport_tags: [],
                status: 'active',
                surface_type: null,
                dimensions: null,
                lighting: null,
                indoor: null,
                capacity: null,
                reservable: true,
                notes: null,
            })
            setSelectedFacilityId(propFacilityId)
        }
        setErrors({})
        setSportTagInput('')
    }, [resource, propFacilityId, isOpen])

    const handleFieldChange = (field: keyof FacilityResourceFormData, value: any) => {
        setFormData((prev: FacilityResourceFormData) => ({ ...prev, [field]: value }))
        const key = field as string
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[key]
                return newErrors
            })
        }
    }

    const handleAddSportTag = () => {
        const tag = sportTagInput.trim().toLowerCase()
        if (tag && !formData.sport_tags.includes(tag)) {
            handleFieldChange('sport_tags', [...formData.sport_tags, tag])
            setSportTagInput('')
        }
    }

    const handleRemoveSportTag = (tag: string) => {
        handleFieldChange(
            'sport_tags',
            formData.sport_tags.filter((t: string) => t !== tag)
        )
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = t('admin.facilities.form.resourceNameRequired')
        }

        if (!selectedFacilityId) {
            newErrors.facility_id = 'Facility is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!isReady || !context.orgId || !selectedFacilityId) return

        if (!validateForm()) {
            return
        }

        setSaving(true)
        try {
            let result
            if (resource) {
                result = await updateResource(resource.id, formData)
            } else {
                result = await createResource(context.orgId, selectedFacilityId, formData)
            }

            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.createResourceFailed'))
            } else {
                showSuccess(
                    resource
                        ? t('admin.facilities.success.resourceUpdated')
                        : t('admin.facilities.success.resourceCreated')
                )
                onSaved()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.createResourceFailed'))
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
                        {resource ? t('admin.facilities.form.resourceName') : 'Add Resource'}
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
                    {/* Facility Selection (only if not pre-selected) */}
                    {!propFacilityId && (
                        <Select
                            label="Facility"
                            value={selectedFacilityId || ''}
                            onChange={(e) => setSelectedFacilityId(e.target.value || null)}
                            options={[
                                { value: '', label: 'Select Facility' },
                                ...facilities.map((f) => ({ value: f.id, label: f.name })),
                            ]}
                            error={errors.facility_id}
                            required
                        />
                    )}

                    {/* Name */}
                    <Input
                        label={t('admin.facilities.form.resourceName')}
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        error={errors.name}
                        required
                    />

                    {/* Resource Type */}
                    <Select
                        label={t('admin.facilities.form.resourceType')}
                        value={formData.resource_type || ''}
                        onChange={(e) => handleFieldChange('resource_type', e.target.value || null)}
                        options={RESOURCE_TYPES}
                    />

                    {/* Sport Tags */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.facilities.form.sportTags')}</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <Input
                                value={sportTagInput}
                                onChange={(e) => setSportTagInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddSportTag()
                                    }
                                }}
                                placeholder="Add sport tag..."
                            />
                            <Button variant="secondary" onClick={handleAddSportTag}>
                                Add
                            </Button>
                        </div>
                        {formData.sport_tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.sport_tags.map((tag: string) => (
                                    <span
                                        key={tag}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            background: 'var(--org-btn-primary-bg)',
                                            color: 'var(--org-btn-primary-text)',
                                            fontSize: '12px',
                                        }}
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveSportTag(tag)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'inherit',
                                                cursor: 'pointer',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                                close
                                            </span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    <Select
                        label={t('admin.facilities.form.status')}
                        value={formData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        options={STATUS_OPTIONS}
                    />

                    {/* Surface Type */}
                    <Input
                        label={t('admin.facilities.form.surfaceType')}
                        value={formData.surface_type || ''}
                        onChange={(e) => handleFieldChange('surface_type', e.target.value || null)}
                    />

                    {/* Dimensions */}
                    <div style={{ border: '1px solid var(--org-border-default)', borderRadius: '8px', padding: '16px' }}>
                        <label className="oa-label" style={{ marginBottom: '12px' }}>
                            {t('admin.facilities.form.dimensions')}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <Input
                                label="Length"
                                type="number"
                                value={formData.dimensions?.length || ''}
                                onChange={(e) =>
                                    handleFieldChange('dimensions', {
                                        ...formData.dimensions,
                                        length: e.target.value ? parseFloat(e.target.value) : undefined,
                                    })
                                }
                            />
                            <Input
                                label="Width"
                                type="number"
                                value={formData.dimensions?.width || ''}
                                onChange={(e) =>
                                    handleFieldChange('dimensions', {
                                        ...formData.dimensions,
                                        width: e.target.value ? parseFloat(e.target.value) : undefined,
                                    })
                                }
                            />
                            <Select
                                label="Unit"
                                value={formData.dimensions?.unit || ''}
                                onChange={(e) =>
                                    handleFieldChange('dimensions', {
                                        ...formData.dimensions,
                                        unit: e.target.value || undefined,
                                    })
                                }
                                options={[
                                    { value: '', label: 'Select' },
                                    ...DIMENSION_UNITS,
                                ]}
                            />
                        </div>
                    </div>

                    {/* Lighting */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            checked={formData.lighting === true}
                            onChange={(e) => handleFieldChange('lighting', e.target.checked ? true : null)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <label style={{ fontSize: '14px', color: 'var(--org-text-primary)' }}>
                            {t('admin.facilities.form.lighting')}
                        </label>
                    </div>

                    {/* Indoor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            checked={formData.indoor === true}
                            onChange={(e) => handleFieldChange('indoor', e.target.checked ? true : null)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <label style={{ fontSize: '14px', color: 'var(--org-text-primary)' }}>
                            {t('admin.facilities.form.indoor')}
                        </label>
                    </div>

                    {/* Capacity */}
                    <Input
                        label={t('admin.facilities.form.capacity')}
                        type="number"
                        value={formData.capacity || ''}
                        onChange={(e) => handleFieldChange('capacity', e.target.value ? parseInt(e.target.value) : null)}
                    />

                    {/* Reservable */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            checked={formData.reservable}
                            onChange={(e) => handleFieldChange('reservable', e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <label style={{ fontSize: '14px', color: 'var(--org-text-primary)' }}>
                            {t('admin.facilities.form.reservable')}
                        </label>
                    </div>

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
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
