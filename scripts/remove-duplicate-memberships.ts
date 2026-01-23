import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function removeDuplicates() {
  console.log('🔍 Finding duplicate memberships...\n');

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const seen = new Map();
  const toDelete = [];

  memberships.forEach(m => {
    const key = `${m.user_id}-${m.org_id}-${m.role}`;
    if (seen.has(key)) {
      // This is a duplicate - keep the first one, delete this one
      toDelete.push(m.id);
      console.log(`Found duplicate: user ${m.user_id.substring(0, 8)}... → org ${m.org_id.substring(0, 8)}... (${m.role})`);
    } else {
      seen.set(key, m);
    }
  });

  if (toDelete.length === 0) {
    console.log('✓ No duplicates found');
    return;
  }

  console.log(`\n🗑️ Deleting ${toDelete.length} duplicate records...\n`);

  for (const id of toDelete) {
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`  ✗ Failed to delete ${id}:`, deleteError.message);
    } else {
      console.log(`  ✓ Deleted ${id}`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

removeDuplicates();
