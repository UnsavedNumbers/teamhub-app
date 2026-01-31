import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧹 Cleaning up duplicate organizations...\n');

// Keep the first Springfield (older one), delete the second
const keepSpringfield = '2ce27e3f-4cbd-4979-859b-021728956f45';
const deleteSpringfield = '0ea9824e-1d53-4ea8-86dc-4f55fed05654';

// Check Riverside too
const { data: riversides } = await supabase
  .from('organizations')
  .select('id, name, created_at')
  .ilike('name', '%Riverside%')
  .order('created_at', { ascending: true });

console.log('Riverside Organizations:', riversides);

let keepRiverside = null;
let deleteRiverside = null;

if (riversides && riversides.length > 1) {
  keepRiverside = riversides[0].id;
  deleteRiverside = riversides[1].id;
  console.log(`\nFound duplicate Riverside orgs`);
  console.log(`  Keep: ${keepRiverside}`);
  console.log(`  Delete: ${deleteRiverside}`);
}

// Delete memberships for duplicate orgs
console.log('\n📋 Deleting memberships for duplicate organizations...');

const { data: deletedMembers } = await supabase
  .from('organization_members')
  .delete()
  .in('org_id', [deleteSpringfield, deleteRiverside].filter(Boolean))
  .select();

console.log(`  Deleted ${deletedMembers?.length || 0} memberships`);

// Delete the duplicate organizations
console.log('\n🏢 Deleting duplicate organizations...');

const { error: deleteError } = await supabase
  .from('organizations')
  .delete()
  .in('id', [deleteSpringfield, deleteRiverside].filter(Boolean));

if (deleteError) {
  console.error('  Error:', deleteError.message);
} else {
  console.log(`  ✓ Deleted duplicate organizations`);
}

console.log('\n✅ Cleanup complete!');
console.log('\nRemaining organizations:');

const { data: remaining } = await supabase
  .from('organizations')
  .select('id, name')
  .order('name');

remaining?.forEach(org => {
  console.log(`  - ${org.name} (${org.id})`);
});
