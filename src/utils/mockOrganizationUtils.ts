/**
 * Mock / seed organization identification.
 * Reset is supported only for mock orgs created via seed-all.ts (UUID).
 * Keep mock org UUID list in sync with supabase migration: add_reset_mock_org_rpc (is_mock_organization).
 */

/** Mock organization UUIDs from scripts/seed-all.ts (canonical for reset allow-list). */
export const MOCK_ORG_UUIDS = [
  '11111111-1111-1111-1111-111111111111', // Springfield Youth Sports
  '22222222-2222-2222-2222-222222222222', // Riverside Athletics
  '33333333-3333-3333-3333-333333333333', // Mountain View Sports Club
] as const;

/** All known mock org IDs (UUIDs + string IDs from SQL seed for display/labeling). */
const MOCK_ORG_IDS: readonly string[] = [
  ...MOCK_ORG_UUIDS,
  // String IDs from SQL migration (legacy/test envs)
  'org-springfield',
  'org-riverside',
  'org-mountain',
];

/**
 * Returns true if the given org ID is a known mock/seed organization.
 * Used for UI (e.g. showing "Reset to Seed State" only for mock orgs).
 */
export function isMockOrganization(orgId: string | null | undefined): boolean {
  if (!orgId) return false;
  return MOCK_ORG_IDS.includes(orgId);
}

/** Display names for mock orgs (UUID and string ID keys). */
export const MOCK_ORG_NAMES: Record<string, string> = {
  'org-springfield': 'Springfield Youth Sports',
  'org-riverside': 'Riverside Athletics',
  'org-mountain': 'Mountain View Sports Club',
  '11111111-1111-1111-1111-111111111111': 'Springfield Youth Sports',
  '22222222-2222-2222-2222-222222222222': 'Riverside Athletics',
  '33333333-3333-3333-3333-333333333333': 'Mountain View Sports Club',
};
