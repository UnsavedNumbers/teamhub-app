/**
 * Sub-Organization Registration Page
 * 
 * Public form for registering a sub-organization under a parent org.
 * Supports both Model A (auto-approval) and Model B (approval required).
 */

import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { OrgScopedRoute } from '../components/OrgScopedRoute'
import type { OrgContext } from '../utils/orgResolution'
import { getLink, RouteKeys } from '../utils/routes'
import {
  getParentSubConfig,
  canCreateSubOrg,
  createSubOrgRequest,
  createSubOrg,
} from '../data/services/subOrgService'
import { SPORT_CODES, SPORT_NAMES, type SportCode } from '../types/sports'
import { showSuccess } from '../utils/toast'
import { getErrorMessage } from '../utils/errorUtils'
import { useI18n } from '../i18n/useI18n'

function SubOrgRegistrationContent({ org }: { org: OrgContext }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [schoolLeagueType, setSchoolLeagueType] = useState('')
  const [selectedSports, setSelectedSports] = useState<SportCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get parent config
  const { data: parentConfig } = useQuery({
    queryKey: ['parent-sub-config', org.id],
    queryFn: () => getParentSubConfig(org.id),
    enabled: !!org.id,
    select: (result) => result.data,
  })

  // Check if parent allows registration
  const { data: canCreate } = useQuery({
    queryKey: ['can-create-sub-org', org.id],
    queryFn: () => canCreateSubOrg(org.id),
    enabled: !!org.id,
    select: (result) => result,
  })

  // Get parent's enabled sports via organization_sports
  const { data: parentSports } = useQuery({
    queryKey: ['parent-sports', org.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_sports')
        .select('sport:sports(code)')
        .eq('org_id', org.id)
      
      if (error) throw error
      const codes = data?.map((item: any) => item.sport?.code).filter(Boolean) as SportCode[]
      return codes || []
    },
    enabled: !!org.id,
  })

  // Filter available sports to parent's enabled sports
  const availableSports = parentSports
    ? SPORT_CODES.filter((code) => parentSports.includes(code))
    : []

  useEffect(() => {
    if (canCreate && !canCreate.canCreate) {
      setError(canCreate.reason || 'Registration is not available')
    }
  }, [canCreate])

  const handleSportToggle = (sportCode: SportCode) => {
    if (selectedSports.includes(sportCode)) {
      setSelectedSports(selectedSports.filter((code) => code !== sportCode))
    } else {
      setSelectedSports([...selectedSports, sportCode])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validation
    if (!name.trim()) {
      setError(t('portal.subOrgRegistration.fields.orgName.required'))
      setLoading(false)
      return
    }

    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setError(t('portal.subOrgRegistration.fields.contactEmail.required'))
      setLoading(false)
      return
    }

    if (!contactName.trim()) {
      setError(t('portal.subOrgRegistration.fields.contactName.required'))
      setLoading(false)
      return
    }

    if (selectedSports.length === 0) {
      setError(t('portal.subOrgRegistration.fields.sports.required'))
      setLoading(false)
      return
    }

    try {
      const requireApproval = parentConfig?.sub_org_require_approval ?? true

      if (requireApproval) {
        // Model B: Create request
        const { data, error: requestError } = await createSubOrgRequest({
          parent_org_id: org.id,
          requested_name: name.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          contact_name: contactName.trim(),
          school_league_type: schoolLeagueType.trim() || undefined,
          requested_sport_codes: selectedSports,
        })

        if (requestError || !data) {
          throw new Error(requestError?.message || 'Failed to submit request')
        }

        showSuccess(t('portal.subOrgRegistration.success.request'))
        navigate(getLink(RouteKeys.PORTAL_ORG_LANDING, { orgSlug: orgSlug || '' }))
      } else {
        // Model A: Create sub-org directly
        const { data, error: createError } = await createSubOrg({
          parent_org_id: org.id,
          name: name.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          contact_name: contactName.trim(),
          school_league_type: schoolLeagueType.trim() || undefined,
          enabled_sport_codes: selectedSports,
        })

        if (createError || !data) {
          throw new Error(createError?.message || 'Failed to create sub-organization')
        }

        showSuccess(t('portal.subOrgRegistration.success.create'))
        navigate(getLink(RouteKeys.PORTAL_ORG_LANDING, { orgSlug: orgSlug || '' }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!parentConfig || !canCreate) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1c2630] rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('common.loading')}</h2>
        </div>
      </div>
    )
  }

  if (!canCreate.canCreate) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1c2630] rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('portal.subOrgRegistration.unavailable.title')}</h2>
          <p className="text-[#617589] dark:text-gray-400 mb-6">{canCreate.reason}</p>
          <button
            onClick={() => navigate(getLink(RouteKeys.PORTAL_ORG_LANDING, { orgSlug: orgSlug || '' }))}
            className="px-6 py-2 bg-[#137fec] text-white font-bold rounded-lg hover:bg-[#0f6bc7] transition-colors"
          >
            {t('portal.subOrgRegistration.unavailable.back', { orgName: org.name })}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      <header className="border-b border-[#f0f2f4] dark:border-[#2a3038] px-10 py-3 bg-white dark:bg-[#111418]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h2 className="text-lg font-black">{org.name}</h2>
          <button
            onClick={() => navigate(getLink(RouteKeys.PORTAL_ORG_LANDING, { orgSlug: orgSlug || '' }))}
            className="text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">{t('portal.subOrgRegistration.title')}</h1>
          <p className="text-[#617589] dark:text-gray-400">
            {t('portal.subOrgRegistration.subtitle', { orgName: org.name })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">
              {t('portal.subOrgRegistration.fields.orgName.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[#f0f2f4] dark:border-gray-700 rounded-lg bg-white dark:bg-[#1c2630] focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              placeholder={t('portal.subOrgRegistration.fields.orgName.placeholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              {t('portal.subOrgRegistration.fields.contactName.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-4 py-2 border border-[#f0f2f4] dark:border-gray-700 rounded-lg bg-white dark:bg-[#1c2630] focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              placeholder={t('portal.subOrgRegistration.fields.contactName.placeholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              {t('portal.subOrgRegistration.fields.contactEmail.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-2 border border-[#f0f2f4] dark:border-gray-700 rounded-lg bg-white dark:bg-[#1c2630] focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              placeholder={t('portal.subOrgRegistration.fields.contactEmail.placeholder')}
              required
            />
            <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">
              {t('portal.subOrgRegistration.fields.contactEmail.description')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              {t('portal.subOrgRegistration.fields.orgType.label')}
            </label>
            <input
              type="text"
              value={schoolLeagueType}
              onChange={(e) => setSchoolLeagueType(e.target.value)}
              className="w-full px-4 py-2 border border-[#f0f2f4] dark:border-gray-700 rounded-lg bg-white dark:bg-[#1c2630] focus:outline-none focus:ring-2 focus:ring-[#137fec]"
              placeholder={t('portal.subOrgRegistration.fields.orgType.placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              {t('portal.subOrgRegistration.fields.sports.label')} <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-[#617589] dark:text-gray-400 mb-3">
              {t('portal.subOrgRegistration.fields.sports.description')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableSports.map((code) => (
                <label
                  key={code}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSports.includes(code)
                      ? 'border-[#137fec] bg-[#137fec]/10'
                      : 'border-[#f0f2f4] dark:border-gray-700 hover:border-[#137fec]/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSports.includes(code)}
                    onChange={() => handleSportToggle(code)}
                    className="w-4 h-4 text-[#137fec] rounded"
                  />
                  <span className="text-sm font-medium">{SPORT_NAMES[code] || code}</span>
                </label>
              ))}
            </div>
            {availableSports.length === 0 && (
              <p className="text-sm text-[#617589] dark:text-gray-400 mt-2">
                {t('portal.subOrgRegistration.fields.sports.noneAvailable')}
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || selectedSports.length === 0}
              className="w-full px-6 py-3 bg-[#137fec] text-white font-bold rounded-lg hover:bg-[#0f6bc7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? t('portal.subOrgRegistration.submit.submitting')
                : parentConfig.sub_org_require_approval
                  ? t('portal.subOrgRegistration.submit.request')
                  : t('portal.subOrgRegistration.submit.create')}
            </button>
            {parentConfig.sub_org_require_approval && (
              <p className="text-sm text-[#617589] dark:text-gray-400 mt-2 text-center">
                {t('portal.subOrgRegistration.submit.approvalNote')}
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

export default function SubOrgRegistration() {
  return (
    <OrgScopedRoute>
      {(org) => <SubOrgRegistrationContent org={org} />}
    </OrgScopedRoute>
  )
}
