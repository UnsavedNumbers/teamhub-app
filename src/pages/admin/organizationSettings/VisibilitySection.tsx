/**
 * Visibility Settings Section
 *
 * Configure role-based permissions for viewing organization data.
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserContext } from '../../../hooks/useUserContext'
import { updateVisibilitySettings } from '../../../data/services/organizationSettingsService'
import type { VisibilitySettings } from '../../../types/organizationSettings'
import { Button, Checkbox, Card } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'
import { cn } from '../../../utils/cn'

const ROLES = ['admin', 'coach', 'parent'] as const
const PERMISSIONS = [
  { key: 'can_view_roster', label: 'View Roster' },
  { key: 'can_view_schedule', label: 'View Schedule' },
  { key: 'can_view_attendance', label: 'View Attendance' },
  { key: 'can_view_payments', label: 'View Payments' },
  { key: 'can_view_messages', label: 'View Messages' },
  { key: 'can_edit', label: 'Edit Data' },
] as const

const formSchema = z.object({
  role_permissions: z.record(
    z.string(),
    z.object({
      can_view_roster: z.boolean(),
      can_view_schedule: z.boolean(),
      can_view_attendance: z.boolean(),
      can_view_payments: z.boolean(),
      can_view_messages: z.boolean(),
      can_edit: z.boolean(),
    })
  ),
})

type FormData = z.infer<typeof formSchema>

interface VisibilitySectionProps {
  settings: VisibilitySettings
  isSaving: boolean
  onSaveStart: () => void
  onSaveEnd: () => void
  onSettingsUpdated: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

export default function VisibilitySection({
  settings,
  isSaving,
  onSaveStart,
  onSaveEnd,
  onSettingsUpdated,
  onDirtyChange,
}: VisibilitySectionProps) {
  const { context } = useUserContext()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const defaultRolePermissions = useMemo(
    () =>
      settings.role_permissions || {
        admin: {
          can_view_roster: true,
          can_view_schedule: true,
          can_view_attendance: true,
          can_view_payments: true,
          can_view_messages: true,
          can_edit: true,
        },
        coach: {
          can_view_roster: true,
          can_view_schedule: true,
          can_view_attendance: true,
          can_view_payments: false,
          can_view_messages: true,
          can_edit: false,
        },
        parent: {
          can_view_roster: false,
          can_view_schedule: true,
          can_view_attendance: true,
          can_view_payments: true,
          can_view_messages: true,
          can_edit: false,
        },
      },
    [settings.role_permissions]
  )

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role_permissions: defaultRolePermissions,
    },
  })

  const rolePermissions = watch('role_permissions')

  // Track dirty state
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset form when settings change
  useEffect(() => {
    reset({
      role_permissions: defaultRolePermissions,
    })
  }, [settings, reset, defaultRolePermissions])

  const togglePermission = (role: string, permission: string) => {
    const currentPerms = rolePermissions?.[role] as any
    const currentValue = currentPerms?.[permission] ?? false
    setValue(`role_permissions.${role}.${permission}` as any, !currentValue, { shouldDirty: true })
  }

  const onSubmit = async (data: FormData) => {
    if (!context) return

    setSaving(true)
    setError(null)
    setSuccess(false)
    onSaveStart()

    try {
      const { error: updateError } = await updateVisibilitySettings(
        context,
        {
          role_permissions: data.role_permissions,
        },
        settings.updated_at
      )

      if (updateError) throw updateError

      showSuccess('Visibility settings updated successfully!')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      await onSettingsUpdated()
    } catch (err) {
      console.error('Error saving visibility settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSaving(false)
      onSaveEnd()
    }
  }

  return (
    <div className="oa-flex oa-flex-col oa-gap-6">
      <div>
        <h3 className="oa-h3 oa-mb-1">Visibility Settings</h3>
        <p className="oa-body-m oa-text-muted">
          Configure what each role can view and edit across the organization
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="oa-flex oa-flex-col oa-gap-6">
        {error && (
          <div className="oa-alert oa-alert--danger">
            {error}
          </div>
        )}

        {success && (
          <div className="oa-alert oa-alert--success">
            Settings saved successfully!
          </div>
        )}

        <Card noPadding style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="oa-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: 'var(--oa-space-4) var(--oa-space-6)', textAlign: 'left', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--oa-n500)' }}>
                    Permission
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      style={{ padding: 'var(--oa-space-4) var(--oa-space-6)', textAlign: 'center', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--oa-n500)' }}
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((permission) => (
                  <tr key={permission.key}>
                    <td style={{ padding: 'var(--oa-space-4) var(--oa-space-6)', fontWeight: 500 }}>{permission.label}</td>
                    {ROLES.map((role) => (
                      <td key={role} style={{ padding: 'var(--oa-space-4) var(--oa-space-6)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Checkbox
                            checked={rolePermissions?.[role]?.[permission.key] ?? false}
                            onChange={() => togglePermission(role, permission.key)}
                            label=""
                            disabled={role === 'admin'} // Admins always have all permissions
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className={cn('oa-p-4', 'oa-rounded-lg')} style={{ background: 'var(--oa-info-bg, #eff6ff)', border: '1px solid var(--oa-info-border, #bfdbfe)' }}>
          <p className="oa-body-s" style={{ color: 'var(--oa-info-text, #1e40af)' }}>
            <strong>Note:</strong> Administrators always have full permissions and cannot be
            restricted. These settings apply organization-wide and override team-specific
            permissions.
          </p>
        </div>

        <div className={cn('oa-flex', 'oa-justify-end', 'oa-gap-3', 'oa-pt-4')} style={{ borderTop: '1px solid var(--oa-n100)' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            Reset
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty || isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
