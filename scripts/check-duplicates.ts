import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function checkDuplicates() {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      user_id,
      org_id,
      role,
      organizations(name),
      users(email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total memberships:', data.length);
  console.log('\nMemberships:');
  data.forEach(m => {
    console.log(`  ${m.users?.email} → ${m.organizations?.name} (${m.role})`);
  });

  // Check for duplicates
  const seen = new Map();
  const duplicates = [];

  data.forEach(m => {
    const key = `${m.user_id}-${m.org_id}-${m.role}`;
    if (seen.has(key)) {
      duplicates.push(m);
    } else {
      seen.set(key, m);
    }
  });

  if (duplicates.length > 0) {
    console.log('\n❌ DUPLICATES FOUND:');
    duplicates.forEach(d => {
      console.log(`  ${d.users?.email} → ${d.organizations?.name} (${d.role})`);
    });
  } else {
    console.log('\n✓ No duplicates found');
  }
}

checkDuplicates();
