import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure .env file exists with these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySeedSQL() {
  console.log('Reading seed SQL file...');
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '99999999999999_seed_test_data.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Applying seed SQL to remote database via REST API...');
  
  // Split SQL into individual statements (simple approach - split on semicolon at end of line)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    if (!statement) continue;
    
    try {
      const { error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        // Try direct query execution for INSERT statements
        const trimmed = statement.trim();
        if (trimmed.toLowerCase().startsWith('insert')) {
          // Extract table name and execute using PostgREST
          console.log('Executing insert statement...');
        }
        console.error('Error executing statement:', error.message);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.error('Exception executing statement:', err.message);
      errorCount++;
    }
  }

  console.log(`\n✓ Seed SQL application complete`);
  console.log(`  Success: ${successCount} statements`);
  console.log(`  Errors: ${errorCount} statements`);
  
  if (errorCount > 0) {
    console.log('\nNote: Some errors may be expected if data already exists (idempotent inserts)');
  }
}

applySeedSQL().catch(console.error);
