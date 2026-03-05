/**
 * Facilities Filters Component
 *
 * Slide-over panel for filtering facilities list
 */

import { useState } from 'react'
import { useT } from '../../i18n/useI18n'
import { Input } from './Input'
import { Select } from './Select'
import type { FacilityFilters, FacilityType, FacilityStatus } from '../../types/facilities'

interface FacilitiesFiltersProps {
    isOpen: boolean
    onClose: () => void
    filters: FacilityFilters
    onFiltersChange: (filters: FacilityFilters) => void
    onClearAll: () => void
}

const FACILITY_TYPES: { value: FacilityType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'park', label: 'Park' },
    { value: 'school', label: 'School' },
    { value: 'gym', label: 'Gym' },
    { value: 'arena', label: 'Arena' },
    { value: 'complex', label: 'Complex' },
    { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: FacilityStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

export default function FacilitiesFilters({
    isOpen,
    onClose,
    filters,
    onFiltersChange,
    onClearAll,
}: FacilitiesFiltersProps) {
    const t = useT()
    const [localSearch, setLocalSearch] = useState(filters.search || '')

    const handleSearchChange = (value: string) => {
        setLocalSearch(value)
        onFiltersChange({ ...filters, search: value })
    }

    const handleFacilityTypeChange = (value: string) => {
        onFiltersChange({
            ...filters,
            facility_type: value === '' ? undefined : (value as FacilityType),
        })
    }

    const handleStatusChange = (value: string) => {
        onFiltersChange({
            ...filters,
            status: value === '' ? undefined : (value as FacilityStatus),
        })
    }

    const activeFilterCount =
        (filters.search?.length || 0) +
        (filters.facility_type ? 1 : 0) +
        (filters.status ? 1 : 0)

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
                    width: '480px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2
                            style={{
                                fontSize: '20px',
                                fontWeight: '600',
                                color: 'var(--org-text-primary)',
                                margin: 0,
                            }}
                        >
                            Filters
                        </h2>
                        {activeFilterCount > 0 && (
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    background: 'var(--org-btn-primary-bg)',
                                    color: 'var(--org-btn-primary-text)',
                                }}
                            >
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
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
                    {/* Search */}
                    <Input
                        label={t('common.search')}
                        value={localSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={t('admin.facilities.filters.search')}
                    />

                    {/* Facility Type */}
                    <Select
                        label={t('admin.facilities.filters.facilityType')}
                        value={filters.facility_type || ''}
                        onChange={(e) => handleFacilityTypeChange(e.target.value)}
                        options={FACILITY_TYPES}
                    />

                    {/* Status */}
                    <Select
                        label={t('admin.facilities.filters.status')}
                        value={filters.status || ''}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        options={STATUS_OPTIONS}
                    />
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
                    <button
                        onClick={onClearAll}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--org-border-default)',
                            background: 'transparent',
                            color: 'var(--org-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }}
                    >
                        {t('admin.facilities.filters.clearAll')}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: 'var(--org-btn-primary-bg)',
                            color: 'var(--org-btn-primary-text)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }}
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}
