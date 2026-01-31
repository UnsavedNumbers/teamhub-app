/**
 * Audit Log Mapper
 * 
 * Maps admin_event_logs view data to AdminAuditLog interface format
 * for backward compatibility with existing UI code.
 */

import type { AdminAuditLog } from '../types/platformAdmin.types'

/**
 * Raw event log row from admin_event_logs view
 */
export interface AdminEventLog {
  id: string | null
  actor_user_id: string | null
  actor_email: string | null
  actor_name: string | null
  event_type: string | null
  target_entity_type: string | null
  target_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  org_id: string | null
  organization_name: string | null
  category: string | null
  actor_role: string | null
  ip_address: string | null
  user_agent: string | null
}

/**
 * Map admin_event_logs view row to AdminAuditLog format
 * @param eventLog - Raw event log from admin_event_logs view
 * @returns AdminAuditLog format for UI consumption
 */
export function mapEventLogToAuditLog(eventLog: AdminEventLog): AdminAuditLog {
  return {
    id: eventLog.id || '',
    actor_id: eventLog.actor_user_id || null,
    actor_email: eventLog.actor_email || null,
    actor_name: eventLog.actor_name || null,
    // Map event_type to action for backward compatibility
    action: eventLog.event_type || '',
    // Map target_entity_type to entity_type
    entity_type: eventLog.target_entity_type || '',
    // Map target_entity_id to entity_id
    entity_id: eventLog.target_entity_id || '',
    metadata: eventLog.metadata || {},
    created_at: eventLog.created_at || new Date().toISOString(),
  }
}

/**
 * Map array of event logs to AdminAuditLog format
 * @param eventLogs - Array of raw event logs from admin_event_logs view
 * @returns Array of AdminAuditLog format
 */
export function mapEventLogsToAuditLogs(eventLogs: AdminEventLog[]): AdminAuditLog[] {
  return eventLogs.map(mapEventLogToAuditLog)
}
