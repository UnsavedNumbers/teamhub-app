import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const { data: orgs } = await supabase
  .from('organizations')
  .select('id, name')
  .ilike('name', '%Springfield%');

console.log('Springfield Organizations:', JSON.stringify(orgs, null, 2));

const { data: authUsers } = await supabase.auth.admin.listUsers();
const admin1 = authUsers.users.find(u => u.email === 'admin-org1@test.com');

if (admin1) {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('*, organizations(name)')
    .eq('user_id', admin1.id);

  console.log(`\nMemberships for admin-org1@test.com:`, JSON.stringify(memberships, null, 2));
}
