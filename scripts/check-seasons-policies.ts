import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeasonsPolicies() {
  console.log('Checking RLS policies on seasons table...\n');
  
  // Check table structure
  const structureQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seasons'
    ORDER BY ordinal_position;
  `;
  
  const { data: structure, error: structError } = await supabase.rpc('exec_sql', {
    sql_query: structureQuery
  });
  
  console.log('Table Structure:');
  console.log(JSON.stringify(structure, null, 2));
  console.log('Error:', structError);
  
  // Check policies
  const policiesQuery = `
    SELECT policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seasons'
    ORDER BY policyname;
  `;
  
  const { data: policies, error: polError } = await supabase.rpc('exec_sql', {
    sql_query: policiesQuery
  });
  
  console.log('\n\nRLS Policies:');
  console.log(JSON.stringify(policies, null, 2));
  console.log('Error:', polError);
}

checkSeasonsPolicies().catch(console.error);
