/**
 * Help Center Category Pages Page
 * 
 * Platform admin interface for mapping categories to WordPress pages.
 */

import { useState, useEffect } from 'react'
import { PageHeader } from '../../components/platformAdmin'
import { Card, Button, Select, Modal } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { getCategoryPageMappings, upsertCategoryPageMapping } from '../../data/services/helpCenterMappingService'
import { getAllCachedWordPressData, getCachedWordPressData } from '../../data/services/helpCenterSyncService'
import type { WordPressCategory, WordPressPage } from '../../data/services/wordpressApiService'
import { debug } from '../../lib/debug'

export default function HelpCenterCategoryPages() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Data state
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [pages, setPages] = useState<WordPressPage[]>([])
  
  // UI state: category slug -> page ID
  const [selectedPages, setSelectedPages] = useState<Record<string, number>>({})
  
  // Preview state
  const [previewPage, setPreviewPage] = useState<WordPressPage | null>(null)
  const [showPreview, setShowPreview] = useState(false)

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

      // Load pages from cache
      const pagesResult = await getAllCachedWordPressData<WordPressPage>('page')
      if (pagesResult.error) {
        showError('Failed to load pages: ' + pagesResult.error.message)
        return
      }

      setPages(pagesResult.data || [])

      // Load existing mappings
      const mappingsResult = await getCategoryPageMappings()
      if (mappingsResult.error) {
        showError('Failed to load mappings: ' + mappingsResult.error.message)
        return
      }

      // Initialize selected pages
      const selected: Record<string, number> = {}
      ;(mappingsResult.data || []).forEach(mapping => {
        selected[mapping.categorySlug] = mapping.wordpressPageId
      })
      setSelectedPages(selected)
    } catch (err) {
      showError('Failed to load data')
      debug.error('HelpCenterCategoryPages', 'Exception loading data', { error: err })
    } finally {
      setLoading(false)
    }
  }

  function handlePageSelect(categorySlug: string, pageId: number) {
    setSelectedPages(prev => ({
      ...prev,
      [categorySlug]: pageId,
    }))
  }

  async function handlePreview(categorySlug: string) {
    const pageId = selectedPages[categorySlug]
    if (!pageId) {
      showError('Please select a page first')
      return
    }

    const result = await getCachedWordPressData<WordPressPage>('page', pageId)
    if (result.error || !result.data) {
      showError('Failed to load page preview')
      return
    }

    setPreviewPage(result.data)
    setShowPreview(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const errors: string[] = []

      // Save mappings for each category
      for (const category of categories) {
        const pageId = selectedPages[category.slug]
        if (!pageId) {
          // Skip if no page selected (optional mapping)
          continue
        }

        // Get page data to extract featured image
        const pageResult = await getCachedWordPressData<WordPressPage>('page', pageId)
        if (pageResult.error || !pageResult.data) {
          errors.push(`Failed to load page data for ${category.name}`)
          continue
        }

        const page = pageResult.data
        const featuredImageUrl = (page as any).featured_media_url || null

        const result = await upsertCategoryPageMapping({
          categorySlug: category.slug,
          wordpressPageId: pageId,
          featuredImageUrl,
          pageContentHtml: page.content.rendered,
        })

        if (result.error) {
          errors.push(`Failed to save mapping for ${category.name}: ${result.error.message}`)
        }
      }

      if (errors.length > 0) {
        showError('Some mappings failed to save: ' + errors.join('; '))
      } else {
        showSuccess('Category page mappings saved successfully')
        await loadData()
      }
    } catch (err) {
      showError('Failed to save mappings')
      debug.error('HelpCenterCategoryPages', 'Exception saving mappings', { error: err })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <PageHeader title="Category Pages" />
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Category Pages"
        subtitle="Map categories to WordPress pages for descriptions"
      />

      <div className="pa-content">
        <Card>
          <div className="pa-mb-4">
            <p className="pa-text-muted">
              Map each help category to a WordPress page. The page content will be used as the category description.
              Cover photos are now taken from the WordPress category image (set in WordPress).
            </p>
          </div>

          <div className="pa-space-y-4">
            {categories.map(category => {
              const selectedPageId = selectedPages[category.slug]
              const selectedPage = pages.find(p => p.id === selectedPageId)
              
              return (
                <div key={category.id} className="pa-border pa-rounded pa-p-4">
                  <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
                    <h3 className="pa-h3">{category.name}</h3>
                    {selectedPageId && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handlePreview(category.slug)}
                      >
                        Preview Page
                      </Button>
                    )}
                  </div>
                  
                  <div className="pa-form-group">
                    <Select
                      label="WordPress Page"
                      value={selectedPageId?.toString() || ''}
                      onChange={(e) => {
                        const pageId = e.target.value ? parseInt(e.target.value, 10) : 0
                        if (pageId) {
                          handlePageSelect(category.slug, pageId)
                        }
                      }}
                      options={[
                        { value: '', label: '-- Select Page --' },
                        ...pages.map(page => ({
                          value: page.id.toString(),
                          label: `${page.title.rendered} (${page.slug})`,
                        })),
                      ]}
                      helper="Select a WordPress page. The page slug should match the category slug for automatic discovery."
                    />
                  </div>

                  {selectedPage && (
                    <div className="pa-mt-3 pa-text-sm pa-text-muted">
                      <div>
                        <span className="pa-font-semibold">Content:</span>{' '}
                        {selectedPage.content.rendered.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </div>
                      <div className="pa-mt-2 pa-text-xs pa-text-muted">
                        Note: Cover photos are set via WordPress category images, not page featured images.
                      </div>
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

      {/* Preview Modal */}
      {showPreview && previewPage && (
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          title={previewPage.title.rendered}
        >
          <div className="pa-space-y-4">
            <div
              className="pa-prose"
              dangerouslySetInnerHTML={{ __html: previewPage.content.rendered }}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
