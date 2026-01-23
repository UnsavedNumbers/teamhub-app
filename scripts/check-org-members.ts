import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

//Check organization_members columns
const { data, error } = await supabase
  .from('organization_members')
  .select('*')
  .limit(1);

console.log('organization_members columns:');
if (data && data[0]) {
  console.log(Object.keys(data[0]));
} else {
  console.log('Error or no data:', error?.message);
}
