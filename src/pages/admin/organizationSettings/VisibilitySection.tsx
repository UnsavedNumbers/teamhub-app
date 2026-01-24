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
import { Button, Checkbox } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Visibility Settings</h3>
        <p className="text-sm text-gray-500">
          Configure what each role can view and edit across the organization
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            Settings saved successfully!
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Permission
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSIONS.map((permission) => (
                  <tr key={permission.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-slate-900">{permission.label}</td>
                    {ROLES.map((role) => (
                      <td key={role} className="py-4 px-6 text-center">
                        <Checkbox
                          checked={rolePermissions?.[role]?.[permission.key] ?? false}
                          onChange={() => togglePermission(role, permission.key)}
                          label=""
                          disabled={role === 'admin'} // Admins always have all permissions
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Administrators always have full permissions and cannot be
            restricted. These settings apply organization-wide and override team-specific
            permissions.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
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

