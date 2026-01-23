import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PASSWORD = 'TestPassword123!';

// ===== STEP 1: Seed Organization Data =====
async function seedOrganizationData() {
  console.log('\n=== Seeding Organization Data ===');

  // Organizations (use UUIDs)
  const orgSpringfieldId = '11111111-1111-1111-1111-111111111111';
  const orgRiversideId = '22222222-2222-2222-2222-222222222222';
  const orgMountainId = '33333333-3333-3333-3333-333333333333';

  const orgs = [
    { id: orgSpringfieldId, name: 'Springfield Youth Sports', status: 'active' },
    { id: orgRiversideId, name: 'Riverside Athletics', status: 'active' },
    { id: orgMountainId, name: 'Mountain View Sports Club', status: 'active' }
  ];

  for (const org of orgs) {
    const { error } = await supabase.from('organizations').upsert(org, { onConflict: 'id' });
    if (error) console.error(`Error creating org ${org.name}:`, error.message);
    else console.log(`✓ Organization: ${org.name}`);
  }

  // Organization settings
  const orgSettings = [
    { org_id: orgSpringfieldId, organization_name: 'Springfield Youth Sports', timezone: 'America/Chicago', status: 'active' },
    { org_id: orgRiversideId, organization_name: 'Riverside Athletics', timezone: 'America/Los_Angeles', status: 'active' },
    { org_id: orgMountainId, organization_name: 'Mountain View Sports Club', timezone: 'America/Denver', status: 'active' }
  ];

  for (const settings of orgSettings) {
    const { error } = await supabase.from('organization_settings').upsert(settings, { onConflict: 'org_id' });
    if (error) console.error(`Error creating settings:`, error.message);
  }

  // Sports
  const soccerId = randomUUID();
  const basketballId = randomUUID();
  const baseballId = randomUUID();
  const volleyballId = randomUUID();

  const sports = [
    { id: soccerId, org_id: null, name: 'Soccer', icon: 'soccer-ball' },
    { id: basketballId, org_id: null, name: 'Basketball', icon: 'basketball' },
    { id: baseballId, org_id: null, name: 'Baseball', icon: 'baseball' },
    { id: volleyballId, org_id: null, name: 'Volleyball', icon: 'volleyball' }
  ];

  for (const sport of sports) {
    const { error } = await supabase.from('sports').upsert(sport, { onConflict: 'id' });
    if (error) console.error(`Error creating sport:`, error.message);
    else console.log(`✓ Sport: ${sport.name}`);
  }

  // Programs
  const progSocRecId = randomUUID();
  const progSocCompId = randomUUID();
  const progBbYouthId = randomUUID();
  const progBaseU12Id = randomUUID();

  const programs = [
    { id: progSocRecId, org_id: orgSpringfieldId, sport_id: soccerId, name: 'Recreational Soccer' },
    { id: progSocCompId, org_id: orgSpringfieldId, sport_id: soccerId, name: 'Competitive Soccer' },
    { id: progBbYouthId, org_id: orgRiversideId, sport_id: basketballId, name: 'Youth Basketball' },
    { id: progBaseU12Id, org_id: orgMountainId, sport_id: baseballId, name: 'U12 Baseball' }
  ];

  for (const program of programs) {
    const { error } = await supabase.from('programs').upsert(program, { onConflict: 'id' });
    if (error) console.error(`Error creating program:`, error.message);
    else console.log(`✓ Program: ${program.name}`);
  }

  // Levels
  const lvlSocU10Id = randomUUID();
  const lvlSocU12Id = randomUUID();
  const lvlBbU14Id = randomUUID();
  const lvlBaseU12Id = randomUUID();

  const levels = [
    { id: lvlSocU10Id, org_id: orgSpringfieldId, program_id: progSocRecId, name: 'U10', level_type: 'age_based' },
    { id: lvlSocU12Id, org_id: orgSpringfieldId, program_id: progSocCompId, name: 'U12', level_type: 'age_based' },
    { id: lvlBbU14Id, org_id: orgRiversideId, program_id: progBbYouthId, name: 'U14', level_type: 'age_based' },
    { id: lvlBaseU12Id, org_id: orgMountainId, program_id: progBaseU12Id, name: 'U12', level_type: 'age_based' }
  ];

  for (const level of levels) {
    const { error } = await supabase.from('levels').upsert(level, { onConflict: 'id' });
    if (error) console.error(`Error creating level:`, error.message);
    else console.log(`✓ Level: ${level.name}`);
  }

  // Seasons
  const now = new Date();
  const seasonSpringId = randomUUID();
  const seasonSummerId = randomUUID();
  const seasonFallId = randomUUID();

  const seasons = [
    {
      id: seasonSpringId,
      org_id: orgSpringfieldId,
      name: 'Spring Season',
      start_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: seasonSummerId,
      org_id: orgRiversideId,
      name: 'Summer Season',
      start_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: seasonFallId,
      org_id: orgMountainId,
      name: 'Fall Season',
      start_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];

  for (const season of seasons) {
    const { error } = await supabase.from('seasons').upsert(season, { onConflict: 'id' });
    if (error) console.error(`Error creating season:`, error.message);
    else console.log(`✓ Season: ${season.name}`);
  }

  // Teams
  const teamSocU12Id = randomUUID();
  const teamSocU10Id = randomUUID();
  const teamBbU14Id = randomUUID();
  const teamBaseU12Id = randomUUID();

  const teams = [
    { id: teamSocU12Id, org_id: orgSpringfieldId, name: 'U12 Lions', level_id: lvlSocU12Id, program_id: progSocCompId, sport_id: soccerId, is_active: true },
    { id: teamSocU10Id, org_id: orgSpringfieldId, name: 'U10 Eagles', level_id: lvlSocU10Id, program_id: progSocRecId, sport_id: soccerId, is_active: true },
    { id: teamBbU14Id, org_id: orgRiversideId, name: 'U14 Hoops', level_id: lvlBbU14Id, program_id: progBbYouthId, sport_id: basketballId, is_active: true },
    { id: teamBaseU12Id, org_id: orgMountainId, name: 'U12 Bears', level_id: lvlBaseU12Id, program_id: progBaseU12Id, sport_id: baseballId, is_active: true }
  ];

  for (const team of teams) {
    const { error } = await supabase.from('teams').upsert(team, { onConflict: 'id' });
    if (error) console.error(`Error creating team:`, error.message);
    else console.log(`✓ Team: ${team.name}`);
  }

  // Team seasons
  const teamSeasons = [
    { team_id: teamSocU12Id, season_id: seasonSpringId, is_active: true },
    { team_id: teamSocU10Id, season_id: seasonSpringId, is_active: true },
    { team_id: teamBbU14Id, season_id: seasonSummerId, is_active: true },
    { team_id: teamBaseU12Id, season_id: seasonFallId, is_active: true }
  ];

  for (const ts of teamSeasons) {
    const { error } = await supabase.from('team_seasons').upsert(ts, { onConflict: 'team_id,season_id' });
    if (error) console.error(`Error creating team season:`, error.message);
  }

  // Fees
  const fees = [
    {
      id: randomUUID(),
      org_id: orgSpringfieldId,
      title: 'Spring Soccer Registration',
      amount_cents: 15000,
      currency: 'usd',
      status: 'published',
      scope: 'team',
      fee_type: 'registration',
      visibility: 'all_parents',
      due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: randomUUID(),
      org_id: orgRiversideId,
      title: 'Summer Hoops Registration',
      amount_cents: 12500,
      currency: 'usd',
      status: 'published',
      scope: 'team',
      fee_type: 'registration',
      visibility: 'all_parents',
      due_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];

  for (const fee of fees) {
    const { error } = await supabase.from('fees').upsert(fee, { onConflict: 'id' });
    if (error) console.error(`Error creating fee:`, error.message);
    else console.log(`✓ Fee: ${fee.title}`);
  }

  // Uniform kits
  const kitSocU12Id = randomUUID();
  const kitBbU14Id = randomUUID();

  const uniformKits = [
    { id: kitSocU12Id, team_id: teamSocU12Id, season_id: seasonSpringId, name: 'U12 Soccer Kit' },
    { id: kitBbU14Id, team_id: teamBbU14Id, season_id: seasonSummerId, name: 'U14 Hoops Kit' }
  ];

  for (const kit of uniformKits) {
    const { error } = await supabase.from('uniform_kits').upsert(kit, { onConflict: 'id' });
    if (error) console.error(`Error creating uniform kit:`, error.message);
    else console.log(`✓ Uniform Kit: ${kit.name}`);
  }

  // Uniform items
  const uniformItems = [
    { id: randomUUID(), kit_id: kitSocU12Id, name: 'Jersey', required: true, size_options: { sizes: ['YS', 'YM', 'YL', 'AS', 'AM'] }, sort_order: 1 },
    { id: randomUUID(), kit_id: kitSocU12Id, name: 'Shorts', required: true, size_options: { sizes: ['YS', 'YM', 'YL', 'AS', 'AM'] }, sort_order: 2 },
    { id: randomUUID(), kit_id: kitBbU14Id, name: 'Jersey', required: true, size_options: { sizes: ['YM', 'YL', 'AS', 'AM', 'AL'] }, sort_order: 1 }
  ];

  for (const item of uniformItems) {
    const { error } = await supabase.from('uniform_kit_items').upsert(item, { onConflict: 'id' });
    if (error) console.error(`Error creating uniform item:`, error.message);
  }

  // Tryouts
  const tryouts = [
    {
      id: randomUUID(),
      org_id: orgSpringfieldId,
      title: 'U12 Competitive Tryout',
      tryout_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '11:00',
      location: 'Main Field',
      age_group: 'U12',
      entry_fee: 2500,
      sport: 'soccer'
    },
    {
      id: randomUUID(),
      org_id: orgRiversideId,
      title: 'U14 Elite Tryout',
      tryout_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '12:00',
      location: 'Gym 1',
      age_group: 'U14',
      entry_fee: 3000,
      sport: 'basketball'
    }
  ];

  for (const tryout of tryouts) {
    const { error } = await supabase.from('tryouts').upsert(tryout, { onConflict: 'id' });
    if (error) console.error(`Error creating tryout:`, error.message);
    else console.log(`✓ Tryout: ${tryout.title}`);
  }

  // Messages (check actual column names)
  const message = {
    id: randomUUID(),
    org_id: orgSpringfieldId,
    team_id: teamSocU12Id,
    title: 'Welcome',
    content: 'Welcome to the U12 season!' // Changed from 'body' to 'content'
  };

  const { error: msgError } = await supabase.from('messages').upsert(message, { onConflict: 'id' });
  if (msgError) console.error(`Error creating message:`, msgError.message);
  else console.log(`✓ Message created`);

  // Return IDs for use in user seeding
  return { orgSpringfieldId, orgRiversideId, orgMountainId };
}

// ===== STEP 2: Seed Users and Families =====
async function seedUsersAndFamilies(orgIds: { orgSpringfieldId: string, orgRiversideId: string, orgMountainId: string }) {
  const { orgSpringfieldId, orgRiversideId, orgMountainId } = orgIds;
  console.log('\n=== Seeding Users and Families ===');

  type RoleTuple = { userId: string; orgId: string; role: 'org_admin' | 'coach' | 'parent' };
  type SeedUser = {
    email: string;
    password: string;
    roles: RoleTuple[];
    profile?: { display_name?: string; phone?: string; family_id?: string };
  };

  const users: SeedUser[] = [
    {
      email: 'platform-admin@test.com',
      password: PASSWORD,
      roles: [],
    },
    {
      email: 'admin-org1@test.com',
      password: PASSWORD,
      roles: [{ userId: '', orgId: orgSpringfieldId, role: 'org_admin' }],
    },
    {
      email: 'admin-org2@test.com',
      password: PASSWORD,
      roles: [{ userId: '', orgId: orgRiversideId, role: 'org_admin' }],
    },
    {
      email: 'coach-org1@test.com',
      password: PASSWORD,
      roles: [{ userId: '', orgId: orgSpringfieldId, role: 'coach' }],
    },
    {
      email: 'coach-multi@test.com',
      password: PASSWORD,
      roles: [
        { userId: '', orgId: orgSpringfieldId, role: 'coach' },
        { userId: '', orgId: orgRiversideId, role: 'coach' },
      ],
    },
    {
      email: 'parent-org1@test.com',
      password: PASSWORD,
      roles: [{ userId: '', orgId: orgSpringfieldId, role: 'parent' }],
    },
    {
      email: 'parent-org2@test.com',
      password: PASSWORD,
      roles: [{ userId: '', orgId: orgRiversideId, role: 'parent' }],
    },
    {
      email: 'multi-role@test.com',
      password: PASSWORD,
      roles: [
        { userId: '', orgId: orgSpringfieldId, role: 'org_admin' },
        { userId: '', orgId: orgSpringfieldId, role: 'coach' },
      ],
    },
  ];

  for (const user of users) {
    // Check if user exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find(u => u.email === user.email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`✓ User already exists: ${user.email}`);
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error.message);
        continue;
      }

      userId = newUser.user!.id;
      console.log(`✓ Created user: ${user.email}`);
    }

    // Set platform admin flag if platform-admin email
    if (user.email === 'platform-admin@test.com') {
      const { error } = await supabase.from('users').upsert(
        { id: userId, email: user.email, role: 'platform_admin' }, // Changed to 'role' column
        { onConflict: 'id' }
      );
      if (error) console.error(`Error setting platform admin:`, error.message);
      else console.log(`  → Set as platform admin`);
    }

    // Create family if user has parent role
    const hasParentRole = user.roles.some(r => r.role === 'parent');
    if (hasParentRole) {
      const familyId = randomUUID();
      const { error: familyError } = await supabase.from('families').upsert(
        {
          id: familyId,
          primary_guardian_name: user.email.split('@')[0], // Changed from primary_contact_name
          primary_guardian_email: user.email, // Changed from primary_contact_email
        },
        { onConflict: 'id' }
      );

      if (familyError) {
        console.error(`  Error creating family:`, familyError.message);
      } else {
        console.log(`  → Created family: ${familyId}`);
      }
    }

    // Create organization memberships
    for (const role of user.roles) {
      role.userId = userId;
      const { error } = await supabase.from('organization_members').upsert(
        {
          user_id: role.userId,
          org_id: role.orgId,
          role: role.role,
        },
        { onConflict: 'user_id,org_id,role' }
      );

      if (error) {
        console.error(`  Error creating membership (${role.role} @ ${role.orgId}):`, error.message);
      } else {
        console.log(`  → Added role: ${role.role} @ ${role.orgId}`);
      }
    }
  }
}

// Main
async function main() {
  console.log('🌱 Starting database seeding...');
  console.log(`📡 Connected to: ${url}`);

  const orgIds = await seedOrganizationData();
  await seedUsersAndFamilies(orgIds);

  console.log('\n✅ Database seeding complete!');
  console.log('\nTest Users:');
  console.log('  platform-admin@test.com / TestPassword123!');
  console.log('  admin-org1@test.com / TestPassword123!');
  console.log('  coach-org1@test.com / TestPassword123!');
  console.log('  parent-org1@test.com / TestPassword123!');
}

main().catch(console.error);
