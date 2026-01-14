# Payments + Fees Migration Guide

## Overview
This document describes the comprehensive payments and fees system migrations for YouthSports.team.

## Migration Files

### 018_payments_expanded.sql
**Purpose**: Creates the complete payments and fees schema
**Size**: 803 lines, 119 DDL statements

**What it does**:
1. Updates `organizations` table with payment-related fields (Stripe Connect, billing modes, etc.)
2. Updates `seasons` table with organization_id and additional fields
3. Drops old simple `payments` table (from migration 011)
4. Creates 20+ new payment-related tables:
   - Core: `fees`, `fee_assignments`, `charges`
   - Checkout: `checkout_sessions`, `checkout_session_items`
   - Payments: `payments`, `payment_allocations`
   - Offline: `offline_payments`, `offline_payment_allocations`
   - Installments: `installment_plans`, `installment_schedules`, `installments`
   - Discounts: `discount_codes`, `discount_redemptions`
   - Waivers: `waivers`
   - Scholarships: `scholarship_programs`, `scholarship_awards`
   - Refunds: `refunds`
   - Policies: `org_payment_policies`
   - Audit: `payment_events`

### 019_payments_rls_policies.sql
**Purpose**: Implements role-based access control (RLS) for all payment tables
**Size**: 656 lines, 43 RLS policies

**Access Rules**:
- **Parents**: Can view and pay their own fees, charges, payments, refunds
- **Coaches**: Can only see payment status flags (unpaid/partial/paid) - NO amounts
- **Admins**: Full access to manage all payment operations
- **Platform Admins**: Full access via service_role key

## Applying the Migrations

### Option 1: Using Supabase CLI (Local Development)
```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase migration up

# Or reset database (applies all migrations)
supabase db reset
```

### Option 2: Using Supabase CLI (Remote)
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Manual Application
1. Connect to your Supabase database
2. Run `018_payments_expanded.sql` first
3. Then run `019_payments_rls_policies.sql`

## Important Notes

### Breaking Changes
- **Old `payments` table is dropped**: Migration 018 drops the simple payments table from migration 011
- **Old payment policies are dropped**: Policies from 017_deferred_rls_policies.sql are removed
- **New enum names**: Uses `payment_status_new` instead of `payment_status` to avoid conflicts

### Data Migration
If you have existing payment data in the old `payments` table:
1. **Export data first** before running migrations
2. Create a data migration script to transform old payment records into the new schema
3. The new schema is significantly different, so manual data transformation will be required

### Dependencies
These migrations depend on:
- `001_organizations.sql` - Organizations table
- `002_families.sql` - Families table
- `003_users.sql` - Users table (parents are users with role='parent')
- `005_seasons.sql` - Seasons table
- `006_children.sql` - Children table
- `017_deferred_rls_policies.sql` - Some RLS policies (old payments policies will be dropped)

## Verification

After applying migrations, verify:

1. **All tables created**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'fees', 'fee_assignments', 'charges', 
  'checkout_sessions', 'payments', 'offline_payments',
  'installment_plans', 'discount_codes', 'waivers',
  'scholarship_programs', 'refunds', 'payment_events'
)
ORDER BY table_name;
```

2. **All enums created**:
```sql
SELECT typname 
FROM pg_type 
WHERE typname IN (
  'org_type', 'billing_mode', 'fee_type', 'fee_status',
  'charge_type', 'payment_status_new', 'checkout_session_status'
)
ORDER BY typname;
```

3. **RLS enabled on all tables**:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%payment%' OR tablename LIKE '%fee%'
ORDER BY tablename;
```

4. **Policies created**:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'fees', 'fee_assignments', 'charges', 
  'checkout_sessions', 'payments'
)
ORDER BY tablename, policyname;
```

## Features Supported

✅ One-time fees  
✅ Installment plans (2-6 payments)  
✅ Multi-fee single checkout  
✅ Waivers (admin comp, fundraiser credits)  
✅ Scholarships (org/sponsor/district funded)  
✅ Discounts (promo codes, sibling discounts)  
✅ Partial payments  
✅ Late fees  
✅ Offline payment tracking (check/cash)  
✅ Stripe Connect integration  
✅ Audit logging  

## Next Steps

1. **Apply migrations** to your database
2. **Update TypeScript types**: Run `supabase gen types typescript --local > src/lib/database.types.ts`
3. **Implement application logic**: Build payment flows using the new schema
4. **Set up Stripe Connect**: Configure organization onboarding
5. **Test thoroughly**: Verify all payment scenarios work correctly

## Support

For issues or questions:
- Check migration logs for errors
- Verify all dependencies are in place
- Ensure RLS policies are correctly applied
- Review the schema specification document
