/**
 * SubOrgInviteForm Component
 * 
 * Reusable form for inviting a sub-organization admin.
 * Used both inline on the Sub Orgs tab and in a modal after creating a new org admin.
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useI18n } from '../../i18n/useI18n'
import { useUserContext } from '../../hooks/useUserContext'
import { getOrganizationUsers, type OrgUser } from '../../data/services/usersService'
import { sendSubOrgSetupInstructions } from '../../data/services/subOrgService'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess } from '../../utils/toast'
import { Input, Select, InlineNotice, Button } from './index'
import { cn } from '../../utils/cn'

export interface SubOrgInviteFormProps {
  parentOrgId: string
  publicOrgUrl: string
  defaultSelectedAdminUserId?: string
  lockedAdminSelection?: boolean
  renderMode?: 'inline' | 'modal'
  onSubmitted?: () => void
}

interface FormData {
  adminUserId: string
  subOrgName: string
  note: string
}

/**
 * Format user display name from display_name or email
 */
function formatUserName(user: OrgUser): string {
  if (user.display_name) {
    return user.display_name
  }
  return user.email || ''
}

/**
 * Split display name into first and last name
 */
function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return { first: parts[0], last: '' }
  }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export function SubOrgInviteForm({
  parentOrgId,
  publicOrgUrl,
  defaultSelectedAdminUserId,
  lockedAdminSelection = false,
  renderMode = 'inline',
  onSubmitted,
}: SubOrgInviteFormProps) {
  const { t } = useI18n()
  const { context, isReady } = useUserContext()
  const [eligibleAdmins, setEligibleAdmins] = useState<OrgUser[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<OrgUser | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      adminUserId: defaultSelectedAdminUserId || '',
      subOrgName: '',
      note: '',
    },
  })

  const watchedAdminUserId = watch('adminUserId')

  // Fetch eligible org admins
  useEffect(() => {
    if (!isReady || !context) {
      return
    }

    const fetchAdmins = async () => {
      setLoadingAdmins(true)
      try {
        const { data, error } = await getOrganizationUsers(context)
        if (error) {
          setSubmitError(error.message || t('admin.subOrgs.invite.error.loadingAdmins'))
          setEligibleAdmins([])
          return
        }

        // Filter: org_admin role, exclude current user
        const eligible = (data || []).filter(
          (user) => user.roles.includes('org_admin') && user.id !== context.userId
        )

        // Sort alphabetically by display_name or email
        eligible.sort((a, b) => {
          const aName = (a.display_name || a.email || '').toLowerCase()
          const bName = (b.display_name || b.email || '').toLowerCase()
          return aName.localeCompare(bName)
        })

        setEligibleAdmins(eligible)

        // Preselect if exactly one eligible admin and no default provided
        if (eligible.length === 1 && !defaultSelectedAdminUserId) {
          setValue('adminUserId', eligible[0].id)
          setSelectedAdmin(eligible[0])
        } else if (defaultSelectedAdminUserId) {
          const defaultAdmin = eligible.find((u) => u.id === defaultSelectedAdminUserId)
          if (defaultAdmin) {
            setSelectedAdmin(defaultAdmin)
          }
        }
      } catch (err) {
        setSubmitError(getErrorMessage(err) || t('admin.subOrgs.invite.error.loadingAdmins'))
        setEligibleAdmins([])
      } finally {
        setLoadingAdmins(false)
      }
    }

    fetchAdmins()
  }, [isReady, context, defaultSelectedAdminUserId, setValue, t])

  // Update selectedAdmin when adminUserId changes
  useEffect(() => {
    if (watchedAdminUserId && eligibleAdmins.length > 0) {
      const admin = eligibleAdmins.find((u) => u.id === watchedAdminUserId)
      setSelectedAdmin(admin || null)
    } else {
      setSelectedAdmin(null)
    }
  }, [watchedAdminUserId, eligibleAdmins])

  const onSubmit = async (data: FormData) => {
    if (!context || !selectedAdmin) {
      setSubmitError(t('admin.subOrgs.invite.error.noAdminSelected'))
      return
    }

    // Validate publicOrgUrl is not empty
    if (!publicOrgUrl || publicOrgUrl.trim() === '') {
      setSubmitError(t('admin.subOrgs.invite.error.noPublicUrl'))
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Trim and validate sub org name
      const trimmedName = data.subOrgName.trim()
      if (trimmedName.length < 2) {
        setSubmitError(t('admin.subOrgs.invite.error.nameTooShort'))
        setSubmitting(false)
        return
      }
      if (trimmedName.length > 100) {
        setSubmitError(t('admin.subOrgs.invite.error.nameTooLong'))
        setSubmitting(false)
        return
      }

      const result = await sendSubOrgSetupInstructions({
        inviterUserId: context.userId,
        invitedAdminUserId: selectedAdmin.id,
        parentOrgId,
        subOrgName: trimmedName,
        publicOrgUrl,
        note: data.note.trim() || undefined,
      })

      if (result.error) {
        const errorMsg = result.error.message || t('admin.subOrgs.invite.error.sendFailed')
        console.error('Sub-org invite form submission failed:', {
          parentOrgId,
          selectedAdmin: selectedAdmin.id,
          subOrgName: trimmedName,
          error: errorMsg,
        })
        setSubmitError(errorMsg)
        setSubmitting(false)
        return
      }

      // Success
      const adminName = formatUserName(selectedAdmin)
      const nameParts = splitName(adminName)
      const firstName = nameParts.first || selectedAdmin.email?.split('@')[0] || 'User'
      showSuccess(t('admin.subOrgs.invite.success.sent', { name: firstName }))

      // Reset form
      setValue('subOrgName', '')
      setValue('note', '')

      // Call callback if provided
      if (onSubmitted) {
        onSubmitted()
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err) || t('admin.subOrgs.invite.error.sendFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const isModal = renderMode === 'modal'
  const wrapperClass = isModal ? '' : 'oa-space-y-4'

  return (
    <div className={wrapperClass}>
      {submitError && (
        <InlineNotice tone="error" message={submitError} className="oa-mb-4" />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="oa-space-y-4">
        {/* Admin Selection */}
        {!lockedAdminSelection ? (
          <Controller
            name="adminUserId"
            control={control}
            rules={{
              required: t('admin.subOrgs.invite.fields.admin.required'),
            }}
            render={({ field }) => (
              <div>
                <Select
                  {...field}
                  label={t('admin.subOrgs.invite.fields.admin.label')}
                  required
                  disabled={loadingAdmins || submitting}
                  error={errors.adminUserId?.message}
                  options={
                    loadingAdmins
                      ? [{ value: '', label: t('common.loading') }]
                      : eligibleAdmins.length === 0
                        ? [{ value: '', label: t('admin.subOrgs.invite.fields.admin.noAdmins') }]
                        : eligibleAdmins.map((admin) => {
                            const displayName = formatUserName(admin)
                            return {
                              value: admin.id,
                              label: displayName,
                            }
                          })
                  }
                />
                {selectedAdmin && (
                  <p className="oa-helper oa-mt-1 oa-text-xs">
                    {selectedAdmin.email}
                  </p>
                )}
              </div>
            )}
          />
        ) : (
          <div>
            <label className="oa-label">{t('admin.subOrgs.invite.fields.admin.label')}</label>
            <div className="oa-input" style={{ backgroundColor: 'var(--oa-surface-subtle)', cursor: 'not-allowed' }}>
              {selectedAdmin ? formatUserName(selectedAdmin) : t('common.loading')}
            </div>
            {selectedAdmin && (
              <p className="oa-helper oa-mt-1 oa-text-xs">
                {selectedAdmin.email}
              </p>
            )}
          </div>
        )}

        {/* Sub Organization Name */}
        <Controller
          name="subOrgName"
          control={control}
          rules={{
            required: t('admin.subOrgs.invite.fields.name.required'),
            validate: (value) => {
              const trimmed = value.trim()
              if (trimmed.length < 2) {
                return t('admin.subOrgs.invite.fields.name.tooShort')
              }
              if (trimmed.length > 100) {
                return t('admin.subOrgs.invite.fields.name.tooLong')
              }
              return true
            },
          }}
          render={({ field }) => (
            <Input
              {...field}
              label={t('admin.subOrgs.invite.fields.name.label')}
              required
              disabled={submitting}
              error={errors.subOrgName?.message}
              helper={t('admin.subOrgs.invite.fields.name.helper')}
              maxLength={100}
            />
          )}
        />

        {/* Note */}
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <div className="oa-form-group">
              <label className="oa-label">{t('admin.subOrgs.invite.fields.note.label')}</label>
              <textarea
                {...field}
                rows={4}
                disabled={submitting}
                className={cn('oa-input')}
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
              <p className="oa-helper">{t('admin.subOrgs.invite.fields.note.helper')}</p>
            </div>
          )}
        />

        {/* Submit Button */}
        <div className={cn('oa-flex', isModal ? 'oa-justify-end oa-gap-3' : 'oa-justify-start')}>
          <Button
            type="submit"
            disabled={submitting || loadingAdmins || eligibleAdmins.length === 0}
            loading={submitting}
          >
            {t('admin.subOrgs.invite.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SubOrgInviteForm
