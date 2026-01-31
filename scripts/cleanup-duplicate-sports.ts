/**
 * Cleanup duplicate sports that were created by seed data
 * 
 * This script:
 * 1. Identifies sports with org_id = null that are NOT system sports (is_system != true)
 * 2. Finds system sports with matching names
 * 3. Updates foreign key references to point to system sports
 * 4. Deletes the duplicate non-system sports
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Sport {
  id: string
  name: string
  org_id: string | null
  is_system: boolean
  icon: string | null
  color: string | null
}

async function cleanupDuplicateSports() {
  console.log('🔍 Finding duplicate sports...\n')

  // Get all sports with org_id = null
  const { data: nullOrgSports, error: fetchError } = await supabase
    .from('sports')
    .select('*')
    .is('org_id', null)
    .order('name')

  if (fetchError) {
    console.error('❌ Error fetching sports:', fetchError)
    return
  }

  if (!nullOrgSports || nullOrgSports.length === 0) {
    console.log('✅ No sports with org_id = null found')
    return
  }

  console.log(`Found ${nullOrgSports.length} sports with org_id = null:\n`)

  // Group by name to find duplicates
  const sportsByName = new Map<string, Sport[]>()
  for (const sport of nullOrgSports as Sport[]) {
    const existing = sportsByName.get(sport.name) || []
    existing.push(sport)
    sportsByName.set(sport.name, existing)
  }

  const duplicates: { name: string; system: Sport | undefined; duplicates: Sport[] }[] = []
  
  for (const [name, sports] of sportsByName) {
    if (sports.length > 1) {
      const systemSport = sports.find(s => s.is_system === true)
      const duplicateSports = sports.filter(s => s.is_system !== true)
      
      if (systemSport && duplicateSports.length > 0) {
        duplicates.push({ name, system: systemSport, duplicates: duplicateSports })
      }
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate sports found (all sports are correctly marked as system sports)')
    return
  }

  console.log(`Found ${duplicates.length} sports with duplicates:\n`)
  for (const dup of duplicates) {
    console.log(`  ${dup.name}:`)
    console.log(`    ✓ System sport: ${dup.system!.id}`)
    console.log(`    ✗ Duplicates: ${dup.duplicates.map(d => d.id).join(', ')}`)
  }

  console.log('\n🔧 Cleaning up duplicates...\n')

  for (const dup of duplicates) {
    const systemSportId = dup.system!.id
    const duplicateIds = dup.duplicates.map(d => d.id)

    console.log(`\nProcessing ${dup.name}...`)
    console.log(`  System sport ID: ${systemSportId}`)
    console.log(`  Duplicate IDs to remove: ${duplicateIds.join(', ')}`)

    // Update foreign key references in programs
    const { data: programsData, error: programsError } = await supabase
      .from('programs')
      .update({ sport_id: systemSportId })
      .in('sport_id', duplicateIds)
      .select('id')

    if (programsError) {
      console.error(`  ❌ Error updating programs:`, programsError)
      continue
    }
    console.log(`  ✓ Updated ${programsData?.length || 0} programs`)

    // Update foreign key references in teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .update({ sport_id: systemSportId })
      .in('sport_id', duplicateIds)
      .select('id')

    if (teamsError) {
      console.error(`  ❌ Error updating teams:`, teamsError)
      continue
    }
    console.log(`  ✓ Updated ${teamsData?.length || 0} teams`)

    // Update foreign key references in organization_sports
    const { data: orgSportsData, error: orgSportsError } = await supabase
      .from('organization_sports')
      .update({ sport_id: systemSportId })
      .in('sport_id', duplicateIds)
      .select('id')

    if (orgSportsError) {
      console.error(`  ❌ Error updating organization_sports:`, orgSportsError)
      continue
    }
    console.log(`  ✓ Updated ${orgSportsData?.length || 0} organization_sports entries`)

    // Delete duplicate sports
    const { error: deleteError } = await supabase
      .from('sports')
      .delete()
      .in('id', duplicateIds)

    if (deleteError) {
      console.error(`  ❌ Error deleting duplicate sports:`, deleteError)
      continue
    }
    console.log(`  ✓ Deleted ${duplicateIds.length} duplicate sport(s)`)
  }

  console.log('\n✅ Cleanup complete!')
}

cleanupDuplicateSports()
  .catch(console.error)
