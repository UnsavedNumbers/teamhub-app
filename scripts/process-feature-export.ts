/**
 * Process Feature Export CSV and Generate Comprehensive Import File
 * 
 * This script reads the exported CSV and generates a complete import JSON
 * file that includes ALL features, properly classifying them.
 */

import * as fs from 'fs'
import * as path from 'path'

// Patterns that indicate a feature should be excluded
const EXCLUDE_PATTERNS = [
  /_detail$/,
  /_view$/,
  /_page$/,
  /_modal$/,
  /_drawer$/,
  /_edit$/,
  /^create$/,
  /^edit$/,
  /^detail$/,
  /^update$/,
  /^upload$/,
  /^browse$/,
  /^search$/,
  /^list$/,
  /^index$/,
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
  /^overview$/,  // Only match standalone "overview", not "reports_overview"
  /^billing$/,
  /service.*test/i,
  /integration.*test/i,
  /\.test\./i,
  /Service Module:/i,
  /Database table:/i,
  /^reporting$/,
  /^facilities$/,
  /^photos$/,
  /^videos$/,
  /^events$/,
  /^payments$/,
  /^fees$/,
  /^messages$/,
  /^huddles$/,
  /^notifications$/,
  /^athletes$/,
  /^teams$/,
  /^sports$/,
  /^programs$/,
  /^levels$/,
  /^seasons$/,
  /^venues$/,
  /^travel$/,
  /^uniforms$/,
  /^tickets$/,
  /^galleries$/,
  /^gallery$/,
  /^organizations$/,
  /^users$/,
  /^guardian$/,
  /^fan$/,
  /^family$/,
  /^organization$/,
  /^base$/,
  /^join$/,
  /^contact$/,
  /^help$/,
  /^dashboard$/,
  /^forms$/,
  /^addons$/,
  /^attendance$/,
  /^audit$/,
  /^charges$/,
  /^checkout/,
  /^payment/,
  /^plan/,
  /^ticket/,
  /^order/,
  /^rsvp$/,
  /^waivers$/,
  /^refunds$/,
  /^purchases$/,
  /^discount/,
  /^installment/,
  /^scholarship/,
  /^sub_org/,
  /^suborg/,
  /^demo/,
  /^email/,
  /^notification/,
  /^huddle/,
  /^message/,
  /^athlete/,
  /^team/,
  /^sport/,
  /^program/,
  /^level/,
  /^season/,
  /^venue/,
  /^photo/,
  /^gallery/,
  /^video/,
  /^event/,
  /^schedule/,
  /^calendar/,
  /^ticket/,
  /^seat/,
  /^builder$/,
  /^scanner/,
  /^validate/,
  /^access/,
  /^order/,
  /^success$/,
  /^cancel/,
  /^selection$/,
  /^lookup$/,
  /^request/,
  /^attachment/,
  /^import$/,
  /^export/,
  /^saved$/,
  /^scheduled$/,
  /^schedules$/,
  /^exports$/,
  /^operations$/,
  /^participation$/,
  /^scheduling$/,
  /^communications$/,
  /^analytics/,
  /^basic_/,
  /^data_/,
  /^viewer$/,
  /^saved$/,
  /^video$/,
  /^allevents$/,
  /^bookmarked/,
  /^recurring/,
  /^support_/,
  /^audit_/,
  /^data_/,
  /^addons$/,
  /^admin_/,
  /^athlete/,
  /^attendance/,
  /^bulk_/,
  /^category/,
  /^thumbnails$/,
  /^checkout_/,
  /^child_/,
  /^contact/,
  /^content/,
  /^demo/,
  /^discount/,
  /^discovery_/,
  /^distance/,
  /^email/,
  /^entitlement/,
  /^export_/,
  /^facility_/,
  /^families$/,
  /^family_/,
  /^fan_/,
  /^features$/,
  /^feature_/,
  /^featuredetail$/,
  /^featurebulk/,
  /^featureflag/,
  /^featurehierarchy$/,
  /^feenotifications$/,
  /^followed/,
  /^following$/,
  /^forms$/,
  /^free_/,
  /^gallery_/,
  /^games$/,
  /^guardian/,
  /^help/,
  /^huddle_/,
  /^index/,
  /^installment/,
  /^join/,
  /^leveldetail$/,
  /^license/,
  /^licensetiers$/,
  /^max_/,
  /^migration/,
  /^nearby/,
  /^notification/,
  /^onboarding$/,
  /^orderlookup$/,
  /^org_/,
  /^orgadmin/,
  /^organization/,
  /^organizations$/,
  /^organizationservice/,
  /^organizationsettings$/,
  /^organizationtravel/,
  /^orgsport/,
  /^overridedetail$/,
  /^overridecreate$/,
  /^overrides$/,
  /^parent_/,
  /^photo_/,
  /^platform/,
  /^policy/,
  /^preferences$/,
  /^programdetail$/,
  /^programs$/,
  /^bysport$/,
  /^purchases$/,
  /^query/,
  /^refunds$/,
  /^registration$/,
  /^response/,
  /^rls_/,
  /^rolemappings$/,
  /^roleselection$/,
  /^rsvp$/,
  /^saved_/,
  /^scholarship/,
  /^search$/,
  /^seasondetail$/,
  /^seasons$/,
  /^seat_/,
  /^sections$/,
  /^sportdetail$/,
  /^sport_/,
  /^sportfield/,
  /^sports$/,
  /^sportsprograms$/,
  /^storage$/,
  /^stream_/,
  /^stripe_/,
  /^structure$/,
  /^sub_/,
  /^suborg/,
  /^tagging$/,
  /^ticketingscanner/,
  /^ticketingservice/,
  /^tierdetail$/,
  /^tier_/,
  /^tiers$/,
  /^tierlimits$/,
  /^travel$/,
  /^travel_/,
  /^traveldetail$/,
  /^travelnotifications$/,
  /^trialexpired$/,
  /^tryout/,
  /^tryoutdetail$/,
  /^uniform/,
  /^uniformkitdetail$/,
  /^update$/,
  /^user/,
  /^users$/,
  /^usersservice/,
  /^venue/,
  /^venueinsights$/,
  /^venues$/,
  /^videodetail$/,
  /^video_/,
  /^waivers$/,
  /^webhook/,
  /^wordpress/,
  /^migration_/,
  /^createathlete$/,
  /^athlete_/,
  /^athletes$/,
  /^athletesservice/,
  /^import$/,
  /^max_/,
  /^requestattachment$/,
  /^team_/,
  /^roster$/,
  /^teamsservice/,
  /^teamsmanagement$/,
  /^edit$/,
  /^traveldetail$/,
  /^travel_/,
  /^tryout/,
  /^gear_/,
  /^uniform_/,
  /^upload$/,
]

// Features that should be system features
const SYSTEM_FEATURES = [
  'multi_role_support',
  'onboarding',
  'trialexpired',
  'users',
  'join',
]

// System features that should be excluded (redundant or internal)
const EXCLUDED_SYSTEM_FEATURES = [
  'settings', // WordPress Settings - internal
  'organization', // Redundant with organization_settings
  'organizations', // Redundant with organization_settings
  'base', // Redundant with organization_settings
]

// Features that should be platform admin only
const PLATFORM_ADMIN_PATTERNS = [
  /^admin_/,
  /^platform_/,
  /^feature_/,
  /^tier_/,
  /^license_/,
  /discovery/,
  /cache/,
  /correction/,
  /hint/,
  /metrics$/,
  /^overview$/,  // Only match standalone "overview", not "reports_overview"
  /^billing$/,
  /^tiers$/,
  /^features$/,
  /^featuredetail$/,
  /^featurebulkoperations$/,
  /^featureflags$/,
  /^featurehierarchy$/,
  /^tierdetail$/,
]

// Root features (top-level business capabilities) - ONLY these should be kept
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
  'videos',
  'facilities_list',
  'reports_overview',
  'dashboard',
  'organization_settings',
  'custom_permissions',
]

// Ensure reports_overview is not excluded by patterns
const EXCLUDE_PATTERNS_FINAL = EXCLUDE_PATTERNS.filter(p => !p.toString().includes('overview'))

// Only keep these specific child features
const KEPT_CHILD_FEATURES = [
  'travel_details',
  'announcements',
  'email_notifications',
  'fee_management',
  'stripe_integration',
  'google_calendar',
  'photos_create',
  'photos_gallery',
  'photos_gallery_manage',
  'facilities_schedule',
  'reports_builder',
  'reports_saved',
  'reports_exports',
  'reports_schedules',
  'reports_viewer',
  'reports_ticketing',
  'reports_registration',
  'reports_video',
  'reports_events',
  'reports_domain_participation',
  'reports_domain_payments',
  'reports_domain_scheduling',
  'reports_domain_travel',
  'reports_domain_uniforms',
  'reports_domain_communications',
  'reports_domain_operations',
]

// Child feature mappings (child -> parent)
const CHILD_FEATURES: Record<string, string> = {
  'travel_details': 'travel_planning',
  'announcements': 'messaging',
  'email_notifications': 'messaging',
  'fee_management': 'payment_processing',
  'stripe_integration': 'payment_processing',
  'photos_create': 'photos_list',
  'photos_gallery': 'photos_list',
  'photos_gallery_manage': 'photos_list',
  'facilities_schedule': 'facilities_list',
  'google_calendar': 'event_scheduling',
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
  'google_calendar': ['tier2', 'tier3'],
  'travel_planning': ['tier2', 'tier3'],
  'travel_details': ['tier2', 'tier3'],
  'messaging': ['tier1', 'tier2', 'tier3'],
  'announcements': ['tier1', 'tier2', 'tier3'],
  'email_notifications': ['tier1', 'tier2', 'tier3'],
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
  'videos': ['tier2', 'tier3'],
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
  'custom_permissions': ['tier2', 'tier3'],
}

function shouldExclude(featureKey: string, description: string): boolean {
  // Exclude redundant system features
  if (EXCLUDED_SYSTEM_FEATURES.includes(featureKey)) {
    return true
  }
  
  // Keep root features
  if (ROOT_FEATURES.includes(featureKey)) {
    return false
  }
  
  // Keep specific child features
  if (KEPT_CHILD_FEATURES.includes(featureKey)) {
    return false
  }
  
  // Keep system features
  if (SYSTEM_FEATURES.includes(featureKey)) {
    return false
  }
  
  // Check explicit exclude patterns
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(featureKey))) {
    return true
  }
  
  // Check description for service module or database table references
  if (description && (
    description.includes('Service Module:') ||
    description.includes('Database table:') ||
    description.includes('.test.') ||
    description.includes('Integration Test')
  )) {
    return true
  }
  
  // Exclude everything else that's not explicitly kept
  return true
}

function isSystemFeature(featureKey: string): boolean {
  return SYSTEM_FEATURES.includes(featureKey)
}

function isPlatformAdminOnly(featureKey: string): boolean {
  return PLATFORM_ADMIN_PATTERNS.some(pattern => pattern.test(featureKey))
}

function getParentFeatureKey(featureKey: string): string | null {
  return CHILD_FEATURES[featureKey] || null
}

function getTierAssignments(featureKey: string): string[] {
  return TIER_ASSIGNMENTS[featureKey] || []
}

function parseCSV(csvContent: string): Array<{key: string, name: string, category: string, type: string, desc: string}> {
  const lines = csvContent.split('\n').slice(1).filter(l => l.trim())
  const features: Array<{key: string, name: string, category: string, type: string, desc: string}> = []
  
  for (const line of lines) {
    // Handle CSV parsing - split by comma but respect quoted fields
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.trim())
    
    if (parts.length >= 2) {
      features.push({
        key: parts[0] || '',
        name: parts[1] || parts[0] || '',
        category: parts[2] || 'Uncategorized',
        type: parts[3] || 'module',
        desc: parts[4] || null
      })
    }
  }
  
  return features.filter(f => f.key)
}

async function main() {
  const csvPath = path.join(process.cwd(), 'features-export-2026-02-23.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  console.log('📖 Reading CSV file...')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const features = parseCSV(csvContent)
  
  console.log(`📋 Found ${features.length} feature(s)`)

  const importFeatures: any[] = []
  let excludedCount = 0
  let keptCount = 0

  for (const feature of features) {
    const featureKey = feature.key
    const description = feature.desc || ''
    const shouldExcludeFeature = shouldExclude(featureKey, description) || isPlatformAdminOnly(featureKey)
    const isSystem = isSystemFeature(featureKey)
    const parentKey = getParentFeatureKey(featureKey) || null
    const tierKeys = isSystem ? [] : (getTierAssignments(featureKey).length > 0 ? getTierAssignments(featureKey) : (shouldExcludeFeature ? [] : ['tier1', 'tier2', 'tier3']))

    // Map category names
    let category = feature.category
    if (category === 'Analytics') category = 'Reporting & Analytics'
    if (category === 'Commerce') category = 'Payments'
    if (category === 'Communication') category = 'Messaging & Communication'
    if (category === 'Content') category = 'Photo Galleries'
    if (category === 'Operations') {
      if (featureKey.includes('facilities')) category = 'Scheduling & Calendar'
      else if (featureKey.includes('travel')) category = 'Travel'
      else category = 'Teams & Rosters'
    }

    const importFeature: any = {
      feature_key: featureKey,
      display_name: feature.name || featureKey,
      category: category || 'Uncategorized',
      feature_type: feature.type || 'module',
      description: description || null,
      rollout_status: 'Live',
      tier_keys: shouldExcludeFeature ? [] : tierKeys,
      role_visibility: {
        admin: true,
        coach: !isPlatformAdminOnly(featureKey) && !featureKey.includes('admin'),
        parent: !isPlatformAdminOnly(featureKey) && !featureKey.includes('admin') && !featureKey.includes('admin'),
      },
      is_system_feature: isSystem || false,
      platform_admin_only: isPlatformAdminOnly(featureKey) || false,
      parent_feature_key: shouldExcludeFeature ? null : parentKey,
      excluded_from_discovery: shouldExcludeFeature || isPlatformAdminOnly(featureKey) || EXCLUDED_SYSTEM_FEATURES.includes(featureKey) || false,
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
    description: 'Comprehensive feature catalog cleanup and configuration. This file ensures all 487 features are properly classified, with legitimate features kept and non-features excluded from discovery.',
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
        total_features_in_csv: features.length,
        legitimate_features_kept: keptCount,
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
