/**
 * Staff Permission Editor
 * 
 * Modal for editing staff member permissions.
 */

import { useState, useEffect } from 'react'
import { 
  Button,
  InlineNotice
} from '../../../components/platformAdmin'
import Modal from '../../../components/platformAdmin/Modal'
import type { StaffMember, StaffPermissions } from '../../../types/staffAndFan'
import { DEFAULT_STAFF_PERMISSIONS } from '../../../constants/permissions'
import { useI18n } from '../../../i18n/useI18n'

interface StaffPermissionEditorProps {
  staffMember: StaffMember
  onClose: () => void
  onSave: (permissions: StaffPermissions) => Promise<void>
}

export default function StaffPermissionEditor({ 
  staffMember, 
  onClose, 
  onSave 
}: StaffPermissionEditorProps) {
  const { t } = useI18n()
  const tAny = t as any
  const [permissions, setPermissions] = useState<StaffPermissions>(
    staffMember.permissions || DEFAULT_STAFF_PERMISSIONS
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPermissions(staffMember.permissions || DEFAULT_STAFF_PERMISSIONS)
  }, [staffMember])

  const togglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      await onSave(permissions)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : tAny('admin.staff.errors.updateStaffPermissionsFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={tAny('admin.staff.editPermissionsTitle', { 
        name: staffMember.user?.display_name || staffMember.user?.email || tAny('admin.staff.staffMember')
      })}
      size="medium"
    >
      <div className="pa-space-y-4">
        <div>
          <label className="pa-label pa-mb-2">{tAny('admin.staff.permissions')}</label>
          <div className="pa-space-y-2">
            {Object.entries(DEFAULT_STAFF_PERMISSIONS).map(([key, _defaultValue]) => (
              <label
                key={key}
                className="pa-flex pa-items-center pa-gap-2"
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={permissions[key as keyof StaffPermissions] || false}
                  onChange={() => togglePermission(key as keyof StaffPermissions)}
                  className="pa-checkbox"
                />
                <span className="pa-body-m">
                  {key.replace('can_', '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <InlineNotice tone="error" title={error} onClose={() => setError(null)} />
        )}

        <div className="pa-flex pa-gap-2 pa-justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {tAny('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin inline-block mr-1">hourglass_empty</span>
                {tAny('common.saving')}
              </>
            ) : (
              tAny('admin.staff.savePermissions')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

