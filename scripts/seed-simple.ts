import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing environment variables. Please set:');
  console.error('  VITE_SUPABASE_URL');
  console.error('  VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PASSWORD = 'TestPassword123!';

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log(`📡 Connected to: ${url}\n`);

  // ========== STEP 1: CREATE ORGANIZATIONS ==========
  console.log('=== Creating Organizations ===');
  const orgSpringfield = { id: randomUUID(), name: 'Springfield Youth Sports', status: 'active' };
  const orgRiverside = { id: randomUUID(), name: 'Riverside Athletics', status: 'active' };

  for (const org of [orgSpringfield, orgRiverside]) {
    const { error } = await supabase.from('organizations').upsert(org, { onConflict: 'id' });
    if (error) console.error(` ✗ ${org.name}:`, error.message);
    else console.log(` ✓ ${org.name}`);
  }

  // ========== STEP 2: CREATE USERS ==========
  console.log('\n=== Creating Test Users ===');

  const testUsers = [
    { email: 'platform-admin@test.com', isPlatformAdmin: true, roles: [] },
    { email: 'admin-org1@test.com', roles: [{ org: orgSpringfield.id, role: 'org_admin' }] },
    { email: 'admin-org2@test.com', roles: [{ org: orgRiverside.id, role: 'org_admin' }] },
    { email: 'coach-org1@test.com', roles: [{ org: orgSpringfield.id, role: 'coach' }] },
    { email: 'parent-org1@test.com', roles: [{ org: orgSpringfield.id, role: 'parent' }], needsFamily: true },
  ];

  for (const user of testUsers) {
    // Check if user exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    let userId = existing?.users?.find(u => u.email === user.email)?.id;

    if (!userId) {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error(` ✗ ${user.email}:`, error.message);
        continue;
      }

      userId = newUser.user!.id;
      console.log(` ✓ Created: ${user.email}`);
    } else {
      console.log(` ✓ Exists: ${user.email}`);
    }

    // Create family for parents
    if (user.needsFamily) {
      const { error: familyError } = await supabase.from('families').upsert({
        id: randomUUID(),
        primary_guardian_name: user.email.split('@')[0],
      }, { onConflict: 'id' });

      if (familyError && !familyError.message.includes('duplicate')) {
        console.error(`   ✗ Family creation failed:`, familyError.message);
      }
    }

    // Create organization memberships
    for (const membership of user.roles) {
      const { error } = await supabase.from('organization_members').upsert({
        user_id: userId,
        org_id: membership.org,
        role: membership.role,
      }, { onConflict: 'user_id,org_id,role' });

      if (error && !error.message.includes('duplicate')) {
        console.error(`   ✗ ${membership.role} @ org:`, error.message);
      } else {
        console.log(`   → Role: ${membership.role}`);
      }
    }
  }

  console.log('\n✅ Database seeding complete!\n');
  console.log('📋 Test User Credentials:');
  console.log('━'.repeat(60));
  console.log('  platform-admin@test.com  / TestPassword123!');
  console.log('  admin-org1@test.com      / TestPassword123!');
  console.log('  admin-org2@test.com      / TestPassword123!');
  console.log('  coach-org1@test.com      / TestPassword123!');
  console.log('  parent-org1@test.com     / TestPassword123!');
  console.log('━'.repeat(60));
  console.log(`\nOrganization IDs:`);
  console.log(`  Springfield: ${orgSpringfield.id}`);
  console.log(`  Riverside:   ${orgRiverside.id}\n`);
}

main().catch(console.error);
