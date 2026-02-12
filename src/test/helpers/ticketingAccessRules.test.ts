import { describe, expect, test } from 'vitest'
import { resolveTicketingAccessRules } from '@/test/helpers/ticketingAccessRules'

describe('ticketing access inheritance', () => {
  test('[TE-E2E-009] promo/discount access inherits enabled ticketing access', () => {
    const rules = resolveTicketingAccessRules({ ticketingEnabled: true })
    expect(rules.promoEnabled).toBe(true)
  })

  test('[TE-E2E-009] promo/discount access is blocked when ticketing is disabled', () => {
    const rules = resolveTicketingAccessRules({ ticketingEnabled: false })
    expect(rules.promoEnabled).toBe(false)
  })

  test('[TE-E2E-016] transfer access inherits enabled ticketing access', () => {
    const rules = resolveTicketingAccessRules({ ticketingEnabled: true })
    expect(rules.transferEnabled).toBe(true)
  })

  test('[TE-E2E-016] transfer access is blocked when ticketing is disabled', () => {
    const rules = resolveTicketingAccessRules({ ticketingEnabled: false })
    expect(rules.transferEnabled).toBe(false)
  })
})
