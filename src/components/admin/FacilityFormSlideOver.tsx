/**
 * Facility Form Slide-Over Component
 *
 * Create/edit facility form in a slide-over panel
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { Input, Select, Button } from './'
import { LocationAutocomplete } from '../common/LocationAutocomplete'
import { createFacility, updateFacility } from '../../data/services/facilitiesService'
import type { Facility, FacilityType, FacilityStatus, AddressMode, FacilityFormData } from '../../types/facilities'
import type { StructuredAddress } from '../../types/location'

interface FacilityFormSlideOverProps {
    isOpen: boolean
    onClose: () => void
    facility: Facility | null
    onSaved: () => void
}

const FACILITY_TYPES: { value: FacilityType | ''; label: string }[] = [
    { value: '', label: 'Select Type' },
    { value: 'park', label: 'Park' },
    { value: 'school', label: 'School' },
    { value: 'gym', label: 'Gym' },
    { value: 'arena', label: 'Arena' },
    { value: 'complex', label: 'Complex' },
    { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: FacilityStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

const ADDRESS_MODE_OPTIONS: { value: AddressMode | ''; label: string }[] = [
    { value: '', label: 'Select Mode' },
    { value: 'internal_google_place', label: 'Google Place' },
    { value: 'manual', label: 'Manual Entry' },
]

// Common timezones
const TIMEZONE_OPTIONS = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'UTC', label: 'UTC' },
]

export default function FacilityFormSlideOver({
    isOpen,
    onClose,
    facility,
    onSaved,
}: FacilityFormSlideOverProps) {
    const { context, isReady } = useUserContext()
    const t = useT()

    const [formData, setFormData] = useState<FacilityFormData>({
        name: '',
        facility_type: null,
        status: 'active',
        is_public: false,
        description: '',
        address_mode: null,
        place_id: null,
        formatted_address: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        latitude: null,
        longitude: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        parking_notes: '',
        entry_instructions: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    // Initialize form data when facility changes
    useEffect(() => {
        if (facility) {
            setFormData({
                name: facility.name,
                facility_type: facility.facility_type,
                status: facility.status,
                is_public: facility.is_public,
                description: facility.description || '',
                address_mode: facility.address_mode,
                place_id: facility.place_id,
                formatted_address: facility.formatted_address,
                city: facility.city,
                state: facility.state,
                postal_code: facility.postal_code,
                country: facility.country,
                latitude: facility.latitude,
                longitude: facility.longitude,
                timezone: facility.timezone,
                parking_notes: facility.parking_notes || '',
                entry_instructions: facility.entry_instructions || '',
                contact_name: facility.contact_name || '',
                contact_phone: facility.contact_phone || '',
                contact_email: facility.contact_email || '',
            })
        } else {
            // Reset form
            setFormData({
                name: '',
                facility_type: null,
                status: 'active',
                is_public: false,
                description: '',
                address_mode: null,
                place_id: null,
                formatted_address: null,
                city: null,
                state: null,
                postal_code: null,
                country: null,
                latitude: null,
                longitude: null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                parking_notes: '',
                entry_instructions: '',
                contact_name: '',
                contact_phone: '',
                contact_email: '',
            })
        }
        setErrors({})
    }, [facility, isOpen])

    const handleFieldChange = (field: keyof FacilityFormData, value: any) => {
        setFormData((prev: FacilityFormData) => ({ ...prev, [field]: value }))
        const key = field as string
        if (errors[key]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[key]
                return newErrors
            })
        }
    }

    const handleLocationChange = (address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
        handleFieldChange('address_mode', 'internal_google_place')
        handleFieldChange('place_id', placeResult?.place_id || address.place_id || null)
        handleFieldChange('formatted_address', address.formatted_address || null)
        handleFieldChange('city', address.city || null)
        handleFieldChange('state', address.state || null)
        handleFieldChange('postal_code', address.postal_code || null)
        handleFieldChange('country', address.country || null)
        handleFieldChange('latitude', address.latitude != null ? Number(address.latitude) : null)
        handleFieldChange('longitude', address.longitude != null ? Number(address.longitude) : null)
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = t('admin.facilities.form.nameRequired')
        }

        if (!formData.timezone) {
            newErrors.timezone = t('admin.facilities.form.timezoneRequired')
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!isReady || !context.orgId) return

        if (!validateForm()) {
            return
        }

        setSaving(true)
        try {
            let result
            if (facility) {
                result = await updateFacility(facility.id, formData)
            } else {
                result = await createFacility(context.orgId, formData)
            }

            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.createFailed'))
            } else {
                showSuccess(
                    facility
                        ? t('admin.facilities.success.updated')
                        : t('admin.facilities.success.created')
                )
                onSaved()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.createFailed'))
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
                        {facility ? t('admin.facilities.edit') : t('admin.facilities.create')}
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
                    {/* Name */}
                    <Input
                        label={t('admin.facilities.form.name')}
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        error={errors.name}
                        required
                    />

                    {/* Facility Type */}
                    <Select
                        label={t('admin.facilities.form.facilityType')}
                        value={formData.facility_type || ''}
                        onChange={(e) =>
                            handleFieldChange('facility_type', e.target.value || null)
                        }
                        options={FACILITY_TYPES}
                    />

                    {/* Status */}
                    <Select
                        label={t('admin.facilities.form.status')}
                        value={formData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        options={STATUS_OPTIONS}
                    />

                    {/* Is Public */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => handleFieldChange('is_public', e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <label style={{ fontSize: '14px', color: 'var(--org-text-primary)' }}>
                            {t('admin.facilities.form.isPublic')}
                        </label>
                    </div>
                    {formData.is_public && (
                        <p style={{ fontSize: '12px', color: 'var(--org-text-secondary)' }}>
                            {t('admin.facilities.form.isPublicDescription')}
                        </p>
                    )}

                    {/* Description */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.facilities.form.description')}</label>
                        <textarea
                            className="oa-input"
                            value={formData.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            rows={4}
                            style={{
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {/* Address Mode */}
                    <Select
                        label={t('admin.facilities.form.addressMode')}
                        value={formData.address_mode || ''}
                        onChange={(e) => handleFieldChange('address_mode', e.target.value || null)}
                        options={ADDRESS_MODE_OPTIONS}
                    />

                    {/* Google Place Autocomplete */}
                    {formData.address_mode === 'internal_google_place' && (
                        <LocationAutocomplete
                            value={formData.formatted_address || ''}
                            onChange={handleLocationChange}
                            placeholder="Search for a location..."
                        />
                    )}

                    {/* Manual Address Fields */}
                    {formData.address_mode === 'manual' && (
                        <>
                            <Input
                                label={t('admin.facilities.form.address')}
                                value={formData.formatted_address || ''}
                                onChange={(e) => handleFieldChange('formatted_address', e.target.value)}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Input
                                    label="City"
                                    value={formData.city || ''}
                                    onChange={(e) => handleFieldChange('city', e.target.value)}
                                />
                                <Input
                                    label="State"
                                    value={formData.state || ''}
                                    onChange={(e) => handleFieldChange('state', e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Input
                                    label="Postal Code"
                                    value={formData.postal_code || ''}
                                    onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                                />
                                <Input
                                    label="Country"
                                    value={formData.country || ''}
                                    onChange={(e) => handleFieldChange('country', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* Timezone */}
                    <Select
                        label={t('admin.facilities.form.timezone')}
                        value={formData.timezone}
                        onChange={(e) => handleFieldChange('timezone', e.target.value)}
                        options={TIMEZONE_OPTIONS}
                        required
                        error={errors.timezone}
                    />

                    {/* Parking Notes */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.facilities.form.parkingNotes')}</label>
                        <textarea
                            className="oa-input"
                            value={formData.parking_notes}
                            onChange={(e) => handleFieldChange('parking_notes', e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Entry Instructions */}
                    <div className="oa-form-group">
                        <label className="oa-label">
                            {t('admin.facilities.form.entryInstructions')}
                        </label>
                        <textarea
                            className="oa-input"
                            value={formData.entry_instructions}
                            onChange={(e) => handleFieldChange('entry_instructions', e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Contact Information */}
                    <div style={{ borderTop: '1px solid var(--org-border-default)', paddingTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                            Contact Information
                        </h3>
                        <Input
                            label={t('admin.facilities.form.contactName')}
                            value={formData.contact_name}
                            onChange={(e) => handleFieldChange('contact_name', e.target.value)}
                        />
                        <Input
                            label={t('admin.facilities.form.contactPhone')}
                            value={formData.contact_phone}
                            onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                            type="tel"
                        />
                        <Input
                            label={t('admin.facilities.form.contactEmail')}
                            value={formData.contact_email}
                            onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                            type="email"
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
