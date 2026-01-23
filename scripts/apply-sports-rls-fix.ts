import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

// Get connection string from Supabase dashboard: Settings > Database > Connection string (Direct connection)
// Format: postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
const connectionString = `postgresql://postgres.njdeuehessdffwmmzmcs:${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const sql = postgres(connectionString);

console.log('🔧 Fixing sports RLS policies...\n');

try {
  // Drop existing policies
  await sql`DROP POLICY IF EXISTS "Users can view sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "Org members can view sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can create sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can update sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can manage sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can soft delete sports" ON sports`;
  await sql`DROP POLICY IF EXISTS "System sports only via migration" ON sports`;
  await sql`DROP POLICY IF EXISTS "Anyone can view system sports and org sports" ON sports`;
  
  console.log('✓ Dropped old sports policies');

  // Create new SELECT policy
  await sql`
    CREATE POLICY "Anyone can view system sports and org sports"
    ON sports
    FOR SELECT
    USING (
      (is_system = TRUE AND org_id IS NULL)
      OR
      (org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      ))
    )
  `;
  
  console.log('✓ Created new sports SELECT policy');

  // Drop and recreate organization_sports policies
  await sql`DROP POLICY IF EXISTS "Org members can view organization sports" ON organization_sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can link system sports" ON organization_sports`;
  await sql`DROP POLICY IF EXISTS "Org admins can unlink sports" ON organization_sports`;
  
  console.log('✓ Dropped old organization_sports policies');

  await sql`
    CREATE POLICY "Org members can view organization sports"
    ON organization_sports
    FOR SELECT
    USING (
      org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  `;

  await sql`
    CREATE POLICY "Org admins can link system sports"
    ON organization_sports
    FOR INSERT
    WITH CHECK (
      org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'org_admin'
      )
      AND sport_id IN (
        SELECT id FROM sports WHERE is_system = TRUE
      )
    )
  `;

  await sql`
    CREATE POLICY "Org admins can unlink sports"
    ON organization_sports
    FOR DELETE
    USING (
      org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'org_admin'
      )
    )
  `;
  
  console.log('✓ Created new organization_sports policies');
  console.log('\n✅ RLS policies updated successfully!');
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await sql.end();
}

// Test the fix
console.log('\n🧪 Testing fix with anon key...');

const anonSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data: sports, error: testError } = await anonSupabase
  .from('sports')
  .select('*')
  .is('org_id', null)
  .order('name')
  .limit(3);

if (testError) {
  console.log('❌ Still failing:', testError.message);
} else {
  console.log('✅ Success! System sports query works now:');
  sports?.forEach(s => console.log(`  - ${s.name}`));
}
