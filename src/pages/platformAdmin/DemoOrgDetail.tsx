import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/platformAdmin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import DemoOrgForm from '@/components/platformAdmin/DemoOrgForm'
import POCManager from '@/components/platformAdmin/POCManager'
import InitiateDemoDialog from '@/components/platformAdmin/InitiateDemoDialog'
import {
  getDemoOrg,
  listPOCs,
  updateDemoOrg,
  deleteDemoOrg,
} from '@/data/services/demoOrgService'
import {
  extendDemoCodeExpiration,
  listDemoCodesForOrg,
  revokeDemoCode,
} from '@/data/services/demoCodeService'
import { sendApprovalEmail } from '@/services/demoResultWebhookService'
import type { CreateDemoOrgInput, DemoAllowedRole, DemoCode, DemoOrgPOC, DemoOrganization } from '@/types/demoManagement'
import { getLink } from '@/utils/routes'
import { useI18n } from '@/i18n/useI18n'

export default function DemoOrgDetail() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [organization, setOrganization] = useState<DemoOrganization | null>(null)
  const [pocs, setPocs] = useState<DemoOrgPOC[]>([])
  const [codes, setCodes] = useState<DemoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [initiateOpen, setInitiateOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false)
  const [_resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [allowedRolesEditing, setAllowedRolesEditing] = useState(false)
  const [allowedRolesSaving, setAllowedRolesSaving] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<DemoAllowedRole[]>([])

  const orgId = id ?? ''

  const loadData = useCallback(async () => {
    if (!orgId) {
      setError(t('platformAdmin.demoManagement.detail.invalidId'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [org, pocRows, codeRows] = await Promise.all([
        getDemoOrg(orgId),
        listPOCs(orgId),
        listDemoCodesForOrg(orgId),
      ])

      setOrganization(org)
      setPocs(pocRows)
      setCodes(codeRows)
      // Initialize selected roles from org's allowed_roles (default to all if not set)
      setSelectedRoles(org.allowed_roles ?? ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan'])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.loadFailed'))
      setOrganization(null)
      setPocs([])
      setCodes([])
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const primaryPoc = useMemo(() => pocs.find((poc) => poc.is_primary) ?? pocs[0] ?? null, [pocs])

  const handleEditSubmit = async (input: CreateDemoOrgInput): Promise<void> => {
    if (!organization) return

    setFormLoading(true)
    setError(null)

    try {
      await updateDemoOrg(organization.id, input)
      setFormOpen(false)
      await loadData()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleRevokeCode = async (code: DemoCode): Promise<void> => {
    try {
      await revokeDemoCode(code.demo_code)
      await loadData()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    }
  }

  const handleExtendCode = async (code: DemoCode): Promise<void> => {
    try {
      const nextDate = new Date(code.expires_at)
      nextDate.setDate(nextDate.getDate() + 7)
      await extendDemoCodeExpiration(code.demo_code, nextDate)
      await loadData()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!organization) return

    setDeleteLoading(true)
    setError(null)

    try {
      await deleteDemoOrg(organization.id)
      navigate(getLink('platformAdmin.demoManagement.list'))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.deleteFailed'))
      setDeleteLoading(false)
    }
  }

  const handleResendApprovalEmail = async (): Promise<void> => {
    if (!organization) return

    setResendLoading(true)
    setError(null)
    setResendSuccess(null)

    try {
      const activeCode = codes.find((code) => code.status === 'active')
      if (!activeCode) {
        setError(t('platformAdmin.demoManagement.resendApprovalEmail.noActiveCode'))
        setResendLoading(false)
        return
      }

      const result = await sendApprovalEmail(organization.id, activeCode.demo_code, primaryPoc, organization)
      if (result.success) {
        setResendSuccess(t('platformAdmin.demoManagement.resendApprovalEmail.success'))
      } else {
        setError(result.statusCode 
          ? t('platformAdmin.demoManagement.resendApprovalEmail.errorWithStatus', { status: result.statusCode })
          : t('platformAdmin.demoManagement.resendApprovalEmail.error'))
      }
      setResendConfirmOpen(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('platformAdmin.demoManagement.resendApprovalEmail.error'))
    } finally {
      setResendLoading(false)
    }
  }

  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  if (error || !organization) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.demoManagement.list'))}>
          {t('common.back')}
        </Button>
        <div className="pa-text-danger">{error ?? t('common.error.notFound')}</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={organization.name}
        subtitle={t('platformAdmin.demoManagement.detail.subtitle')}
      />

      <div className="pa-flex pa-gap-2 pa-mb-4">
        <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.demoManagement.list'))}>
          {t('common.backToList')}
        </Button>
        <Button onClick={() => setFormOpen(true)}>{t('common.edit')}</Button>
      </div>

      {error && <div className="pa-text-danger pa-mb-3">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('platformAdmin.demoManagement.detail.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="pocs">{t('platformAdmin.demoManagement.detail.tabs.pocs')}</TabsTrigger>
          <TabsTrigger value="codes">{t('platformAdmin.demoManagement.detail.tabs.codes')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="pa-card pa-stack" style={{ gap: 'var(--pa-space-2)' }}>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.name')}:</strong> {organization.name}</div>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.city')}:</strong> {organization.city ?? '-'}</div>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.state')}:</strong> {organization.state ?? '-'}</div>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.country')}:</strong> {organization.country}</div>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.timezone')}:</strong> {organization.timezone}</div>
            <div><strong>{t('platformAdmin.demoManagement.form.fields.sports')}:</strong> {organization.sports_sponsored.join(', ')}</div>
            <div>
              <strong>{t('platformAdmin.demoManagement.table.primaryPoc')}:</strong>{' '}
              {primaryPoc ? `${primaryPoc.first_name} ${primaryPoc.last_name}`.trim() || '—' : t('platformAdmin.demoManagement.table.none')}
            </div>
            {primaryPoc && (
              <>
                <div>
                  <strong>{t('platformAdmin.demoManagement.pocs.fields.email')}:</strong>{' '}
                  {primaryPoc.email || '—'}
                </div>
                <div>
                  <strong>{t('platformAdmin.demoManagement.pocs.fields.phone')}:</strong>{' '}
                  {primaryPoc.phone || '—'}
                </div>
              </>
            )}
          </div>

          {/* Allowed Roles Section */}
          <div className="pa-card pa-mt-4 pa-stack" style={{ gap: 'var(--pa-space-2)' }}>
            <div className="pa-flex pa-items-center pa-justify-between">
              <div>
                <strong>{t('platformAdmin.demoManagement.detail.allowedRoles.title')}</strong>
                <div className="pa-text-sm pa-text-muted">
                  {t('platformAdmin.demoManagement.detail.allowedRoles.description')}
                </div>
              </div>
              {!allowedRolesEditing && (
                <Button variant="ghost" size="small" onClick={() => setAllowedRolesEditing(true)}>
                  {t('common.edit')}
                </Button>
              )}
            </div>

            {allowedRolesEditing ? (
              <div className="pa-stack" style={{ gap: 'var(--pa-space-2)' }}>
                {(['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan'] as DemoAllowedRole[]).map((role) => {
                  const roleLabels: Record<DemoAllowedRole, string> = {
                    org_admin: t('platformAdmin.demoManagement.detail.allowedRoles.orgAdmin'),
                    coach: t('platformAdmin.demoManagement.detail.allowedRoles.coach'),
                    parent: t('platformAdmin.demoManagement.detail.allowedRoles.guardian'),
                    athlete: t('platformAdmin.demoManagement.detail.allowedRoles.athlete'),
                    staff: t('platformAdmin.demoManagement.detail.allowedRoles.volunteer'),
                    fan: t('platformAdmin.demoManagement.detail.allowedRoles.fan'),
                  }
                  return (
                    <label key={role} className="pa-flex pa-items-center pa-gap-2 pa-cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role])
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role))
                          }
                        }}
                        className="pa-checkbox"
                      />
                      <span>{roleLabels[role]}</span>
                    </label>
                  )
                })}
                <div className="pa-flex pa-gap-2 pa-mt-2">
                  <Button
                    size="small"
                    onClick={async () => {
                      if (!organization) return
                      setAllowedRolesSaving(true)
                      try {
                        await updateDemoOrg(organization.id, { allowed_roles: selectedRoles })
                        setAllowedRolesEditing(false)
                        await loadData()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : t('common.error.updateFailed'))
                      } finally {
                        setAllowedRolesSaving(false)
                      }
                    }}
                    disabled={allowedRolesSaving || selectedRoles.length === 0}
                  >
                    {allowedRolesSaving ? t('common.saving') : t('common.save')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => {
                      setAllowedRolesEditing(false)
                      setSelectedRoles(organization.allowed_roles ?? ['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan'])
                    }}
                    disabled={allowedRolesSaving}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pa-text-sm">
                {selectedRoles.length > 0 ? (
                  <div className="pa-flex pa-flex-wrap pa-gap-2">
                    {selectedRoles.map((role) => {
                      const roleLabels: Record<DemoAllowedRole, string> = {
                        org_admin: t('platformAdmin.demoManagement.detail.allowedRoles.orgAdmin'),
                        coach: t('platformAdmin.demoManagement.detail.allowedRoles.coach'),
                        parent: t('platformAdmin.demoManagement.detail.allowedRoles.guardian'),
                        athlete: t('platformAdmin.demoManagement.detail.allowedRoles.athlete'),
                        staff: t('platformAdmin.demoManagement.detail.allowedRoles.volunteer'),
                        fan: t('platformAdmin.demoManagement.detail.allowedRoles.fan'),
                      }
                      return (
                        <span key={role} className="pa-badge pa-badge-secondary">
                          {roleLabels[role]}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="pa-text-muted">{t('platformAdmin.demoManagement.detail.allowedRoles.none')}</span>
                )}
              </div>
            )}
          </div>

          <div className="pa-mt-4 pa-flex pa-gap-2">
            {organization.status === 'active' && codes.some((code) => code.status === 'active') && (
              <Button
                onClick={() => setResendConfirmOpen(true)}
              >
                {t('platformAdmin.demoManagement.resendApprovalEmail.button')}
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {t('common.delete')}
            </Button>
          </div>

          {resendSuccess && (
            <div className="pa-mt-4 pa-p-3 pa-bg-green-50 pa-text-green-800 pa-rounded">
              {resendSuccess}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pocs">
          <POCManager orgId={organization.id} />
        </TabsContent>

        <TabsContent value="codes">
          <div className="pa-flex pa-justify-end pa-mb-3">
            <Button onClick={() => setInitiateOpen(true)} icon="bolt">
              {t('platformAdmin.demoManagement.codes.actions.initiate')}
            </Button>
          </div>

          {codes.length === 0 ? (
            <div>{t('platformAdmin.demoManagement.codes.empty')}</div>
          ) : (
            <div className="pa-stack" style={{ gap: 'var(--pa-space-2)' }}>
              {codes.map((code) => (
                <div key={code.id} className="pa-card pa-flex pa-justify-between pa-items-center">
                  <div>
                    <div className="pa-text-strong">{code.demo_code}</div>
                    <div>{t('platformAdmin.demoManagement.codes.statusLabel')}: {code.status}</div>
                    <div>{t('platformAdmin.demoManagement.codes.expiresLabel')}: {new Date(code.expires_at).toLocaleString()}</div>
                  </div>
                  <div className="pa-flex pa-gap-2">
                    <Button variant="ghost" size="dense" onClick={() => void handleExtendCode(code)}>
                      {t('platformAdmin.demoManagement.codes.actions.extend')}
                    </Button>
                    <Button variant="ghost" size="dense" onClick={() => void handleRevokeCode(code)}>
                      {t('platformAdmin.demoManagement.codes.actions.revoke')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DemoOrgForm
        open={formOpen}
        initialValue={organization}
        loading={formLoading}
        error={error}
        onClose={() => setFormOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <InitiateDemoDialog
        open={initiateOpen}
        orgId={organization.id}
        pocs={pocs}
        onClose={() => setInitiateOpen(false)}
        onCreated={() => {
          void loadData()
        }}
      />

      <ConfirmDialog
        open={resendConfirmOpen}
        title={t('platformAdmin.demoManagement.resendApprovalEmail.title')}
        description={t('platformAdmin.demoManagement.resendApprovalEmail.description')}
        confirmLabel={t('platformAdmin.demoManagement.resendApprovalEmail.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleResendApprovalEmail}
        onCancel={() => setResendConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('platformAdmin.demoManagement.delete.title')}
        description={t('platformAdmin.demoManagement.delete.description', { name: organization.name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        variant="danger"
      >
        {deleteLoading && <div>{t('common.loading')}</div>}
      </ConfirmDialog>
    </div>
  )
}
