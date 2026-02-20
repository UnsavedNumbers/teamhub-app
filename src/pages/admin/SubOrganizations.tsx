/**
 * Sub-Organizations Management Page
 * 
 * Parent org admin page for managing sub-organizations:
 * - List sub-orgs
 * - Approve/reject registration requests
 * - Manage sub-org settings (sports, features, status)
 * - Configure global parent settings
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useI18n } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import {
  Button,
  Card,
  Badge,
  Input,
  Checkbox,
} from '../../components/admin'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/platformAdmin'
import {
  getSubOrgs,
  getSubOrgRequests,
  updateSubOrgSettings,
  getParentSubConfig,
  updateParentSubConfig,
  approveSubOrgRequest,
  rejectSubOrgRequest,
  type SubOrgWithSettings,
  type SubOrgRequest,
  type ParentOrgSubConfig,
} from '../../data/services/subOrgService'
import { showSuccess, showError } from '../../utils/toast'
import { getErrorMessage } from '../../utils/errorUtils'
import { SPORT_NAMES, type SportCode } from '../../types/sports'
import '../../styles/orgAdmin.css'

export default function SubOrganizations() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'sub-orgs' | 'requests' | 'settings'>('sub-orgs')

  const orgId = currentOrganization?.id

  // Check if this is a parent org (not a sub-org)
  const { data: orgData } = useQuery({
    queryKey: ['org-parent-check', orgId],
    queryFn: async () => {
      if (!orgId) return null
      const { data } = await supabase
        .from('organizations')
        .select('parent_org_id')
        .eq('id', orgId)
        .maybeSingle()
      return data
    },
    enabled: !!orgId,
  })

  const isSubOrg = orgData?.parent_org_id != null

  // Redirect sub-orgs (they can't manage sub-orgs)
  useEffect(() => {
    if (isSubOrg) {
      navigate('/admin/organization', { replace: true })
    }
  }, [isSubOrg, navigate])

  if (isSubOrg) {
    return null // Will redirect
  }

  // Get sub-orgs
  const { data: subOrgsData, isLoading: subOrgsLoading } = useQuery({
    queryKey: ['sub-orgs', orgId],
    queryFn: () => getSubOrgs(orgId!),
    enabled: !!orgId,
    select: (result) => result.data,
  })

  // Get pending requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['sub-org-requests', orgId, 'pending'],
    queryFn: () => getSubOrgRequests(orgId!, 'pending'),
    enabled: !!orgId,
    select: (result) => result.data,
  })

  // Get parent config
  const { data: parentConfig } = useQuery({
    queryKey: ['parent-sub-config', orgId],
    queryFn: () => getParentSubConfig(orgId!),
    enabled: !!orgId,
    select: (result) => result.data,
  })

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: approveSubOrgRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-org-requests', orgId] })
      queryClient.invalidateQueries({ queryKey: ['sub-orgs', orgId] })
      showSuccess('Sub-organization approved successfully')
    },
    onError: (err) => {
      showError(getErrorMessage(err))
    },
  })

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectSubOrgRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-org-requests', orgId] })
      showSuccess(t('admin.subOrgs.messages.rejected'))
    },
    onError: (err) => {
      showError(getErrorMessage(err))
    },
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: ({ subOrgId, settings }: { subOrgId: string; settings: any }) =>
      updateSubOrgSettings(subOrgId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-orgs', orgId] })
      showSuccess(t('admin.subOrgs.messages.settingsUpdated'))
    },
    onError: (err) => {
      showError(getErrorMessage(err))
    },
  })

  // Update parent config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (config: any) => updateParentSubConfig(orgId!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-sub-config', orgId] })
      showSuccess(t('admin.subOrgs.messages.settingsSaved'))
    },
    onError: (err) => {
      showError(getErrorMessage(err))
    },
  })

  if (!orgId) {
    return <div>No organization selected</div>
  }

  const subOrgs = subOrgsData || []
  const requests = requestsData || []

  return (
    <div className="admin-page">
      <AdminPageHeader
        title={t('admin.subOrgs.title')}
        subtitle={t('admin.subOrgs.subtitle')}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="sub-orgs">
            {t('admin.subOrgs.tabs.subOrgs')} ({subOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('admin.subOrgs.tabs.requests')} ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="settings">{t('admin.subOrgs.tabs.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="sub-orgs">
          <SubOrgsList
            subOrgs={subOrgs}
            loading={subOrgsLoading}
            onUpdateSettings={(subOrgId, settings) =>
              updateSettingsMutation.mutate({ subOrgId, settings })
            }
          />
        </TabsContent>

        <TabsContent value="requests">
          <RequestsList
            requests={requests}
            loading={requestsLoading}
            onApprove={(requestId) => approveMutation.mutate(requestId)}
            onReject={(requestId) => rejectMutation.mutate(requestId)}
            approving={approveMutation.isPending}
            rejecting={rejectMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ParentSettingsForm
            config={parentConfig}
            onUpdate={(config) => updateConfigMutation.mutate(config)}
            saving={updateConfigMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubOrgsList({
  subOrgs,
  loading,
  onUpdateSettings,
}: {
  subOrgs: SubOrgWithSettings[]
  loading: boolean
  onUpdateSettings: (subOrgId: string, settings: any) => void
}) {
  const { t } = useI18n()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  if (subOrgs.length === 0) {
    return (
      <Card>
        <p className="text-[#617589] dark:text-gray-400">{t('admin.subOrgs.list.empty')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {subOrgs.map((subOrg) => (
        <Card key={subOrg.id}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{subOrg.name}</h3>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                {t('admin.subOrgs.list.created', { date: new Date(subOrg.created_at).toLocaleDateString() })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={subOrg.sub_org_settings?.status === 'active' ? 'success' : 'warning'}
              >
                {subOrg.sub_org_settings?.status === 'active' 
                  ? t('admin.subOrgs.list.status.active')
                  : t('admin.subOrgs.list.status.suspended')}
              </Badge>
              <Button
                variant="neutral"
                onClick={() => setExpandedId(expandedId === subOrg.id ? null : subOrg.id)}
              >
                {expandedId === subOrg.id ? t('admin.subOrgs.list.hide') : t('admin.subOrgs.list.manage')}
              </Button>
            </div>
          </div>

          {expandedId === subOrg.id && subOrg.sub_org_settings && (
            <SubOrgSettingsForm
              subOrg={subOrg}
              settings={subOrg.sub_org_settings}
              onSave={(settings) => onUpdateSettings(subOrg.id, settings)}
            />
          )}
        </Card>
      ))}
    </div>
  )
}

function SubOrgSettingsForm({
  subOrg: _subOrg,
  settings,
  onSave,
}: {
  subOrg: SubOrgWithSettings
  settings: any
  onSave: (settings: any) => void
}) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'active' | 'suspended'>(settings.status)
  const [enabledSports, setEnabledSports] = useState<string[]>(settings.enabled_sports || [])
  const [previousSports, setPreviousSports] = useState<string[]>(settings.enabled_sports || [])

  const handleSave = () => {
    // Check if sports were removed
    const removedSports = previousSports.filter((sport) => !enabledSports.includes(sport))
    
    if (removedSports.length > 0 && status === 'active') {
      // Warn about removed sports
      const confirmMessage = t('admin.subOrgs.settings.confirmDisableSports', { count: removedSports.length })
      if (!window.confirm(confirmMessage)) {
        return
      }
    }

    setPreviousSports(enabledSports)
    onSave({
      status,
      enabled_sports: enabledSports,
    })
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#f0f2f4] dark:border-gray-700 space-y-4">
      <div>
        <label className="block text-sm font-bold mb-2">{t('admin.subOrgs.settings.status.label')}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
          className="w-full px-4 py-2 border border-[#f0f2f4] dark:border-gray-700 rounded-lg bg-white dark:bg-[#1c2630]"
        >
          <option value="active">{t('admin.subOrgs.settings.status.active')}</option>
          <option value="suspended">{t('admin.subOrgs.settings.status.suspended')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">{t('admin.subOrgs.settings.enabledSports.label')}</label>
        <p className="text-sm text-[#617589] dark:text-gray-400 mb-2">
          {t('admin.subOrgs.settings.enabledSports.description')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(SPORT_NAMES).map(([code, name]) => (
            <label key={code} className="flex items-center gap-2">
              <Checkbox
                checked={enabledSports.includes(code)}
                onChange={(checked) => {
                  if (checked) {
                    setEnabledSports([...enabledSports, code])
                  } else {
                    setEnabledSports(enabledSports.filter((c) => c !== code))
                  }
                }}
              />
              <span className="text-sm">{name}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSave}>{t('admin.subOrgs.settings.save')}</Button>
    </div>
  )
}

function RequestsList({
  requests,
  loading,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  requests: SubOrgRequest[]
  loading: boolean
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
  approving: boolean
  rejecting: boolean
}) {
  const { t } = useI18n()
  
  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  if (requests.length === 0) {
    return (
      <Card>
        <p className="text-[#617589] dark:text-gray-400">{t('admin.subOrgs.requests.empty')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold">{request.requested_name}</h3>
              <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">
                {t('admin.subOrgs.requests.contact', { name: request.contact_name, email: request.contact_email })}
              </p>
              {request.school_league_type && (
                <p className="text-sm text-[#617589] dark:text-gray-400">
                  {t('admin.subOrgs.requests.type', { type: request.school_league_type })}
                </p>
              )}
              <div className="mt-2">
                <p className="text-sm font-medium">{t('admin.subOrgs.requests.requestedSports')}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {request.requested_sport_codes.map((code) => (
                    <Badge key={code} variant="neutral">
                      {SPORT_NAMES[code as SportCode] || code}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#617589] dark:text-gray-400 mt-2">
                {t('admin.subOrgs.requests.submitted', { date: new Date(request.created_at).toLocaleString() })}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="primary"
                onClick={() => onApprove(request.id)}
                disabled={approving || rejecting}
              >
                {t('admin.subOrgs.requests.approve')}
              </Button>
              <Button
                variant="neutral"
                onClick={() => onReject(request.id)}
                disabled={approving || rejecting}
              >
                {t('admin.subOrgs.requests.reject')}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ParentSettingsForm({
  config,
  onUpdate,
  saving,
}: {
  config: ParentOrgSubConfig | null | undefined
  onUpdate: (config: any) => void
  saving: boolean
}) {
  const { t } = useI18n()
  const [publicRegistration, setPublicRegistration] = useState(
    config?.sub_org_public_registration_enabled ?? false
  )
  const [requireApproval, setRequireApproval] = useState(config?.sub_org_require_approval ?? true)
  const [maxCount, setMaxCount] = useState<string>(
    config?.sub_org_max_count?.toString() || ''
  )

  const handleSave = () => {
    onUpdate({
      sub_org_public_registration_enabled: publicRegistration,
      sub_org_require_approval: requireApproval,
      sub_org_max_count: maxCount ? parseInt(maxCount, 10) : null,
    })
  }

  return (
    <Card>
      <h3 className="text-lg font-bold mb-4">{t('admin.subOrgs.parentSettings.title')}</h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={publicRegistration}
              onChange={(e) => setPublicRegistration(e.target.checked)}
            />
            <span className="font-medium">{t('admin.subOrgs.parentSettings.publicRegistration.label')}</span>
          </label>
          <p className="text-sm text-[#617589] dark:text-gray-400 ml-7">
            {t('admin.subOrgs.parentSettings.publicRegistration.description')}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={requireApproval}
              onChange={setRequireApproval}
              disabled={!publicRegistration}
            />
            <span className="font-medium">{t('admin.subOrgs.parentSettings.requireApproval.label')}</span>
          </label>
          <p className="text-sm text-[#617589] dark:text-gray-400 ml-7">
            {t('admin.subOrgs.parentSettings.requireApproval.description')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            {t('admin.subOrgs.parentSettings.maxCount.label')}
          </label>
          <Input
            type="number"
            value={maxCount}
            onChange={(e) => setMaxCount(e.target.value)}
            placeholder={t('admin.subOrgs.parentSettings.maxCount.placeholder')}
            min="1"
          />
          <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">
            {t('admin.subOrgs.parentSettings.maxCount.description')}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('admin.subOrgs.parentSettings.saving') : t('admin.subOrgs.parentSettings.save')}
        </Button>
      </div>
    </Card>
  )
}
