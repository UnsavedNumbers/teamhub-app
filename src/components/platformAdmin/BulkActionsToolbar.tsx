/**
 * Bulk Actions Toolbar
 * 
 * Appears when features are selected, providing quick access to bulk operations.
 */

import { Button } from './index'

interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onApplyToTiers: () => void
  onChangeStatus: () => void
  onChangeVisibility: () => void
  onUpdateCategory: () => void
  onEnableAll: () => void
  onDisableAll: () => void
  onSetSystemFeature: () => void
  onSetPlatformOnly: () => void
  onExcludeFromDiscovery: () => void
  onClearSelection: () => void
  onSelectAllPage?: () => void
  onSelectAllResults?: () => void
  isSelectAllPage?: boolean
  isSelectAllResults?: boolean
}

export default function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onApplyToTiers,
  onChangeStatus,
  onChangeVisibility,
  onUpdateCategory,
  onEnableAll,
  onDisableAll,
  onSetSystemFeature,
  onSetPlatformOnly,
  onExcludeFromDiscovery,
  onClearSelection,
  onSelectAllPage,
  onSelectAllResults,
  isSelectAllPage,
  isSelectAllResults,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div
      className="pa-card"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        marginBottom: 'var(--pa-space-4)',
        padding: 'var(--pa-space-3) var(--pa-space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--pa-space-3)',
        borderLeft: '3px solid var(--pa-primary)',
        background: 'var(--pa-primary-bg, rgba(59, 130, 246, 0.1))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-primary)' }}>
            check_circle
          </span>
          <span className="pa-body-m" style={{ fontWeight: 600 }}>
            {selectedCount} {selectedCount === 1 ? 'feature' : 'features'} selected
          </span>
          {!isSelectAllResults && totalCount > selectedCount && (
            <span className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
              ({totalCount} total)
            </span>
          )}
        </div>

        {/* Select all options */}
        {!isSelectAllResults && onSelectAllPage && onSelectAllResults && (
          <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
            <Button
              variant="ghost"
              size="dense"
              onClick={onSelectAllPage}
              disabled={isSelectAllPage}
            >
              Select all on page
            </Button>
            <Button
              variant="ghost"
              size="dense"
              onClick={onSelectAllResults}
              disabled={isSelectAllResults}
            >
              Select all results ({totalCount})
            </Button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', flexWrap: 'wrap' }}>
        {/* Bulk Actions */}
        <Button
          variant="secondary"
          size="dense"
          onClick={onApplyToTiers}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            category
          </span>
          Apply to Tiers
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onChangeStatus}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            toggle_on
          </span>
          Change Status
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onChangeVisibility}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            visibility
          </span>
          Change Visibility
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onUpdateCategory}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            label
          </span>
          Update Category
        </Button>

        <div style={{ width: '1px', height: '24px', background: 'var(--pa-n300)', margin: '0 var(--pa-space-2)' }} />

        <Button
          variant="secondary"
          size="dense"
          onClick={onSetSystemFeature}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            verified
          </span>
          Set as System Feature
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onSetPlatformOnly}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            admin_panel_settings
          </span>
          Set to Platform Only
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onExcludeFromDiscovery}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', color: 'var(--pa-warning)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            block
          </span>
          Not a Feature
        </Button>

        <div style={{ width: '1px', height: '24px', background: 'var(--pa-n300)', margin: '0 var(--pa-space-2)' }} />

        <Button
          variant="secondary"
          size="dense"
          onClick={onEnableAll}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            check
          </span>
          Enable All
        </Button>

        <Button
          variant="secondary"
          size="dense"
          onClick={onDisableAll}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
          Disable All
        </Button>

        <Button
          variant="ghost"
          size="dense"
          onClick={onClearSelection}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
          Clear
        </Button>
      </div>
    </div>
  )
}
