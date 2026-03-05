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
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useI18n } from '../../i18n/useI18n'
import { useUserContext } from '../../hooks/useUserContext'
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
import { useAuth } from '../../hooks/useAuth'
import { getTierLimit } from '../../data/services/tierLimitsService'
import { type OrgUser } from '../../data/services/usersService'
import { getOrganizationSlug } from '../../data/services/organizationService'
import { getPublicBaseUrl } from '../../utils/publicUrls'
import { getLink, RouteKeys } from '../../utils/routes'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { showSuccess, showError } from '../../utils/toast'
import { getErrorMessage } from '../../utils/errorUtils'
import { SPORT_NAMES, type SportCode } from '../../types/sports'
import SubOrgInviteForm from '../../components/admin/SubOrgInviteForm'
import { cn } from '../../utils/cn'
import { USE_FAKE_DATA } from '../../data/config'
import { getSystemSports } from '../../data/services/sportsService'
import '../../styles/orgAdmin.css'

export default function SubOrganizations() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentOrganization } = useOrganization()
  const { context, isReady: userContextReady } = useUserContext()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'sub-orgs' | 'requests' | 'settings'>('sub-orgs')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [modalAdminUserId, setModalAdminUserId] = useState<string | null>(null)
  const [maxSubOrgsLimit, setMaxSubOrgsLimit] = useState<number | null>(null)

  const orgId = currentOrganization?.id

  // Load tier-based max_sub_orgs limit
  useEffect(() => {
    if (orgId && user?.id) {
      getTierLimit(orgId, user.id, 'max_sub_orgs')
        .then(result => {
          if (!result.error) {
            setMaxSubOrgsLimit(result.limit)
          }
        })
        .catch(err => {
          console.warn('[SubOrganizations] Failed to load max_sub_orgs limit:', err)
        })
    }
  }, [orgId, user?.id])

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
    select: (result) => result.data,
    enabled: !!orgId,
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

  // Get org slug for public URL
  const { data: orgSlug, isLoading: orgSlugLoading } = useQuery({
    queryKey: ['org-slug', orgId],
    queryFn: async () => {
      if (!orgId) return null
      const { data, error } = await getOrganizationSlug(orgId)
      if (error) return null
      return data
    },
    enabled: !!orgId,
  })

  // Get eligible other org admins for conditional form
  const { data: orgUsers, isLoading: orgUsersLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: async () => {
      if (!context || !userContextReady) return { data: [], error: null }
      const { getOrganizationUsers } = await import('../../data/services/usersService')
      return getOrganizationUsers(context)
    },
    enabled: !!orgId && !!context && userContextReady,
    select: (result) => result.data || [],
  })

  // Calculate eligible other org admins
  const eligibleOtherAdmins = orgUsers
    ? orgUsers.filter((user) => user.roles.includes('org_admin') && user.id !== context?.userId)
    : []

  // Build public URL
  const publicOrgUrl = orgSlug ? getPublicBaseUrl(orgSlug, 'register-sub-org') : ''

  // Check for return flow from CreateUser
  useEffect(() => {
    const state = location.state as { openSubOrgInviteModal?: boolean; suborgAdminUserId?: string } | null
    if (state?.openSubOrgInviteModal && state?.suborgAdminUserId) {
      setModalAdminUserId(state.suborgAdminUserId)
      setShowInviteModal(true)
      // Clear state to prevent re-opening on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

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
        subtitle={t('admin.subOrgs.newSubtitle')}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="oa-tabs">
        <TabsList className="oa-mb-6">
          <TabsTrigger value="sub-orgs">
            {t('admin.subOrgs.tabs.subOrgs')} ({subOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('admin.subOrgs.tabs.requests')} ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="settings">{t('admin.subOrgs.tabs.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="sub-orgs">
          <SubOrgsMainTab
            orgId={orgId!}
            publicOrgUrl={publicOrgUrl}
            orgSlug={orgSlug ?? null}
            orgSlugLoading={orgSlugLoading}
            eligibleOtherAdmins={eligibleOtherAdmins}
            eligibleOtherAdminsLoading={orgUsersLoading}
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
            maxSubOrgsLimit={maxSubOrgsLimit}
            currentSubOrgCount={subOrgs.length}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      {showInviteModal && orgId && publicOrgUrl && (
        <SubOrgInviteModal
          parentOrgId={orgId}
          publicOrgUrl={publicOrgUrl}
          defaultSelectedAdminUserId={modalAdminUserId || undefined}
          lockedAdminSelection={!!modalAdminUserId}
          onClose={() => {
            setShowInviteModal(false)
            setModalAdminUserId(null)
          }}
          onSubmitted={() => {
            setShowInviteModal(false)
            setModalAdminUserId(null)
            queryClient.invalidateQueries({ queryKey: ['sub-orgs', orgId] })
          }}
        />
      )}
    </div>
  )
}

function SubOrgsMainTab({
  orgId,
  publicOrgUrl,
  orgSlug,
  orgSlugLoading,
  eligibleOtherAdmins,
  eligibleOtherAdminsLoading,
  subOrgs,
  loading,
  onUpdateSettings,
}: {
  orgId: string
  publicOrgUrl: string
  orgSlug: string | null
  orgSlugLoading: boolean
  eligibleOtherAdmins: OrgUser[]
  eligibleOtherAdminsLoading: boolean
  subOrgs: SubOrgWithSettings[]
  loading: boolean
  onUpdateSettings: (subOrgId: string, settings: any) => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <div className="oa-space-y-6">
      {/* Two-column layout for top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Introduction */}
        <Card>
          <div className="oa-space-y-4">
            <div>
              <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.intro.title')}</h2>
              <p className="oa-body-m oa-text-muted oa-mb-3">{t('admin.subOrgs.intro.paragraph1')}</p>
              <p className="oa-body-m oa-text-muted oa-mb-3">{t('admin.subOrgs.intro.paragraph2')}</p>
              <p className="oa-body-m oa-text-muted">{t('admin.subOrgs.intro.paragraph3')}</p>
            </div>

            <div className="oa-space-y-3">
              <div>
                <h3 className="oa-body-m oa-font-bold oa-mb-2">{t('admin.subOrgs.intro.useProgramsWhen.title')}</h3>
                <ul className="oa-list-disc oa-list-inside oa-space-y-1 oa-text-muted">
                  <li>{t('admin.subOrgs.intro.useProgramsWhen.item1')}</li>
                  <li>{t('admin.subOrgs.intro.useProgramsWhen.item2')}</li>
                  <li>{t('admin.subOrgs.intro.useProgramsWhen.item3')}</li>
                  <li>{t('admin.subOrgs.intro.useProgramsWhen.item4')}</li>
                </ul>
              </div>

              <div>
                <h3 className="oa-body-m oa-font-bold oa-mb-2">{t('admin.subOrgs.intro.useSubOrgsWhen.title')}</h3>
                <ul className="oa-list-disc oa-list-inside oa-space-y-1 oa-text-muted">
                  <li>{t('admin.subOrgs.intro.useSubOrgsWhen.item1')}</li>
                  <li>{t('admin.subOrgs.intro.useSubOrgsWhen.item2')}</li>
                  <li>{t('admin.subOrgs.intro.useSubOrgsWhen.item3')}</li>
                  <li>{t('admin.subOrgs.intro.useSubOrgsWhen.item4')}</li>
                  <li>{t('admin.subOrgs.intro.useSubOrgsWhen.item5')}</li>
                </ul>
              </div>

              <div className="oa-pt-2 oa-border-t oa-border-default">
                <p className="oa-body-m oa-font-medium">{t('admin.subOrgs.intro.ruleOfThumb')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Public URL Card */}
        <PublicSubOrgUrlCard publicOrgUrl={publicOrgUrl} orgSlug={orgSlug} loading={orgSlugLoading} />
      </div>

      {/* Section 3: Set up a Sub-Org (Conditional) */}
      {orgSlugLoading || eligibleOtherAdminsLoading ? (
        <Card>
          <div className="oa-flex oa-items-center oa-gap-3">
            <div className="oa-btn-spinner" aria-hidden />
            <p className="oa-body-m oa-text-muted">{t('common.loading')}</p>
          </div>
        </Card>
      ) : eligibleOtherAdmins.length >= 1 && publicOrgUrl ? (
        <Card>
          <h2 className="oa-h3 oa-mb-4">{t('admin.subOrgs.setup.title')}</h2>
          <SubOrgInviteForm
            parentOrgId={orgId}
            publicOrgUrl={publicOrgUrl}
            renderMode="inline"
            onSubmitted={() => {
              queryClient.invalidateQueries({ queryKey: ['sub-orgs', orgId] })
            }}
          />
        </Card>
      ) : eligibleOtherAdmins.length === 0 ? (
        <Card>
          <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.setup.blocked.title')}</h2>
          <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.subOrgs.setup.blocked.body1')}</p>
          <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.subOrgs.setup.blocked.body2')}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/users/new?source=suborg_setup')}
          >
            {t('admin.subOrgs.setup.blocked.cta')}
          </Button>
        </Card>
      ) : (
        <Card>
          <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.setup.blocked.title')}</h2>
          <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.subOrgs.publicUrl.noSlug')}</p>
          <Button
            variant="secondary"
            onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION))}
          >
            {t('admin.subOrgs.publicUrl.setSlug')}
          </Button>
        </Card>
      )}

      {/* Existing Sub-Orgs List (if any) - Full width row */}
      {!loading && subOrgs.length > 0 && (
        <div className="oa-space-y-4">
          <h2 className="oa-h3">{t('admin.subOrgs.existing.title')}</h2>
          <SubOrgsList
            subOrgs={subOrgs}
            loading={false}
            onUpdateSettings={onUpdateSettings}
          />
        </div>
      )}
    </div>
  )
}

function PublicSubOrgUrlCard({ 
  publicOrgUrl, 
  orgSlug, 
  loading 
}: { 
  publicOrgUrl: string
  orgSlug: string | null
  loading: boolean
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { copy, copied } = useCopyToClipboard()

  // In demo mode, show a fake URL
  const displayUrl = USE_FAKE_DATA && !publicOrgUrl 
    ? `${window.location.origin}/o/demo-org/register-sub-org`
    : publicOrgUrl

  if (loading) {
    return (
      <Card>
        <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.publicUrl.title')}</h2>
        <div className="oa-flex oa-items-center oa-gap-3">
          <div className="oa-btn-spinner" aria-hidden />
          <p className="oa-body-m oa-text-muted">{t('common.loading')}</p>
        </div>
      </Card>
    )
  }

  if (!orgSlug && !USE_FAKE_DATA) {
    return (
      <Card>
        <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.publicUrl.title')}</h2>
        <p className="oa-body-m oa-text-muted oa-mb-3">{t('admin.subOrgs.publicUrl.noSlug')}</p>
        <Button
          variant="secondary"
          onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION))}
        >
          {t('admin.subOrgs.publicUrl.setSlug')}
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="oa-h3 oa-mb-3">{t('admin.subOrgs.publicUrl.title')}</h2>
      <div className="oa-flex oa-items-center oa-gap-3 oa-mb-2">
        <input
          type="text"
          readOnly
          value={displayUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="oa-input oa-flex-1 oa-font-mono oa-text-sm"
          style={{ cursor: 'text' }}
        />
        <button
          type="button"
          onClick={() => copy(displayUrl)}
          className={cn('oa-btn', copied ? 'oa-btn--success' : 'oa-btn--primary')}
          style={{ minWidth: '100px' }}
        >
          {copied ? (
            <>
              <span className="material-symbols-outlined oa-mr-1" style={{ fontSize: '16px' }}>
                check
              </span>
              {t('common.copied')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined oa-mr-1" style={{ fontSize: '16px' }}>
                content_copy
              </span>
              {t('common.copy')}
            </>
          )}
        </button>
      </div>
      <p className="oa-helper oa-text-xs">{t('admin.subOrgs.publicUrl.helper')}</p>
    </Card>
  )
}

function SubOrgInviteModal({
  parentOrgId,
  publicOrgUrl,
  defaultSelectedAdminUserId,
  lockedAdminSelection,
  onClose,
  onSubmitted,
}: {
  parentOrgId: string
  publicOrgUrl: string
  defaultSelectedAdminUserId?: string
  lockedAdminSelection: boolean
  onClose: () => void
  onSubmitted: () => void
}) {
  const { t } = useI18n()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 20, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="oa-card"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          margin: 'var(--pa-space-4)',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--org-border-default, var(--pa-n100))' }}>
          <h2 className="oa-h2" style={{ margin: 0 }}>
            {t('admin.subOrgs.inviteModal.title')}
          </h2>
          <p className="oa-body-m oa-text-muted" style={{ margin: 'var(--pa-space-2) 0 0 0' }}>
            {t('admin.subOrgs.inviteModal.subtitle')}
          </p>
        </div>

        <div style={{ padding: 'var(--pa-space-5)', flex: 1, overflow: 'auto' }}>
          <SubOrgInviteForm
            parentOrgId={parentOrgId}
            publicOrgUrl={publicOrgUrl}
            defaultSelectedAdminUserId={defaultSelectedAdminUserId}
            lockedAdminSelection={lockedAdminSelection}
            renderMode="modal"
            onSubmitted={onSubmitted}
          />
        </div>

        <div style={{ padding: 'var(--pa-space-5)', borderTop: '1px solid var(--org-border-default, var(--pa-n100))', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
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
                variant="secondary"
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
  subOrg,
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

  // Get system sports to map sport codes to sport IDs
  const { data: systemSports } = useQuery({
    queryKey: ['system-sports'],
    queryFn: async () => {
      const { data, error } = await getSystemSports()
      if (error || !data) return []
      return data
    },
    enabled: !USE_FAKE_DATA,
  })

  // Check which sports have related data (programs, levels, or teams)
  const { data: sportsWithData } = useQuery({
    queryKey: ['sub-org-sports-with-data', subOrg.id, systemSports],
    queryFn: async () => {
      if (USE_FAKE_DATA || !systemSports) {
        // In demo mode, return empty set (all sports can be unchecked)
        return new Set<SportCode>()
      }

      const sportsWithRelatedData = new Set<SportCode>()

      try {
        // Create mapping from sport ID to sport code
        const sportIdToCode: Record<string, SportCode> = {}
        systemSports.forEach((sport) => {
          if (sport.slug) {
            // Convert slug to code format (e.g., 'track-and-field' -> 'track_field')
            const code = sport.slug.replace(/-/g, '_') as SportCode
            sportIdToCode[sport.id] = code
          }
        })

        // Check for programs
        const { data: programs } = await supabase
          .from('programs')
          .select('sport_id')
          .eq('org_id', subOrg.id)
          .not('sport_id', 'is', null)

        if (programs) {
          programs.forEach((p: { sport_id: string }) => {
            const code = sportIdToCode[p.sport_id]
            if (code) sportsWithRelatedData.add(code)
          })
        }

        // Levels don't have sport_id; sport comes from program. We already count programs above.

        // Check for teams
        const { data: teams } = await supabase
          .from('teams')
          .select('sport_id')
          .eq('org_id', subOrg.id)
          .not('sport_id', 'is', null)

        if (teams) {
          teams.forEach((t) => {
            if (t.sport_id) {
              const code = sportIdToCode[t.sport_id]
              if (code) sportsWithRelatedData.add(code)
            }
          })
        }
      } catch (err) {
        console.error('Error checking sports with data:', err)
      }

      return sportsWithRelatedData
    },
    enabled: !USE_FAKE_DATA && !!subOrg.id && !!systemSports,
  })

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
          {Object.entries(SPORT_NAMES).map(([code, name]) => {
            const sportCode = code as SportCode
            const isChecked = enabledSports.includes(sportCode)
            const hasRelatedData = !USE_FAKE_DATA && sportsWithData?.has(sportCode)
            const isDisabled = hasRelatedData && isChecked

            return (
              <label 
                key={code} 
                className={cn(
                  "flex items-center gap-2",
                  isDisabled && "opacity-60 cursor-not-allowed"
                )}
                title={isDisabled ? t('admin.subOrgs.settings.sportHasDataTooltip' as import('../../i18n').TranslationKey) : undefined}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEnabledSports([...enabledSports, sportCode])
                    } else {
                      setEnabledSports(enabledSports.filter((c) => c !== sportCode))
                    }
                  }}
                />
                <span className="text-sm">{name}</span>
              </label>
            )
          })}
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
                variant="secondary"
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
  maxSubOrgsLimit,
  currentSubOrgCount,
}: {
  config: ParentOrgSubConfig | null | undefined
  onUpdate: (config: any) => void
  saving: boolean
  maxSubOrgsLimit: number | null
  currentSubOrgCount: number
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublicRegistration(e.target.checked)}
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
              onChange={(e) => setRequireApproval(e.target.checked)}
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
          {maxSubOrgsLimit !== null && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-200">
              <strong>Tier Limit:</strong> {maxSubOrgsLimit === null ? 'Unlimited' : `${maxSubOrgsLimit} sub-organizations`}
              {maxSubOrgsLimit !== null && (
                <span className="ml-2">
                  ({currentSubOrgCount} of {maxSubOrgsLimit} used)
                </span>
              )}
            </div>
          )}
          {maxSubOrgsLimit === null && (
            <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-800 dark:text-green-200">
              <strong>Unlimited sub-organizations</strong> (Professional tier)
            </div>
          )}
          <Input
            type="number"
            value={maxCount}
            onChange={(e) => setMaxCount(e.target.value)}
            placeholder={t('admin.subOrgs.parentSettings.maxCount.placeholder')}
            min="1"
            disabled={maxSubOrgsLimit !== null}
          />
          <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">
            {maxSubOrgsLimit !== null 
              ? 'This limit is set by your license tier and cannot be changed here. Upgrade your plan to increase the limit.'
              : t('admin.subOrgs.parentSettings.maxCount.description')
            }
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('admin.subOrgs.parentSettings.saving') : t('admin.subOrgs.parentSettings.save')}
        </Button>
      </div>
    </Card>
  )
}
