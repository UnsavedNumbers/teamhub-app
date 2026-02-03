/**
 * Add Staff Modal
 * 
 * Modal for adding a new staff member to an organization.
 */

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { 
  Button,
  Input,
  InlineNotice
} from '../../../components/platformAdmin'
import Modal from '../../../components/platformAdmin/Modal'
import type { StaffPermissions } from '../../../types/staffAndFan'
import { DEFAULT_STAFF_PERMISSIONS } from '../../../constants/permissions'
import { useI18n } from '../../../i18n/useI18n'

interface AddStaffModalProps {
  organizationId: string
  onClose: () => void
  onAdd: (userId: string, permissions: StaffPermissions) => Promise<void>
}

export default function AddStaffModal({ organizationId: _organizationId, onClose, onAdd }: AddStaffModalProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; display_name: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS)
  const [adding, setAdding] = useState(false)

  const handleSearch = async () => {
    if (!email.trim()) {
      setError(t('formFields.emailRequired'))
      return
    }

    setSearching(true)
    setError(null)
    setUser(null)

    try {
      const { data, error: searchError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .ilike('email', email.trim())
        .limit(1)
        .single()

      if (searchError || !data) {
        setError(t('admin.staff.userNotFound', 'User not found. Please check the email address.'))
        return
      }

      setUser(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.staff.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!user) return

    setAdding(true)
    setError(null)

    try {
      await onAdd(user.id, permissions)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.staff.errors.addStaffMemberFailed'))
    } finally {
      setAdding(false)
    }
  }

  const togglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('admin.staff.addStaffMember')}
      size="large"
    >
      <div className="pa-space-y-4">
        {!user ? (
          <>
            <div>
              <div className="pa-flex pa-gap-2">
                <div className="pa-flex-1">
                  <Input
                    type="email"
                    label={t('formFields.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('formFields.emailPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch()
                    }}
                  />
                </div>
                <div className="pa-flex pa-items-end">
                <Button
                  variant="primary"
                  onClick={handleSearch}
                  disabled={searching || !email.trim()}
                >
                  {searching ? (
                    <>
                      <span className="material-symbols-outlined animate-spin inline-block mr-1">hourglass_empty</span>
                      {t('common.searching')}
                    </>
                  ) : (
                    t('common.search')
                  )}
                </Button>
                </div>
              </div>
            </div>

            {error && (
              <InlineNotice tone="error" title={error} onClose={() => setError(null)} />
            )}
          </>
        ) : (
          <>
            <InlineNotice
              tone="success"
              title={t('admin.staff.userFound', { name: user.display_name || user.email })}
            />

            <div>
              <label className="pa-label pa-mb-2">{t('admin.staff.permissions')}</label>
              <div className="pa-space-y-2">
                {Object.entries(DEFAULT_STAFF_PERMISSIONS).map(([key, defaultValue]) => (
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
              <Button variant="ghost" onClick={() => { setUser(null); setEmail(''); setError(null) }}>
                {t('common.goBack')}
              </Button>
              <Button variant="primary" onClick={handleAdd} disabled={adding}>
                {adding ? (
                  <>
                    <span className="material-symbols-outlined animate-spin inline-block mr-1">hourglass_empty</span>
                    {t('common.adding')}
                  </>
                ) : (
                  t('admin.staff.addStaffMember')
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
