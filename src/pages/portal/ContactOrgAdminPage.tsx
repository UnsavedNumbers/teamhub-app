/**
 * Contact Org Admin Page
 *
 * Allows guardians and athletes to send structured requests to their org admin.
 * Prefills context from URL search params (team_id, event_id, athlete_id, etc.).
 * Includes a special "Feature Request" flow that lists features not in the org's plan.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import PortalLayout from '../../components/portal/PortalLayout'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { showError } from '../../utils/toast'
import { captureEvent } from '../../lib/analytics/analytics'
import {
  getUnavailableFeatures,
  submitOrgContactRequest,
} from '../../data/services/contactRequestsService'
import type {
  ContactRequestCategory,
  UnavailableFeature,
  SubmitOrgContactRequestPayload,
} from '../../types/contactRequests'
import { CONTACT_REQUEST_CATEGORIES } from '../../types/contactRequests'

// ============================================================================
// Constants
// ============================================================================

const FEATURE_USE_CASES = [
  'ticketing',
  'communication',
  'photos',
  'reports',
  'branding',
  'other',
] as const

// ============================================================================
// Component
// ============================================================================

export default function ContactOrgAdminPage() {
  const t = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { context, isReady } = useUserContext()

  // -- Prefill from URL params --
  const prefillTeamId = searchParams.get('team_id') ?? undefined
  const prefillAthleteId = searchParams.get('athlete_id') ?? undefined
  const prefillSeasonId = searchParams.get('season_id') ?? undefined
  const prefillEventId = searchParams.get('event_id') ?? undefined
  const prefillCategory = (searchParams.get('category') ?? '') as ContactRequestCategory | ''

  // -- Form state --
  const [category, setCategory] = useState<ContactRequestCategory | ''>(
    CONTACT_REQUEST_CATEGORIES.includes(prefillCategory as ContactRequestCategory)
      ? (prefillCategory as ContactRequestCategory)
      : ''
  )
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // -- Feature request flow state --
  const [unavailableFeatures, setUnavailableFeatures] = useState<UnavailableFeature[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [featuresError, setFeaturesError] = useState(false)
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string>('')
  const [featureReason, setFeatureReason] = useState('')
  const [featureUseCase, setFeatureUseCase] = useState<string>('')

  // -- Page load error --
  const [pageError, _setPageError] = useState<string | null>(null)

  // ============================================================================
  // Load unavailable features when category switches to feature_request
  // ============================================================================

  const loadFeatures = useCallback(async (orgId: string) => {
    setFeaturesLoading(true)
    setFeaturesError(false)
    try {
      const { data, error } = await getUnavailableFeatures(orgId)
      if (error) {
        setFeaturesError(true)
      } else {
        setUnavailableFeatures(data ?? [])
      }
    } finally {
      setFeaturesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (category === 'feature_request' && isReady && context.orgId) {
      loadFeatures(context.orgId)
    }
    // Reset feature selections when switching away from feature_request
    if (category !== 'feature_request') {
      setSelectedFeatureKey('')
      setFeatureReason('')
      setFeatureUseCase('')
    }
  }, [category, isReady, context.orgId, loadFeatures])

  // ============================================================================
  // Guard: must have an org to contact
  // ============================================================================

  if (isReady && !context.orgId) {
    return (
      <PortalLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">
            business
          </span>
          <h2 className="text-xl font-bold mb-2">
            {t('portal.contactOrgAdmin.notInOrg.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('portal.contactOrgAdmin.notInOrg.message')}
          </p>
        </div>
      </PortalLayout>
    )
  }

  // ============================================================================
  // Submit handler
  // ============================================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!category) return
    if (!message.trim()) return
    if (!isReady || !context.orgId) return

    // Feature request validation
    if (category === 'feature_request' && !selectedFeatureKey) return

    // Prevent double-submission
    if (submitting) return
    setSubmitting(true)

    const selectedFeature = unavailableFeatures.find(f => f.feature_key === selectedFeatureKey)

    const payload: SubmitOrgContactRequestPayload = {
      org_id: context.orgId,
      category,
      message: message.trim(),
      subject: subject.trim() || undefined,
      athlete_id: prefillAthleteId,
      team_id: prefillTeamId,
      season_id: prefillSeasonId,
      event_id: prefillEventId,
      requested_feature_key: category === 'feature_request' ? selectedFeatureKey : undefined,
      requested_feature_name: category === 'feature_request' ? (selectedFeature?.display_name ?? selectedFeatureKey) : undefined,
      requested_feature_reason: category === 'feature_request' ? featureReason.trim() || undefined : undefined,
      requested_feature_use_case: category === 'feature_request' ? featureUseCase || undefined : undefined,
    }

    const { data, error } = await submitOrgContactRequest(payload)

    setSubmitting(false)

    if (error) {
      showError(t('portal.contactOrgAdmin.error.submitFailed'))
      return
    }

    // Analytics
    captureEvent('contact_request_submitted', {
      category,
      org_id: context.orgId,
      role: context.roles[0] ?? 'unknown',
    })
    if (category === 'feature_request' && selectedFeatureKey) {
      captureEvent('feature_request_submitted', {
        feature_key: selectedFeatureKey,
        org_id: context.orgId,
      })
    }

    // Suppress unused variable warning - result confirmed success
    void data

    setSubmitted(true)
  }

  // ============================================================================
  // Success state
  // ============================================================================

  if (submitted) {
    return (
      <PortalLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">
              check_circle
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {t('portal.contactOrgAdmin.success.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {t('portal.contactOrgAdmin.success.message')}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-[var(--org-primary,#3b82f6)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('portal.contactOrgAdmin.success.dismiss')}
          </button>
        </div>
      </PortalLayout>
    )
  }

  // ============================================================================
  // Page load error
  // ============================================================================

  if (pageError) {
    return (
      <PortalLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-red-500">{pageError}</p>
          <button
            type="button"
            className="mt-4 text-sm text-[var(--org-primary,#3b82f6)] underline"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      </PortalLayout>
    )
  }

  // ============================================================================
  // Determine submit disabled state
  // ============================================================================

  const isSubmitDisabled = ((): boolean => {
    if (!category) return true
    if (!message.trim()) return true
    if (!isReady) return true
    if (submitting) return true
    if (category === 'feature_request') {
      if (featuresLoading) return true
      if (!selectedFeatureKey) return true
    }
    return false
  })()

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <PortalLayout
      breadcrumbs={[{ label: t('portal.contactOrgAdmin.title') }]}
    >
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            {t('portal.contactOrgAdmin.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('portal.contactOrgAdmin.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Step 1: Select category */}
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
              {t('portal.contactOrgAdmin.selectReason')}
            </h2>
            <div className="grid gap-3">
              {CONTACT_REQUEST_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
                    category === cat
                      ? 'border-[var(--org-primary,#3b82f6)] bg-[var(--org-primary,#3b82f6)]/5 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                  ].join(' ')}
                >
                  <div className="font-semibold text-sm">
                    {t(`portal.contactOrgAdmin.categories.${cat}`)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t(`portal.contactOrgAdmin.categoryDescriptions.${cat}`)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Feature request sub-flow */}
          {category === 'feature_request' && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-3">
                {t('portal.contactOrgAdmin.featureRequest.title')}
              </h3>

              {featuresLoading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('portal.contactOrgAdmin.featureRequest.loadingFeatures')}
                </p>
              )}

              {!featuresLoading && !featuresError && unavailableFeatures.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('portal.contactOrgAdmin.featureRequest.noFeatures')}
                </p>
              )}

              {!featuresLoading && !featuresError && unavailableFeatures.length > 0 && (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('portal.contactOrgAdmin.featureRequest.selectFeature')}
                  </label>
                  <select
                    value={selectedFeatureKey}
                    onChange={e => setSelectedFeatureKey(e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-primary,#3b82f6)] mb-4"
                  >
                    <option value="">-</option>
                    {unavailableFeatures.map(f => (
                      <option key={f.feature_key} value={f.feature_key}>
                        {f.display_name}
                      </option>
                    ))}
                  </select>

                  {/* Use case quick-select */}
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {t('portal.contactOrgAdmin.featureRequest.useCaseLabel')}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {FEATURE_USE_CASES.map(uc => (
                      <button
                        key={uc}
                        type="button"
                        onClick={() => setFeatureUseCase(featureUseCase === uc ? '' : uc)}
                        className={[
                          'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                          featureUseCase === uc
                            ? 'bg-[var(--org-primary,#3b82f6)] text-white border-[var(--org-primary,#3b82f6)]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {t(`portal.contactOrgAdmin.featureRequest.useCases.${uc}`)}
                      </button>
                    ))}
                  </div>

                  {/* Why do you want this */}
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('portal.contactOrgAdmin.featureRequest.whyLabel')}
                  </label>
                  <textarea
                    value={featureReason}
                    onChange={e => setFeatureReason(e.target.value)}
                    placeholder={t('portal.contactOrgAdmin.featureRequest.whyPlaceholder')}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-primary,#3b82f6)] mb-3"
                  />

                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {t('portal.contactOrgAdmin.featureRequest.consentNote')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 3: Message */}
          {category && (category !== 'feature_request' || selectedFeatureKey) && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('portal.contactOrgAdmin.message.label')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('portal.contactOrgAdmin.message.placeholder')}
                  rows={5}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-primary,#3b82f6)]"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('portal.contactOrgAdmin.subject.label')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={t('portal.contactOrgAdmin.subject.placeholder')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--org-primary,#3b82f6)]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full py-3 px-6 bg-[var(--org-primary,#3b82f6)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? t('portal.contactOrgAdmin.submit.sending')
                  : t('portal.contactOrgAdmin.submit.label')
                }
              </button>
            </>
          )}
        </form>
      </div>
    </PortalLayout>
  )
}

