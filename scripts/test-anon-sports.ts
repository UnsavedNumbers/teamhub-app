import { createClient } from '@supabase/supabase-js';

// Use ANON key (like frontend)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // Using anon key, not service role
);

console.log('Testing with ANON key (like frontend does)...\n');

// Try to get system sports
console.log('1. Getting system sports...');
const { data: systemSports, error: ssError } = await supabase
  .from('sports')
  .select('*')
  .is('org_id', null)
  .order('name');

if (ssError) {
  console.log('❌ ERROR:', ssError.message);
  console.log('Details:', JSON.stringify(ssError, null, 2));
} else {
  console.log('✓ Success! Found', systemSports?.length, 'system sports');
  systemSports?.slice(0, 3).forEach(s => console.log(`  - ${s.name}`));
}
