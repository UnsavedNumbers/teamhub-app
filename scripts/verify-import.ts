import * as fs from 'fs'
import * as path from 'path'

const importPath = path.join(process.cwd(), 'src/templates/comprehensive-feature-import.json')
const data = JSON.parse(fs.readFileSync(importPath, 'utf-8'))

const kept = data.features.filter((f: any) => !f.excluded_from_discovery)
const excluded = data.features.filter((f: any) => f.excluded_from_discovery)

console.log('✅ Import file statistics:')
console.log(`   Total features: ${data.features.length}`)
console.log(`   Kept features: ${kept.length}`)
console.log(`   Excluded features: ${excluded.length}`)

console.log('\n📋 Kept features by category:')
const byCategory: Record<string, number> = {}
kept.forEach((f: any) => {
  byCategory[f.category] = (byCategory[f.category] || 0) + 1
})
Object.entries(byCategory).sort().forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count}`)
})

console.log('\n📝 Root features (no parent):')
kept.filter((f: any) => !f.parent_feature_key).forEach((f: any) => {
  console.log(`   - ${f.feature_key}`)
})

console.log('\n📝 System features:')
kept.filter((f: any) => f.is_system_feature).forEach((f: any) => {
  console.log(`   - ${f.feature_key}`)
})
