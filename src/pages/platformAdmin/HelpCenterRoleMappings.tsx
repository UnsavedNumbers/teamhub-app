/**
 * Help Center Role Mappings Page
 * 
 * Platform admin interface for mapping application roles to WordPress categories.
 */

import { useState, useEffect } from 'react'
import { PageHeader } from '../../components/platformAdmin'
import { Card, Button, Checkbox } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { getRoleCategoryMappings, replaceRoleMappings } from '../../data/services/helpCenterMappingService'
import { getAllCachedWordPressData } from '../../data/services/helpCenterSyncService'
import type { WordPressCategory } from '../../data/services/wordpressApiService'
import { debug } from '../../lib/debug'
import { ROLE_DISPLAY_NAMES } from '../../constants/permissions'

const APPLICATION_ROLES: Array<'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'> = [
  'parent',
  'coach',
  'org_admin',
  'athlete',
  'platform_admin',
]

export default function HelpCenterRoleMappings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Data state
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  
  // UI state: role -> category IDs (selected)
  const [selectedMappings, setSelectedMappings] = useState<Record<string, number[]>>({})

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load categories from cache
      const categoriesResult = await getAllCachedWordPressData<WordPressCategory>('category')
      if (categoriesResult.error) {
        showError('Failed to load categories: ' + categoriesResult.error.message)
        return
      }

      // Filter to only child categories (parent !== 0)
      const childCategories = (categoriesResult.data || []).filter(cat => cat.parent !== 0)
      setCategories(childCategories)

      // Load existing mappings
      const mappingsResult = await getRoleCategoryMappings()
      if (mappingsResult.error) {
        showError('Failed to load mappings: ' + mappingsResult.error.message)
        return
      }

      // Initialize selected mappings
      const selected: Record<string, number[]> = {}
      APPLICATION_ROLES.forEach(role => {
        selected[role] = []
      })

      ;(mappingsResult.data || []).forEach(mapping => {
        if (!selected[mapping.role]) {
          selected[mapping.role] = []
        }
        selected[mapping.role].push(mapping.wordpressCategoryId)
      })

      setSelectedMappings(selected)
    } catch (err) {
      showError('Failed to load data')
      debug.error('HelpCenterRoleMappings', 'Exception loading data', { error: err })
    } finally {
      setLoading(false)
    }
  }

  function handleCategoryToggle(role: string, categoryId: number) {
    setSelectedMappings(prev => {
      const roleMappings = prev[role] || []
      const isSelected = roleMappings.includes(categoryId)
      
      return {
        ...prev,
        [role]: isSelected
          ? roleMappings.filter(id => id !== categoryId)
          : [...roleMappings, categoryId],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const errors: string[] = []

      // Save mappings for each role
      for (const role of APPLICATION_ROLES) {
        const selectedCategoryIds = selectedMappings[role] || []
        const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id))

        const result = await replaceRoleMappings(
          role,
          selectedCategories.map(cat => ({
            wordpressCategoryId: cat.id,
            wordpressCategorySlug: cat.slug,
            wordpressCategoryName: cat.name,
          }))
        )

        if (result.error) {
          errors.push(`Failed to save mappings for ${ROLE_DISPLAY_NAMES[role]}: ${result.error.message}`)
        }
      }

      if (errors.length > 0) {
        showError('Some mappings failed to save: ' + errors.join('; '))
      } else {
        showSuccess('Role mappings saved successfully')
        await loadData()
      }
    } catch (err) {
      showError('Failed to save mappings')
      debug.error('HelpCenterRoleMappings', 'Exception saving mappings', { error: err })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <PageHeader title="Role Mappings" />
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Role Mappings"
        subtitle="Map application roles to WordPress help categories"
      />

      <div className="pa-content">
        <Card>
          <div className="pa-mb-4">
            <p className="pa-text-muted">
              Select which WordPress categories should be visible to each application role.
              Users will only see help content from categories mapped to their role.
            </p>
          </div>

          <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 pa-gap-6">
            {APPLICATION_ROLES.map(role => {
              const roleCategories = selectedMappings[role] || []
              
              return (
                <div key={role} className="pa-border pa-rounded pa-p-4">
                  <h3 className="pa-h3 pa-mb-4">{ROLE_DISPLAY_NAMES[role]}</h3>
                  
                  {categories.length === 0 ? (
                    <p className="pa-text-muted pa-text-sm">
                      No categories available. Please sync WordPress data first.
                    </p>
                  ) : (
                    <div className="pa-space-y-2">
                      {categories.map(category => {
                        const isSelected = roleCategories.includes(category.id)
                        
                        return (
                          <label
                            key={category.id}
                            className="pa-flex pa-items-center pa-gap-2 pa-cursor-pointer"
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleCategoryToggle(role, category.id)}
                            />
                            <span className="pa-text-sm">
                              {category.name}
                              <span className="pa-text-muted pa-ml-2">
                                ({category.count} posts)
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pa-mt-6 pa-pt-6 pa-border-t pa-flex pa-justify-end">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
