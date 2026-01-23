import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Check organization_sports columns
const { data: orgSports, error: osError } = await supabase
  .from('organization_sports')
  .select('*')
  .limit(1);

console.log('organization_sports table:');
if (orgSports && orgSports[0]) {
  console.log('Columns:', Object.keys(orgSports[0]));
} else {
  console.log('No data or error:', osError?.message);
}

// Check sports columns
const { data: sports, error: sError } = await supabase
  .from('sports')
  .select('*')
  .limit(1);

console.log('\nsports table:');
if (sports && sports[0]) {
  console.log('Columns:', Object.keys(sports[0]));
} else {
  console.log('No data or error:', sError?.message);
}

// Try to get system sports
console.log('\nTrying to get system sports...');
const { data: systemSports, error: ssError } = await supabase
  .from('sports')
  .select('*')
  .is('org_id', null)
  .limit(5);

if (ssError) {
  console.log('Error:', ssError.message);
  console.log('Details:', ssError);
} else {
  console.log('Success! Found', systemSports?.length, 'system sports');
  systemSports?.forEach(s => console.log(`  - ${s.name}`));
}
