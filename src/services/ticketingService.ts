import { getProvider, type DateRangeInput, type ServiceResponse, type TicketingSummaryDto } from './provider'

export * from '../data/services/ticketingService'

export async function getTicketingSummary(
  orgId: string,
  dateRange?: DateRangeInput,
): Promise<ServiceResponse<TicketingSummaryDto>> {
  return getProvider().getTicketingSummary(orgId, dateRange)
}
