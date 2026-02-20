import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load .env.dev file manually
function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(filePath)) {
    return env;
  }
  
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Remove quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const envDevPath = join(projectRoot, '.env.dev');
const envVars = loadEnvFile(envDevPath);

if (Object.keys(envVars).length > 0) {
  console.log('✓ Loaded environment variables from .env.dev');
  // Merge into process.env
  for (const [key, value] of Object.entries(envVars)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} else {
  console.warn('⚠ .env.dev file not found or empty, using environment variables only');
}

// Get connection info from environment (loaded from .env.dev)
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please ensure .env.dev contains:');
  console.error('  VITE_SUPABASE_URL');
  console.error('  VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Generate a strong random password
function generatePassword(): string {
  const length = 32;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

// Demo roles and their corresponding emails
const DEMO_ROLES = [
  { role: 'org_admin', email: 'demo_org_admin@youthsports.team' },
  { role: 'coach', email: 'demo_coach@youthsports.team' },
  { role: 'parent', email: 'demo_parent@youthsports.team' },
  { role: 'athlete', email: 'demo_athlete@youthsports.team' },
  { role: 'staff', email: 'demo_staff@youthsports.team' },
  { role: 'fan', email: 'demo_fan@youthsports.team' },
] as const;

async function main() {
  console.log('🔐 Creating shared demo accounts...');
  console.log(`📡 Connected to: ${url}\n`);

  const createdUsers: Array<{ role: string; email: string; userId: string; password: string }> = [];
  const existingUsers: Array<{ role: string; email: string; userId: string }> = [];

  // Step 1: Create or get auth users
  console.log('=== Step 1: Creating Auth Users ===');
  for (const { role, email } of DEMO_ROLES) {
    // Check if user already exists
    const { data: existingUsersData } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsersData?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log(`✓ User already exists: ${email} (${existingUser.id})`);
      existingUsers.push({ role, email, userId: existingUser.id });
    } else {
      // Generate a strong password
      const password = generatePassword();
      
      // Create new auth user
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email so they can sign in immediately
        user_metadata: {
          display_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          is_demo_account: true,
        },
      });

      if (error) {
        console.error(`✗ Error creating user ${email}:`, error.message);
        continue;
      }

      if (!newUser.user) {
        console.error(`✗ Failed to create user ${email}: No user returned`);
        continue;
      }

      console.log(`✓ Created user: ${email} (${newUser.user.id})`);
      createdUsers.push({ role, email, userId: newUser.user.id, password });
    }
  }

  // Step 2: Insert or update demo_account_roles entries
  console.log('\n=== Step 2: Inserting demo_account_roles ===');
  const allUsers = [...createdUsers.map(u => ({ role: u.role, email: u.email, userId: u.userId })), ...existingUsers];

  for (const { role, email, userId } of allUsers) {
    const { error } = await supabase
      .from('demo_account_roles')
      .upsert(
        { user_id: userId, role: role },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error(`✗ Error inserting demo_account_roles for ${email}:`, error.message);
    } else {
      console.log(`✓ Inserted demo_account_roles: ${role} -> ${userId}`);
    }
  }

  // Step 3: Verify all roles are configured
  console.log('\n=== Step 3: Verification ===');
  const { data: rolesData, error: rolesError } = await supabase
    .from('demo_account_roles')
    .select('role, user_id')
    .order('role');

  if (rolesError) {
    console.error('✗ Error verifying demo_account_roles:', rolesError.message);
  } else {
    console.log('\n📋 Configured demo account roles:');
    console.log('━'.repeat(60));
    for (const row of rolesData || []) {
      const user = allUsers.find(u => u.userId === row.user_id);
      console.log(`  ${row.role.padEnd(12)} -> ${row.user_id} (${user?.email || 'unknown'})`);
    }
  }

  // Summary
  console.log('\n✅ Demo account creation complete!\n');
  console.log('📋 Summary:');
  console.log('━'.repeat(60));
  console.log(`  Created: ${createdUsers.length} new users`);
  console.log(`  Existing: ${existingUsers.length} users`);
  console.log(`  Total: ${allUsers.length} demo accounts configured`);

  if (createdUsers.length > 0) {
    console.log('\n🔑 Generated passwords (save securely, never expose to clients):');
    console.log('━'.repeat(60));
    for (const { email, password } of createdUsers) {
      console.log(`  ${email.padEnd(35)} ${password}`);
    }
    console.log('\n⚠️  IMPORTANT: Store these passwords securely. They will not be shown again.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
