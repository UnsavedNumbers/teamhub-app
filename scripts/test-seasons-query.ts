import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSeasonsQuery() {
  console.log('Testing seasons query...');
  console.log('URL:', supabaseUrl);
  console.log('Org ID: 2ce27e3f-4cbd-4979-859b-021728956f45');
  
  const result = await supabase
    .from('seasons')
    .select('*')
    .eq('org_id', '2ce27e3f-4cbd-4979-859b-021728956f45')
    .order('start_date', { ascending: false })
    .limit(5);
  
  console.log('\nResult:');
  console.log(JSON.stringify(result, null, 2));
}

testSeasonsQuery().catch(console.error);
