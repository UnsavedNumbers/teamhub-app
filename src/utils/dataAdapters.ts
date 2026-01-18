// Data Adapter Functions
// Transform Supabase data types to Material Dashboard component formats
// This ensures type safety and consistent data formatting

import type { SupabaseExtended } from '../lib/supabase.extended.types'

// Type definitions for Material Dashboard table rows
export interface MaterialTableRow {
  id: string
  [key: string]: string | number | boolean | null | undefined
}

// Fee Assignment Row Types
type FeeAssignmentRow = SupabaseExtended['public']['Tables']['fee_assignments']['Row']
type FeeRow = SupabaseExtended['public']['Tables']['fees']['Row']
type PaymentRow = SupabaseExtended['public']['Tables']['payments']['Row']
type TeamRow = SupabaseExtended['public']['Tables']['teams']['Row']
type ChildRow = SupabaseExtended['public']['Tables']['children']['Row']
type UserRow = SupabaseExtended['public']['Tables']['users']['Row']

// Fee Assignment Adapter
export interface FeeAssignmentTableRow extends MaterialTableRow {
  id: string
  childName: string
  parentName: string
  feeTitle: string
  amount: string // Formatted currency
  status: string
  dueDate: string // Formatted date
  balance: string // Formatted currency
  paidTotal: string // Formatted currency
}

export function adaptFeeAssignmentToTableRow(
  assignment: FeeAssignmentRow,
  child: { first_name: string; last_name: string } | null,
  parent: { display_name: string | null } | null,
  fee: { title: string } | null
): FeeAssignmentTableRow {
  return {
    id: assignment.id,
    childName: child ? `${child.first_name} ${child.last_name}` : 'N/A',
    parentName: parent?.display_name || 'N/A',
    feeTitle: fee?.title || 'N/A',
    amount: `$${(assignment.amount_cents / 100).toFixed(2)}`,
    status: assignment.status,
    dueDate: assignment.due_date 
      ? new Date(assignment.due_date).toLocaleDateString()
      : 'N/A',
    balance: `$${(assignment.balance_cents / 100).toFixed(2)}`,
    paidTotal: `$${(assignment.paid_cents_total / 100).toFixed(2)}`,
  }
}

// Payment Adapter
export interface PaymentTableRow extends MaterialTableRow {
  id: string
  parentName: string
  amount: string
  status: string
  paidDate: string
  paymentMethod: string
  platformFee: string
}

export function adaptPaymentToTableRow(
  payment: PaymentRow,
  parent: { display_name: string | null } | null
): PaymentTableRow {
  return {
    id: payment.id,
    parentName: parent?.display_name || 'N/A',
    amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
    status: payment.status,
    paidDate: payment.paid_at 
      ? new Date(payment.paid_at).toLocaleDateString()
      : 'N/A',
    paymentMethod: payment.stripe_payment_intent_id ? 'Online' : 'Offline',
    platformFee: `$${(payment.platform_fee_cents / 100).toFixed(2)}`,
  }
}

// Team Adapter
export interface TeamTableRow extends MaterialTableRow {
  id: string
  name: string
  playerCount: number
  seasonCount: number
  eventCount: number
}

export function adaptTeamToTableRow(
  team: TeamRow,
  playerCount: number = 0,
  seasonCount: number = 0,
  eventCount: number = 0
): TeamTableRow {
  return {
    id: team.id,
    name: team.name,
    playerCount,
    seasonCount,
    eventCount,
  }
}

// User Adapter
export interface UserTableRow extends MaterialTableRow {
  id: string
  name: string
  email: string
  phone: string
  role: string
  familyName: string
}

export function adaptUserToTableRow(
  user: UserRow,
  family: { name: string } | null
): UserTableRow {
  return {
    id: user.id,
    name: user.display_name || user.email || 'N/A',
    email: user.email || 'N/A',
    phone: user.phone || 'N/A',
    role: user.role || 'parent',
    familyName: family?.name || 'N/A',
  }
}

// Child Adapter
export interface ChildTableRow extends MaterialTableRow {
  id: string
  name: string
  age: number | null
  familyName: string
  teams: string
  paymentStatus: string
}

export function adaptChildToTableRow(
  child: ChildRow,
  family: { name: string } | null,
  teams: string[] = [],
  paymentStatus: string = 'unknown'
): ChildTableRow {
  const birthdate = child.birthdate ? new Date(child.birthdate) : null
  const age = birthdate 
    ? Math.floor((Date.now() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null

  return {
    id: child.id,
    name: `${child.first_name} ${child.last_name}`,
    age,
    familyName: family?.name || 'N/A',
    teams: teams.join(', ') || 'None',
    paymentStatus,
  }
}

// Fee Template Adapter
export interface FeeTableRow extends MaterialTableRow {
  id: string
  title: string
  feeType: string
  amount: string
  season: string
  status: string
  dueDate: string
  assignmentsCount: number
}

export function adaptFeeToTableRow(
  fee: FeeRow,
  season: { name: string } | null,
  assignmentsCount: number = 0
): FeeTableRow {
  return {
    id: fee.id,
    title: fee.title,
    feeType: fee.fee_type,
    amount: `$${(fee.amount_cents / 100).toFixed(2)}`,
    season: season?.name || 'Organization-wide',
    status: fee.status,
    dueDate: fee.due_date 
      ? new Date(fee.due_date).toLocaleDateString()
      : 'N/A',
    assignmentsCount,
  }
}

// Currency formatting helper
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Date formatting helper
export function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString()
}

// Date time formatting helper
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}
