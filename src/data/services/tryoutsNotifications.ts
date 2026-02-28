import { supabase } from '../../lib/supabase'
import { notifyUsers, type NotifyUsersResult } from './notificationServiceCore'

interface TryoutNotificationBase {
  orgId: string
  tryoutId: string
  tryoutTitle: string
  linkUrl?: string
  metadata?: Record<string, unknown>
}

interface GuardianTryoutNotificationInput extends TryoutNotificationBase {
  guardianUserIds: string[]
  athleteName: string
}

interface EvaluatorNotificationInput extends TryoutNotificationBase {
  coachUserIds: string[]
}

const supabaseAny = supabase as any

function uniqueUserIds(userIds: string[]): string[] {
  return Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0)))
}

async function notifyGuardians(
  action:
    | 'tryout_registration_confirmed'
    | 'tryout_payment_received'
    | 'tryout_waitlisted'
    | 'tryout_promoted_from_waitlist'
    | 'tryout_reminder_x_days'
    | 'tryout_reminder_day_before'
    | 'tryout_day_of_reminder'
    | 'tryout_results_published',
  title: string,
  body: string,
  input: GuardianTryoutNotificationInput,
): Promise<NotifyUsersResult> {
  return notifyUsers({
    userIds: uniqueUserIds(input.guardianUserIds),
    orgId: input.orgId,
    action,
    roleContext: 'guardian',
    title,
    body,
    entityType: 'tryout',
    entityId: input.tryoutId,
    linkUrl: input.linkUrl ?? `/portal/tryouts/${input.tryoutId}`,
    metadata: {
      tryout_id: input.tryoutId,
      tryout_title: input.tryoutTitle,
      athlete_name: input.athleteName,
      ...(input.metadata ?? {}),
    },
  })
}

async function notifyEvaluators(
  action: 'tryout_evaluator_assigned' | 'tryout_evaluation_due',
  title: string,
  body: string,
  input: EvaluatorNotificationInput,
): Promise<NotifyUsersResult> {
  return notifyUsers({
    userIds: uniqueUserIds(input.coachUserIds),
    orgId: input.orgId,
    action,
    roleContext: 'coach',
    title,
    body,
    entityType: 'tryout',
    entityId: input.tryoutId,
    linkUrl: input.linkUrl ?? `/admin/tryouts/${input.tryoutId}/evaluation`,
    metadata: {
      tryout_id: input.tryoutId,
      tryout_title: input.tryoutTitle,
      ...(input.metadata ?? {}),
    },
  })
}

export async function sendRegistrationConfirmation(input: GuardianTryoutNotificationInput): Promise<NotifyUsersResult> {
  return notifyGuardians(
    'tryout_registration_confirmed',
    'Tryout registration confirmed',
    `${input.athleteName} is registered for ${input.tryoutTitle}.`,
    input,
  )
}

export async function sendPaymentConfirmation(
  input: GuardianTryoutNotificationInput & { amountLabel: string; receiptId?: string },
): Promise<NotifyUsersResult> {
  return notifyGuardians(
    'tryout_payment_received',
    'Tryout payment received',
    `Payment ${input.amountLabel} was received for ${input.athleteName}.`,
    {
      ...input,
      metadata: {
        ...(input.metadata ?? {}),
        amount: input.amountLabel,
        receipt_id: input.receiptId ?? null,
      },
    },
  )
}

export async function sendWaitlistNotification(input: GuardianTryoutNotificationInput): Promise<NotifyUsersResult> {
  return notifyGuardians(
    'tryout_waitlisted',
    'Tryout waitlist update',
    `${input.athleteName} is currently waitlisted for ${input.tryoutTitle}.`,
    input,
  )
}

export async function sendPromotionNotification(
  input: GuardianTryoutNotificationInput & { responseDeadline?: string },
): Promise<NotifyUsersResult> {
  return notifyGuardians(
    'tryout_promoted_from_waitlist',
    'Tryout spot available',
    `A spot opened for ${input.athleteName} in ${input.tryoutTitle}.`,
    {
      ...input,
      metadata: {
        ...(input.metadata ?? {}),
        response_deadline: input.responseDeadline ?? null,
      },
    },
  )
}

export async function sendReminderNotifications(
  input: GuardianTryoutNotificationInput & { reminderType: 'x_days' | 'day_before' | 'day_of'; daysUntil?: number },
): Promise<NotifyUsersResult> {
  if (input.reminderType === 'x_days') {
    return notifyGuardians(
      'tryout_reminder_x_days',
      'Tryout reminder',
      `${input.athleteName} has ${input.tryoutTitle} in ${input.daysUntil ?? '?'} day(s).`,
      input,
    )
  }
  if (input.reminderType === 'day_before') {
    return notifyGuardians(
      'tryout_reminder_day_before',
      'Tryout reminder for tomorrow',
      `${input.athleteName} has ${input.tryoutTitle} tomorrow.`,
      input,
    )
  }
  return notifyGuardians(
    'tryout_day_of_reminder',
    'Tryout reminder for today',
    `${input.athleteName} has ${input.tryoutTitle} today.`,
    input,
  )
}

export async function sendResultsNotification(
  input: GuardianTryoutNotificationInput & { resultStatus: string },
): Promise<NotifyUsersResult> {
  return notifyGuardians(
    'tryout_results_published',
    'Tryout results published',
    `Results are now available for ${input.athleteName} in ${input.tryoutTitle}.`,
    {
      ...input,
      metadata: {
        ...(input.metadata ?? {}),
        result_status: input.resultStatus,
      },
    },
  )
}

export async function sendEvaluatorAssignment(input: EvaluatorNotificationInput): Promise<NotifyUsersResult> {
  return notifyEvaluators(
    'tryout_evaluator_assigned',
    'You were assigned as a tryout evaluator',
    `You are assigned to evaluate athletes for ${input.tryoutTitle}.`,
    input,
  )
}

export async function sendEvaluationDueReminder(
  input: EvaluatorNotificationInput & { pendingCount: number; dueAt?: string },
): Promise<NotifyUsersResult> {
  return notifyEvaluators(
    'tryout_evaluation_due',
    'Tryout evaluations due',
    `You have ${input.pendingCount} pending evaluations for ${input.tryoutTitle}.`,
    {
      ...input,
      metadata: {
        ...(input.metadata ?? {}),
        pending_count: input.pendingCount,
        due_at: input.dueAt ?? null,
      },
    },
  )
}

export async function getGuardianUserIdsForRegistration(registrationId: string): Promise<string[]> {
  if (!registrationId) return []

  const { data } = await supabaseAny
    .from('tryout_registrations')
    .select('family_id')
    .eq('id', registrationId)
    .maybeSingle()

  if (!data?.family_id) return []

  const { data: familyMembers } = await supabaseAny
    .from('family_members')
    .select('user_id')
    .eq('family_id', data.family_id)
    .not('user_id', 'is', null)

  return uniqueUserIds((familyMembers ?? []).map((row: { user_id: string | null }) => row.user_id ?? ''))
}
