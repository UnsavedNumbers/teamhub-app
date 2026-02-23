/**
 * Generate Comprehensive Feature Import File
 * 
 * This script generates a complete import file that includes ALL features
 * currently in the database, marking non-features for exclusion.
 * 
 * Run: npx tsx scripts/generate-comprehensive-feature-import.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Patterns that indicate a feature should be excluded
const EXCLUDE_PATTERNS = [
  /_detail$/,
  /_view$/,
  /_page$/,
  /_modal$/,
  /_drawer$/,
  /_edit$/,
  /_create$/,
  /_delete$/,
  /_tab$/,
  /_row_action/,
  /_action$/,
  /^admin_/,
  /^platform_/,
  /^feature_/,
  /^tier_/,
  /^license_/,
  /discovery/,
  /cache/,
  /correction/,
  /hint/,
  /flag$/,
  /metrics$/,
  /overview$/,
  /billing$/,
]

// Features that should be system features
const SYSTEM_FEATURES = [
  'multi_role_support',
  'onboarding',
  'trialexpired',
  'organization',
  'organizations',
  'base',
  'settings',
  'users',
  'join',
]

// Features that should be platform admin only
const PLATFORM_ADMIN_FEATURES = [
  'tiers',
  'license_tiers',
  'tierdetail',
  'tier_feature_assignments',
  'admin_license_tiers_list',
  'admin_license_metrics',
  'overview',
  'billing',
  'features',
  'featuredetail',
  'feature_entitlements',
  'featurebulkoperations',
  'feature_discovery_hints',
  'feature_discovery_cache',
  'feature_discovery_corrections',
  'feature_flags',
]

// Root features (top-level business capabilities)
const ROOT_FEATURES = [
  'event_scheduling',
  'travel_planning',
  'messaging',
  'payment_processing',
  'roster_management',
  'team_management',
  'tryouts',
  'uniform_orders',
  'ticketing',
  'invitations',
  'registration_forms',
  'photos_list',
  'videos_list',
  'facilities_list',
  'reports_overview',
  'dashboard',
  'organization_settings',
]

// Child feature mappings (child -> parent)
const CHILD_FEATURES: Record<string, string> = {
  'travel_details': 'travel_planning',
  'announcements': 'messaging',
  'fee_management': 'payment_processing',
  'stripe_integration': 'payment_processing',
  'photos_create': 'photos_list',
  'photos_gallery': 'photos_list',
  'photos_gallery_manage': 'photos_list',
  'facilities_schedule': 'facilities_list',
  'reports_builder': 'reports_overview',
  'reports_saved': 'reports_overview',
  'reports_exports': 'reports_overview',
  'reports_schedules': 'reports_overview',
  'reports_viewer': 'reports_overview',
  'reports_ticketing': 'reports_overview',
  'reports_registration': 'reports_overview',
  'reports_video': 'reports_overview',
  'reports_events': 'reports_overview',
  'reports_domain_participation': 'reports_overview',
  'reports_domain_payments': 'reports_overview',
  'reports_domain_scheduling': 'reports_overview',
  'reports_domain_travel': 'reports_overview',
  'reports_domain_uniforms': 'reports_overview',
  'reports_domain_communications': 'reports_overview',
  'reports_domain_operations': 'reports_overview',
}

// Tier assignments (feature -> tiers)
const TIER_ASSIGNMENTS: Record<string, string[]> = {
  'event_scheduling': ['tier1', 'tier2', 'tier3'],
  'travel_planning': ['tier2', 'tier3'],
  'travel_details': ['tier2', 'tier3'],
  'messaging': ['tier1', 'tier2', 'tier3'],
  'announcements': ['tier1', 'tier2', 'tier3'],
  'payment_processing': ['tier1', 'tier2', 'tier3'],
  'fee_management': ['tier1', 'tier2', 'tier3'],
  'stripe_integration': ['tier1', 'tier2', 'tier3'],
  'roster_management': ['tier1', 'tier2', 'tier3'],
  'team_management': ['tier1', 'tier2', 'tier3'],
  'tryouts': ['tier2', 'tier3'],
  'uniform_orders': ['tier2', 'tier3'],
  'ticketing': ['tier2', 'tier3'],
  'invitations': ['tier1', 'tier2', 'tier3'],
  'registration_forms': ['tier2', 'tier3'],
  'photos_list': ['tier1', 'tier2', 'tier3'],
  'photos_create': ['tier1', 'tier2', 'tier3'],
  'photos_gallery': ['tier1', 'tier2', 'tier3'],
  'photos_gallery_manage': ['tier2', 'tier3'],
  'videos_list': ['tier2', 'tier3'],
  'facilities_list': ['tier2', 'tier3'],
  'facilities_schedule': ['tier2', 'tier3'],
  'reports_overview': ['tier2', 'tier3'],
  'reports_builder': ['tier3'],
  'reports_saved': ['tier2', 'tier3'],
  'reports_exports': ['tier2', 'tier3'],
  'reports_schedules': ['tier2', 'tier3'],
  'reports_viewer': ['tier2', 'tier3'],
  'reports_ticketing': ['tier2', 'tier3'],
  'reports_registration': ['tier2', 'tier3'],
  'reports_video': ['tier2', 'tier3'],
  'reports_events': ['tier2', 'tier3'],
  'reports_domain_participation': ['tier3'],
  'reports_domain_payments': ['tier3'],
  'reports_domain_scheduling': ['tier3'],
  'reports_domain_travel': ['tier3'],
  'reports_domain_uniforms': ['tier3'],
  'reports_domain_communications': ['tier3'],
  'reports_domain_operations': ['tier3'],
  'dashboard': ['tier1', 'tier2', 'tier3'],
  'organization_settings': ['tier1', 'tier2', 'tier3'],
  'settings': ['tier1', 'tier2', 'tier3'],
}

function shouldExclude(featureKey: string): boolean {
  // Check explicit exclude patterns
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(featureKey))
}

function isSystemFeature(featureKey: string): boolean {
  return SYSTEM_FEATURES.includes(featureKey)
}

function isPlatformAdminOnly(featureKey: string): boolean {
  return PLATFORM_ADMIN_FEATURES.some(pattern => featureKey.includes(pattern))
}

function getParentFeatureKey(featureKey: string): string | null {
  return CHILD_FEATURES[featureKey] || null
}

function getTierAssignments(featureKey: string): string[] {
  return TIER_ASSIGNMENTS[featureKey] || []
}

async function main() {
  console.log('🔍 Fetching all features from database...')

  const { data: features, error } = await supabase
    .from('feature_entitlements')
    .select('feature_key, display_name, category, feature_type, description, rollout_status, is_system_feature, platform_admin_only, parent_feature_key, excluded_from_discovery')
    .is('archived_at', null)
    .order('feature_key', { ascending: true })

  if (error) {
    console.error('❌ Error fetching features:', error.message)
    process.exit(1)
  }

  if (!features || features.length === 0) {
    console.warn('⚠️  No features found')
    process.exit(1)
  }

  console.log(`📋 Found ${features.length} feature(s)`)

  const importFeatures: any[] = []
  let excludedCount = 0
  let keptCount = 0

  for (const feature of features) {
    const featureKey = feature.feature_key
    const shouldExcludeFeature = shouldExclude(featureKey) || isPlatformAdminOnly(featureKey)
    const isSystem = isSystemFeature(featureKey)
    const parentKey = getParentFeatureKey(featureKey) || feature.parent_feature_key || null
    const tierKeys = isSystem ? [] : (getTierAssignments(featureKey).length > 0 ? getTierAssignments(featureKey) : ['tier1', 'tier2', 'tier3'])

    const importFeature: any = {
      feature_key: featureKey,
      display_name: feature.display_name || featureKey,
      category: feature.category || 'Uncategorized',
      feature_type: feature.feature_type || 'module',
      description: feature.description || null,
      rollout_status: feature.rollout_status || 'Live',
      tier_keys: shouldExcludeFeature ? [] : tierKeys,
      role_visibility: {
        admin: true,
        coach: !isPlatformAdminOnly(featureKey),
        parent: !isPlatformAdminOnly(featureKey) && !featureKey.includes('admin'),
      },
      is_system_feature: isSystem || feature.is_system_feature || false,
      platform_admin_only: isPlatformAdminOnly(featureKey) || feature.platform_admin_only || false,
      parent_feature_key: shouldExcludeFeature ? null : parentKey,
      excluded_from_discovery: shouldExcludeFeature || feature.excluded_from_discovery || false,
    }

    importFeatures.push(importFeature)

    if (importFeature.excluded_from_discovery) {
      excludedCount++
    } else {
      keptCount++
    }
  }

  const output = {
    version: '2.0',
    description: 'Comprehensive feature catalog cleanup and configuration. This file ensures all features are properly classified, assigned to tiers, and non-features are excluded from discovery.',
    features: importFeatures,
    classification_notes: {
      root_features: 'Root features represent top-level business capabilities that appear in navigation or represent major workflows.',
      child_features: 'Child features are kept only if they represent separable capabilities that may be licensed differently.',
      excluded_features: 'Features marked with excluded_from_discovery=true are page routes, UI artifacts, or implementation details that should never be licensed.',
      system_features: 'System features are required for platform operation and are automatically available to all tiers.',
      tier_assignments: {
        tier1: 'Starter - Single-team or small club operations. Basic features included.',
        tier2: 'Growth - Multi-team organizations. Advanced features and reporting.',
        tier3: 'Professional - Enterprise features, advanced reporting, and custom capabilities.',
      },
      statistics: {
        total_features: features.length,
        kept_features: keptCount,
        excluded_features: excludedCount,
      },
    },
    marking_features_as_not_a_feature: 'To mark a feature as \'Not a feature\' during import, set the \'excluded_from_discovery\' field to true for that feature in the JSON file. This will permanently exclude the feature from the feature catalog list and prevent it from being rediscovered when running the \'Sync DB\' operation.',
  }

  const outputPath = path.join(process.cwd(), 'src/templates/comprehensive-feature-import.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`✅ Generated import file: ${outputPath}`)
  console.log(`📊 Statistics:`)
  console.log(`   Total features: ${features.length}`)
  console.log(`   Kept features: ${keptCount}`)
  console.log(`   Excluded features: ${excludedCount}`)
  console.log(`\n💡 Import this file to clean up your feature catalog!`)
}

main().catch(console.error)
