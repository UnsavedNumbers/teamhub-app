import { useState } from 'react'
import { createCheckoutSession } from '../api/billing'
import { t } from '../i18n'
import { getErrorMessage } from '../utils/errorUtils'

interface UseCheckoutSessionOptions {
  organizationId: string
  successUrl: string
  cancelUrl: string
}

interface UseCheckoutSessionResult {
  loadingTierId: string | null
  error: string | null
  handleSelect: (tierId: string) => Promise<void>
}

export function useCheckoutSession(options: UseCheckoutSessionOptions): UseCheckoutSessionResult {
  const { organizationId, successUrl, cancelUrl } = options
  const [loadingTierId, setLoadingTierId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (tierId: string) => {
    if (!organizationId) {
      setError(t('errors.missingOrganization'))
      return
    }

    if (!tierId) {
      setError('Tier ID is required')
      return
    }

    setError(null)
    setLoadingTierId(tierId)

    try {
      const { checkout_session_url } = await createCheckoutSession({
        organizationId,
        tierId,
        successUrl,
        cancelUrl,
      })

      if (checkout_session_url) {
        window.location.href = checkout_session_url
      } else {
        setError(t('billing.errorCreatingSession'))
        setLoadingTierId(null)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('billing.errorCreatingSession'))
      setLoadingTierId(null)
    }
  }

  return {
    loadingTierId,
    error,
    handleSelect,
  }
}
