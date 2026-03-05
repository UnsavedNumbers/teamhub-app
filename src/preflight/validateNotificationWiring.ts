// @ts-nocheck
import { REQUIRED_NOTIFICATION_OUTBOX_COLUMNS } from './contracts'
import { fail, getColumns, getForeignKeys, getIndexes, resolveTables } from './helpers'
import type { Validator } from './types'

export const validateNotificationWiring: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const columns = await getColumns(context)
  const foreignKeys = await getForeignKeys(context)
  const indexes = await getIndexes(context)

  const notificationTypes = resolved.get('notification_types')
  const emailTemplates = resolved.get('email_templates')
  const preferences = resolved.get('user_notification_preferences')
  const outbox = resolved.get('notifications_outbox')

  if (!notificationTypes || !emailTemplates || !preferences || !outbox) {
    failures.push(fail('validateNotificationWiring', 'Cannot validate notification wiring because required tables are missing'))
    return failures
  }

  const { rows: missingTemplates } = await context.client.query<{ key: string }>(`
    SELECT nt.key
    FROM ${notificationTypes.schema}.${notificationTypes.table} nt
    LEFT JOIN ${emailTemplates.schema}.${emailTemplates.table} et
      ON et.notification_type_id = nt.id
     AND COALESCE(et.is_active, TRUE)
    WHERE nt.supports_email = TRUE
    GROUP BY nt.id, nt.key
    HAVING COUNT(et.id) = 0
  `)

  for (const row of missingTemplates) {
    failures.push(
      fail(
        'validateNotificationWiring',
        `Notification type supports email but has no active template: ${row.key}`,
      ),
    )
  }

  const notificationTypeColumn = columns.find(
    (column) =>
      column.table_schema === emailTemplates.schema &&
      column.table_name === emailTemplates.table &&
      column.column_name === 'notification_type_id',
  )

  if (!notificationTypeColumn) {
    failures.push(
      fail('validateNotificationWiring', `Missing column: ${emailTemplates.schema}.${emailTemplates.table}.notification_type_id`),
    )
  } else if (notificationTypeColumn.is_nullable === 'YES') {
    failures.push(
      fail(
        'validateNotificationWiring',
        `Column must be NOT NULL: ${emailTemplates.schema}.${emailTemplates.table}.notification_type_id`,
      ),
    )
  }

  const preferenceFk = foreignKeys.some(
    (fk) =>
      fk.table_schema === preferences.schema &&
      fk.table_name === preferences.table &&
      fk.column_name === 'notification_type_id' &&
      fk.ref_schema === notificationTypes.schema &&
      fk.ref_table === notificationTypes.table &&
      fk.ref_column === 'id',
  )

  if (!preferenceFk) {
    failures.push(
      fail(
        'validateNotificationWiring',
        `Missing FK: ${preferences.schema}.${preferences.table}.notification_type_id -> ${notificationTypes.schema}.${notificationTypes.table}.id`,
      ),
    )
  }

  for (const columnName of REQUIRED_NOTIFICATION_OUTBOX_COLUMNS) {
    const columnExists = columns.some(
      (column) =>
        column.table_schema === outbox.schema &&
        column.table_name === outbox.table &&
        column.column_name === columnName,
    )

    if (!columnExists) {
      failures.push(fail('validateNotificationWiring', `Missing column: ${outbox.schema}.${outbox.table}.${columnName}`))
    }
  }

  const uniqueIdempotency = indexes.some(
    (index) =>
      index.schema_name === outbox.schema &&
      index.table_name === outbox.table &&
      index.index_def.toLowerCase().includes('unique') &&
      index.columns[0] === 'idempotency_key',
  )

  if (!uniqueIdempotency) {
    failures.push(
      fail(
        'validateNotificationWiring',
        `Missing unique idempotency constraint/index: ${outbox.schema}.${outbox.table}(idempotency_key)`,
      ),
    )
  }

  return failures
}


