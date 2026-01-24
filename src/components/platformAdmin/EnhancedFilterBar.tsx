/**
 * Enhanced Filter Bar for Feature Catalog
 * 
 * Provides comprehensive filtering with:
 * - Status filter (multi-select)
 * - License tier filter (multi-select)
 * - Role visibility filter (multi-select)
 * - Integration filter (multi-select)
 * - Quantifiable filter (radio)
 * - Source filter (radio)
 */

import { useState, useEffect } from 'react'
import { Select, Checkbox, Button } from './index'

interface EnhancedFilterBarProps {
  // Search
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Status filter (multi-select)
  statusFilter: string[]
  onStatusFilterChange: (values: string[]) => void

  // License tier filter (multi-select)
  tierFilter: string[]
  onTierFilterChange: (values: string[]) => void
  availableTiers: Array<{ id: string; tier_key: string; tier_name: string }>

  // Role visibility filter (multi-select)
  roleFilter: string[]
  onRoleFilterChange: (values: string[]) => void

  // Integration filter (multi-select)
  integrationFilter: string[]
  onIntegrationFilterChange: (values: string[]) => void

  // Quantifiable filter (radio)
  quantifiableFilter: string | null
  onQuantifiableFilterChange: (value: string | null) => void

  // Source filter (radio)
  sourceFilter: string | null
  onSourceFilterChange: (value: string | null) => void

  // Clear all
  onClearAll: () => void
}

const STATUS_OPTIONS = [
  { value: 'Live', label: 'Live' },
  { value: 'Disabled', label: 'Disabled' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Deprecated', label: 'Deprecated' },
  { value: 'Review', label: 'Review' },
]

const ROLE_OPTIONS = [
  { value: 'orgAdmin', label: 'Org Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'guardian', label: 'Guardian' },
]

const INTEGRATION_OPTIONS = [
  { value: 'Stripe', label: 'Stripe' },
  { value: 'Email', label: 'Email' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'Files/Uploads', label: 'Files/Uploads' },
  { value: 'None', label: 'None' },
]

const QUANTIFIABLE_OPTIONS = [
  { value: 'has_limits', label: 'Has Limits' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'configurable', label: 'Configurable per Org' },
  { value: 'global_only', label: 'Global Only' },
]

const SOURCE_OPTIONS = [
  { value: 'auto-discovered', label: 'Auto-discovered' },
  { value: 'manually-created', label: 'Manually Created' },
  { value: 'override-custom', label: 'Override/Custom' },
]

export default function EnhancedFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search features...',
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  availableTiers,
  roleFilter,
  onRoleFilterChange,
  integrationFilter,
  onIntegrationFilterChange,
  quantifiableFilter,
  onQuantifiableFilterChange,
  sourceFilter,
  onSourceFilterChange,
  onClearAll,
}: EnhancedFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Sync local search with prop
  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    onSearchChange(value)
  }

  const handleStatusToggle = (value: string) => {
    if (statusFilter.includes(value)) {
      onStatusFilterChange(statusFilter.filter(v => v !== value))
    } else {
      onStatusFilterChange([...statusFilter, value])
    }
  }

  const handleTierToggle = (tierKey: string) => {
    if (tierFilter.includes(tierKey)) {
      onTierFilterChange(tierFilter.filter(v => v !== tierKey))
    } else {
      onTierFilterChange([...tierFilter, tierKey])
    }
  }

  const handleRoleToggle = (value: string) => {
    if (roleFilter.includes(value)) {
      onRoleFilterChange(roleFilter.filter(v => v !== value))
    } else {
      onRoleFilterChange([...roleFilter, value])
    }
  }

  const handleIntegrationToggle = (value: string) => {
    if (integrationFilter.includes(value)) {
      onIntegrationFilterChange(integrationFilter.filter(v => v !== value))
    } else {
      onIntegrationFilterChange([...integrationFilter, value])
    }
  }

  const hasActiveFilters =
    localSearch !== '' ||
    statusFilter.length > 0 ||
    tierFilter.length > 0 ||
    roleFilter.length > 0 ||
    integrationFilter.length > 0 ||
    quantifiableFilter !== null ||
    sourceFilter !== null

  // Build active filter chips
  const activeFilters: Array<{ key: string; label: string }> = []
  if (statusFilter.length > 0) {
    activeFilters.push({ key: 'status', label: `Status: ${statusFilter.join(', ')}` })
  }
  if (tierFilter.length > 0) {
    const tierNames = tierFilter.map(key => {
      if (key === 'unassigned') return 'Unassigned'
      const tier = availableTiers.find(t => t.tier_key === key)
      return tier ? tier.tier_name : key
    })
    activeFilters.push({ key: 'tier', label: `Tiers: ${tierNames.join(', ')}` })
  }
  if (roleFilter.length > 0) {
    const roleNames = roleFilter.map(r => ROLE_OPTIONS.find(o => o.value === r)?.label || r)
    activeFilters.push({ key: 'role', label: `Roles: ${roleNames.join(', ')}` })
  }
  if (integrationFilter.length > 0) {
    activeFilters.push({ key: 'integration', label: `Integrations: ${integrationFilter.join(', ')}` })
  }
  if (quantifiableFilter) {
    const option = QUANTIFIABLE_OPTIONS.find(o => o.value === quantifiableFilter)
    activeFilters.push({ key: 'quantifiable', label: `Quantifiable: ${option?.label || quantifiableFilter}` })
  }
  if (sourceFilter) {
    const option = SOURCE_OPTIONS.find(o => o.value === sourceFilter)
    activeFilters.push({ key: 'source', label: `Source: ${option?.label || sourceFilter}` })
  }

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case 'status':
        onStatusFilterChange([])
        break
      case 'tier':
        onTierFilterChange([])
        break
      case 'role':
        onRoleFilterChange([])
        break
      case 'integration':
        onIntegrationFilterChange([])
        break
      case 'quantifiable':
        onQuantifiableFilterChange(null)
        break
      case 'source':
        onSourceFilterChange(null)
        break
    }
  }

  return (
    <div className="pa-mb-4">
      {/* Main Filter Row */}
      <div className="pa-flex pa-gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ minWidth: '250px', flex: 1, maxWidth: '400px' }}>
          <div className="pa-form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--pa-n500)',
                  pointerEvents: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  search
                </span>
              </span>
              <input
                type="text"
                className="pa-input"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  paddingLeft: '40px',
                  paddingRight: localSearch ? '40px' : undefined,
                }}
              />
              {localSearch && (
                <button
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--pa-n500)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--pa-radius-xs)',
                  }}
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter (Multi-select dropdown) */}
        <div style={{ minWidth: '150px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <Select
              value={statusFilter.length > 0 ? statusFilter[0] : ''}
              onChange={(e) => {
                const value = e.target.value
                if (value) {
                  if (!statusFilter.includes(value)) {
                    onStatusFilterChange([...statusFilter, value])
                  }
                }
              }}
              options={[
                { value: '', label: 'Status' },
                ...STATUS_OPTIONS.filter(opt => !statusFilter.includes(opt.value)),
              ]}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {showAdvanced ? 'expand_less' : 'expand_more'}
          </span>
          Advanced
        </Button>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div
          className="pa-card pa-mt-3"
          style={{
            padding: 'var(--pa-space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--pa-space-4)',
          }}
        >
          {/* Status Filter (Checkboxes) */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              Status
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              {STATUS_OPTIONS.map(option => (
                <Checkbox
                  key={option.value}
                  checked={statusFilter.includes(option.value)}
                  onChange={() => handleStatusToggle(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          {/* License Tier Filter */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              License Tiers
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              <Checkbox
                checked={tierFilter.includes('unassigned')}
                onChange={() => handleTierToggle('unassigned')}
                label="Unassigned"
              />
              {availableTiers.map(tier => (
                <Checkbox
                  key={tier.id}
                  checked={tierFilter.includes(tier.tier_key)}
                  onChange={() => handleTierToggle(tier.tier_key)}
                  label={tier.tier_name}
                />
              ))}
            </div>
          </div>

          {/* Role Visibility Filter */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              Role Visibility
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              {ROLE_OPTIONS.map(option => (
                <Checkbox
                  key={option.value}
                  checked={roleFilter.includes(option.value)}
                  onChange={() => handleRoleToggle(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          {/* Integration Filter */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              Integrations
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              {INTEGRATION_OPTIONS.map(option => (
                <Checkbox
                  key={option.value}
                  checked={integrationFilter.includes(option.value)}
                  onChange={() => handleIntegrationToggle(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          {/* Quantifiable Filter (Radio) */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              Quantifiable
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              <Checkbox
                checked={quantifiableFilter === null}
                onChange={() => onQuantifiableFilterChange(null)}
                label="All"
              />
              {QUANTIFIABLE_OPTIONS.map(option => (
                <Checkbox
                  key={option.value}
                  checked={quantifiableFilter === option.value}
                  onChange={() => onQuantifiableFilterChange(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          {/* Source Filter (Radio) */}
          <div>
            <label className="pa-label" style={{ marginBottom: 'var(--pa-space-2)' }}>
              Source
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              <Checkbox
                checked={sourceFilter === null}
                onChange={() => onSourceFilterChange(null)}
                label="All"
              />
              {SOURCE_OPTIONS.map(option => (
                <Checkbox
                  key={option.value}
                  checked={sourceFilter === option.value}
                  onChange={() => onSourceFilterChange(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="pa-flex pa-gap-2 pa-mt-3" style={{ flexWrap: 'wrap' }}>
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="pa-badge pa-badge--info"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                paddingRight: '4px',
              }}
            >
              {filter.label}
              <button
                onClick={() => handleRemoveFilter(filter.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  borderRadius: '50%',
                }}
                aria-label={`Remove ${filter.label} filter`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
