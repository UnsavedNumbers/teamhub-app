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
import DemoOrgForm from '@/components/platformAdmin/DemoOrgForm'
import POCManager from '@/components/platformAdmin/POCManager'
import InitiateDemoDialog from '@/components/platformAdmin/InitiateDemoDialog'
import {
  getDemoOrg,
  listPOCs,
  updateDemoOrg,
} from '@/data/services/demoOrgService'
import {
  extendDemoCodeExpiration,
  listDemoCodesForOrg,
  revokeDemoCode,
} from '@/data/services/demoCodeService'
import type { CreateDemoOrgInput, DemoCode, DemoOrgPOC, DemoOrganization } from '@/types/demoManagement'
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
              {primaryPoc ? `${primaryPoc.first_name} ${primaryPoc.last_name}` : t('platformAdmin.demoManagement.table.none')}
            </div>
          </div>
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
    </div>
  )
}
