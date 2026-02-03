-- Check Stripe Connect configuration for Springfield org
SELECT 
  id,
  name,
  slug,
  payout_account_id,
  payouts_enabled,
  stripe_payouts_enabled,
  stripe_payout_status,
  stripe_account_type
FROM organizations
WHERE slug = 'springfield';

-- Check if any ticketed events exist for Springfield
SELECT 
  te.id,
  te.title,
  te.status,
  te.org_id,
  o.name as org_name,
  o.payout_account_id
FROM ticketed_events te
JOIN organizations o ON o.id = te.org_id
WHERE o.slug = 'springfield';
