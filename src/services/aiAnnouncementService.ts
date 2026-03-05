import { invokeApiOperation } from './apiManagerService'

export interface SummarizeAnnouncementResult {
  success: boolean
  summary?: string
  traceId?: string
  error?: string
}

export async function summarizeAnnouncement(
  announcement: string,
  orgId: string,
  maxLength = 120,
): Promise<SummarizeAnnouncementResult> {
  const response = await invokeApiOperation<{ summary: string; model: string }>({
    operation: 'ai.summarizeAnnouncement',
    orgId,
    input: {
      announcement,
      maxLength,
    },
  })

  if (!response.ok) {
    return {
      success: false,
      traceId: response.traceId,
      error: response.error.message,
    }
  }

  return {
    success: true,
    summary: response.data.summary,
    traceId: response.traceId,
  }
}
