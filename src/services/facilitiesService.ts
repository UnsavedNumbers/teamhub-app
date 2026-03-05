import { getProvider, type DateRangeInput, type FacilitiesUtilizationSummaryDto, type ServiceResponse } from './provider'

export * from '../data/services/facilitiesService'

export async function getFacilitiesUtilization(
  orgId: string,
  dateRange?: DateRangeInput,
): Promise<ServiceResponse<FacilitiesUtilizationSummaryDto>> {
  return getProvider().getFacilitiesUtilization(orgId, dateRange)
}
