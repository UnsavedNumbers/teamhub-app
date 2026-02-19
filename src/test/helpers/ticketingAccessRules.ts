export interface TicketingAccessInput {
  ticketingEnabled: boolean | null | undefined
  promoConfigured?: boolean
  transferConfigured?: boolean
}

export interface TicketingAccessRules {
  ticketingEnabled: boolean
  promoEnabled: boolean
  transferEnabled: boolean
}

/**
 * Access inheritance contract:
 * Organization-level ticketing access gates promo/discount and transfer flows.
 */
export function resolveTicketingAccessRules(input: TicketingAccessInput): TicketingAccessRules {
  const ticketingEnabled = Boolean(input.ticketingEnabled)
  const promoConfigured = input.promoConfigured ?? true
  const transferConfigured = input.transferConfigured ?? true

  return {
    ticketingEnabled,
    promoEnabled: ticketingEnabled && promoConfigured,
    transferEnabled: ticketingEnabled && transferConfigured,
  }
}
