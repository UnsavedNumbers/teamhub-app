/**
 * Export Features for Import
 * 
 * This script exports all features from the database into the comprehensive import JSON format.
 * Run: npx tsx scripts/export-features-for-import.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Try to load dotenv if available (optional)
try {
  const { config } = await import('dotenv')
  config()
} catch {
  // dotenv not available, use environment variables directly
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials.')
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
  console.error('   Or export them as environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface FeatureRow {
  id: string
  feature_key: string
  display_name: string
  category: string | null
  feature_type: string | null
  description: string | null
  rollout_status: string
  is_system_feature: boolean
  platform_admin_only: boolean
  parent_feature_key: string | null
  excluded_from_discovery: boolean
  visible_to_admin: boolean
  visible_to_coach: boolean
  visible_to_parent: boolean
  assigned_tier_keys: string[] | null
}

interface ImportFeature {
  feature_key: string
  display_name?: string
  category?: string
  feature_type?: string
  description?: string | null
  rollout_status?: string
  tier_keys?: string[]
  role_visibility?: {
    admin?: boolean
    coach?: boolean
    parent?: boolean
  }
  is_system_feature?: boolean
  platform_admin_only?: boolean
  parent_feature_key?: string | null
  excluded_from_discovery?: boolean
}

async function main() {
  console.log('📋 Fetching all features from database...')

  // Fetch all features from the admin view (including excluded ones for complete export)
  const { data: features, error } = await supabase
    .from('admin_feature_entitlements_list')
    .select('*')
    .order('feature_key', { ascending: true })
  
  // Also fetch tier assignments directly since the view might not include them properly
  const { data: tierAssignments } = await supabase
    .from('tier_feature_assignments')
    .select('feature_entitlement_id, license_tier_id, included')
    .eq('included', true)
  
  // Fetch tier keys
  const { data: tiers } = await supabase
    .from('license_tiers')
    .select('id, tier_key')
    .eq('status', 'active')
  
  const tierIdToKey = new Map(tiers?.map(t => [t.id, t.tier_key]) || [])
  const featureIdToTierKeys = new Map<string, string[]>()
  
  if (tierAssignments) {
    tierAssignments.forEach(ta => {
      const tierKey = tierIdToKey.get(ta.license_tier_id)
      if (tierKey) {
        const existing = featureIdToTierKeys.get(ta.feature_entitlement_id) || []
        if (!existing.includes(tierKey)) {
          featureIdToTierKeys.set(ta.feature_entitlement_id, [...existing, tierKey])
        }
      }
    })
  }

  if (error) {
    console.error('❌ Error fetching features:', error.message)
    process.exit(1)
  }

  if (!features || features.length === 0) {
    console.warn('⚠️  No features found')
    process.exit(1)
  }

  console.log(`✅ Found ${features.length} feature(s)`)
  console.log(`📊 Found ${tierAssignments?.length || 0} tier assignment(s)`)
  console.log(`📊 Found ${tiers?.length || 0} active tier(s)`)
  
  const featuresWithTiers: ImportFeature[] = features.map((f: any) => {
    const feature: ImportFeature = {
      feature_key: f.feature_key,
    }

    // Always include display_name
    if (f.display_name) feature.display_name = f.display_name
    
    if (f.description !== null) feature.description = f.description
    if (f.rollout_status) feature.rollout_status = f.rollout_status === 'live' ? 'Live' : f.rollout_status === 'beta' ? 'Draft' : 'Disabled'
    // Category
    if (f.category) feature.category = f.category
    
    // Feature type
    if (f.feature_type) feature.feature_type = f.feature_type
    
    // Description
    if (f.description !== null && f.description !== undefined) {
      feature.description = f.description
    }
    
    // Rollout status (map DB values to UI values)
    if (f.rollout_status) {
      if (f.rollout_status === 'live') feature.rollout_status = 'Live'
      else if (f.rollout_status === 'beta') feature.rollout_status = 'Draft'
      else if (f.rollout_status === 'hidden') feature.rollout_status = 'Disabled'
      else feature.rollout_status = f.rollout_status
    }
    
    // Tier assignments - use direct tier assignments if view doesn't have them
    const tierKeys = f.assigned_tier_keys && Array.isArray(f.assigned_tier_keys) && f.assigned_tier_keys.length > 0
      ? f.assigned_tier_keys
      : (featureIdToTierKeys.get(f.id) || [])
    
    if (tierKeys.length > 0) {
      feature.tier_keys = [...new Set(tierKeys)].sort()
    } else if (!f.is_system_feature && !f.platform_admin_only && !f.excluded_from_discovery) {
      // Mark as unassigned (empty array) if not system/platform admin/excluded
      feature.tier_keys = []
    }

    // Role visibility
    const roleVisibility: any = {}
    if (f.visible_to_admin !== undefined) roleVisibility.admin = f.visible_to_admin
    if (f.visible_to_coach !== undefined) roleVisibility.coach = f.visible_to_coach
    if (f.visible_to_parent !== undefined) roleVisibility.parent = f.visible_to_parent
    if (Object.keys(roleVisibility).length > 0) {
      feature.role_visibility = roleVisibility
    }

    // System feature flag
    if (f.is_system_feature === true) {
      feature.is_system_feature = true
    }

    // Platform admin only flag
    if (f.platform_admin_only === true) {
      feature.platform_admin_only = true
    }

    // Parent feature key
    if (f.parent_feature_key !== null) {
      feature.parent_feature_key = f.parent_feature_key
    }

    // Excluded from discovery
    if (f.excluded_from_discovery === true) {
      feature.excluded_from_discovery = true
    }

    return feature
  })

  // Create the import JSON structure
  const importData = {
    version: "2.0",
    description: "Comprehensive feature catalog export. Generated from current database state. Review and classify features according to the cleanup brief before importing.",
    features: featuresWithTiers,
    classification_notes: {
      root_features: "Root features represent top-level business capabilities that appear in navigation or represent major workflows. These are the features we design licensing around.",
      child_features: "Child features are kept only if they represent separable capabilities that may be licensed differently. Page-level routes (detail, view, edit, create, delete) are excluded.",
      excluded_features: "Features marked with excluded_from_discovery=true are page routes, UI artifacts, or implementation details that should never be licensed. These include: *_detail, *_view, *_page, *_modal, *_drawer, *_edit, *_create, *_delete, *_tab, *_row_action patterns.",
      system_features: "System features are required for platform operation and are automatically available to all tiers. They cannot be tier-assigned or sold as add-ons.",
      tier_assignments: {
        tier1: "Starter - Single-team or small club operations. Basic features included.",
        tier2: "Growth - Multi-team organizations. Advanced features and reporting.",
        tier3: "Professional - Enterprise features, advanced reporting, and custom capabilities."
      }
    },
    marking_features_as_not_a_feature: "To mark a feature as 'Not a feature' during import, set the 'excluded_from_discovery' field to true for that feature in the JSON file. This will permanently exclude the feature from the feature catalog list and prevent it from being rediscovered when running the 'Sync DB' operation. For example, to mark a feature with feature_key 'example.feature.key' as not a feature, include 'excluded_from_discovery': true in that feature's object. To re-include a previously excluded feature, set 'excluded_from_discovery': false. This is useful for cleaning up the feature catalog by removing features that were incorrectly discovered or are no longer relevant to your organization."
  }

  // Write to file
  const outputPath = path.join(process.cwd(), 'src/templates/comprehensive-feature-import.json')
  fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2))

  console.log(`\n✅ Exported ${features.length} features to:`)
  console.log(`   ${outputPath}`)
  console.log(`\n📝 Next steps:`)
  console.log(`   1. Review the exported file`)
  console.log(`   2. Classify features according to the cleanup brief:`)
  console.log(`      - Mark page routes (*_detail, *_view, etc.) as excluded_from_discovery: true`)
  console.log(`      - Set parent_feature_key for child features`)
  console.log(`      - Ensure all features are assigned to tiers (or marked as system/platform admin)`)
  console.log(`   3. Import the file using the Import button in Feature Catalog`)
}

main().catch(console.error)
