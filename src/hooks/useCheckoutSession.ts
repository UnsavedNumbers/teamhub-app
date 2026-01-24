import { useState } from 'react'
import { createCheckoutSession } from '../api/billing'
import { LicensePlan } from '../utils/licenseUtils'
import { t } from '../i18n'
import { getErrorMessage } from '../utils/errorUtils'

interface UseCheckoutSessionOptions {
  organizationId: string
  successUrl: string
  cancelUrl: string
}

interface UseCheckoutSessionResult {
  loadingPlan: LicensePlan | null
  error: string | null
  handleSelect: (plan: LicensePlan) => Promise<void>
}

export function useCheckoutSession(options: UseCheckoutSessionOptions): UseCheckoutSessionResult {
  const { organizationId, successUrl, cancelUrl } = options
  const [loadingPlan, setLoadingPlan] = useState<LicensePlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (plan: LicensePlan) => {
    if (!organizationId) {
      setError(t('errors.missingOrganization'))
      return
    }

    setError(null)
    setLoadingPlan(plan)

    try {
      const { checkout_session_url } = await createCheckoutSession({
        organizationId,
        requestedPlan: plan,
        successUrl,
        cancelUrl,
      })

      if (checkout_session_url) {
        window.location.href = checkout_session_url
      } else {
        setError(t('billing.errorCreatingSession'))
        setLoadingPlan(null)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('billing.errorCreatingSession'))
      setLoadingPlan(null)
    }
  }

  return {
    loadingPlan,
    error,
    handleSelect,
  }
}
