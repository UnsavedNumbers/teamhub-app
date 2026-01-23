import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function analyzeUser() {
  console.log('🔍 Analyzing admin-org1@test.com...\n');

  // Get user ID
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin-org1@test.com');

  if (!users || users.length === 0) {
    // Try auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers.users.find(u => u.email === 'admin-org1@test.com');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}\n`);

    // Get all memberships
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('id, org_id, role, created_at, organizations(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log(`Total memberships: ${memberships?.length || 0}\n`);

    memberships?.forEach((m, i) => {
      console.log(`${i + 1}. Membership ID: ${m.id}`);
      console.log(`   Org ID: ${m.org_id}`);
      console.log(`   Org Name: ${m.organizations?.name || 'Unknown'}`);
      console.log(`   Role: ${m.role}`);
      console.log(`   Created: ${m.created_at}`);
      console.log('');
    });

    // Get all organizations named Springfield
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .ilike('name', '%Springfield%')
      .order('created_at', { ascending: false });

    console.log(`\nOrganizations matching "Springfield": ${orgs?.length || 0}\n`);
    orgs?.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Created: ${org.created_at}`);
      console.log('');
    });
  }
}

analyzeUser();
