import { describe, expect, test } from 'vitest'
import { resolveTicketCheckoutRole } from '@/utils/ticketCheckoutRole'

describe('ticketCheckoutRole', () => {
  test('prefers explicit role param when present', () => {
    expect(resolveTicketCheckoutRole('fan', { fallbackRole: 'guardian' })).toBe('fan')
    expect(resolveTicketCheckoutRole('guardian', { fallbackRole: 'fan' })).toBe('guardian')
  })

  test('prefers fan when profile has both fan and guardian-like roles', () => {
    expect(
      resolveTicketCheckoutRole(null, {
        profileRoles: ['parent', 'fan'],
        fallbackRole: 'guardian',
      }),
    ).toBe('fan')
  })

  test('falls back to guardian for guardian-only profiles', () => {
    expect(
      resolveTicketCheckoutRole(null, {
        profileRoles: ['parent'],
        fallbackRole: 'fan',
      }),
    ).toBe('guardian')
  })
})
