/**
 * Help Center Sections Page
 * 
 * Platform admin interface for configuring display sections from tag combinations.
 */

import { useState, useEffect } from 'react'
import { PageHeader } from '../../components/platformAdmin'
import { Card, Button, Input, Checkbox, Modal } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../../data/services/helpCenterSectionService'
import { getAllCachedWordPressData } from '../../data/services/helpCenterSyncService'
import type { WordPressTag } from '../../data/services/wordpressApiService'
import type { SectionWithTags } from '../../data/services/helpCenterSectionService'
import { debug } from '../../lib/debug'

export default function HelpCenterSections() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Data state
  const [tags, setTags] = useState<WordPressTag[]>([])
  const [sections, setSections] = useState<SectionWithTags[]>([])

  // Edit state
  const [editingSection, setEditingSection] = useState<SectionWithTags | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [sectionName, setSectionName] = useState('')
  const [sectionOrder, setSectionOrder] = useState(0)
  const [sectionActive, setSectionActive] = useState(true)
  const [selectedTagCombinations, setSelectedTagCombinations] = useState<number[][]>([])

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load tags from cache
      const tagsResult = await getAllCachedWordPressData<WordPressTag>('tag')
      if (tagsResult.error) {
        showError('Failed to load tags: ' + tagsResult.error.message)
        return
      }
      setTags(tagsResult.data || [])

      // Load sections
      const sectionsResult = await getSections()
      if (sectionsResult.error) {
        showError('Failed to load sections: ' + sectionsResult.error.message)
        return
      }
      setSections(sectionsResult.data || [])
    } catch (err) {
      showError('Failed to load data')
      debug.error('HelpCenterSections', 'Exception loading data', { error: err })
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setEditingSection(null)
    setSectionName('')
    setSectionOrder(sections.length)
    setSectionActive(true)
    setSelectedTagCombinations([])
    setShowEditModal(true)
  }

  function handleEdit(section: SectionWithTags) {
    setEditingSection(section)
    setSectionName(section.name)
    setSectionOrder(section.displayOrder)
    setSectionActive(section.isActive)
    setSelectedTagCombinations(section.tagCombinations.map(comb => comb.tagIds))
    setShowEditModal(true)
  }

  function handleAddTagCombination() {
    setSelectedTagCombinations([...selectedTagCombinations, []])
  }

  function handleRemoveTagCombination(index: number) {
    setSelectedTagCombinations(selectedTagCombinations.filter((_, i) => i !== index))
  }

  function handleTagToggle(combinationIndex: number, tagId: number) {
    const combination = selectedTagCombinations[combinationIndex] || []
    const isSelected = combination.includes(tagId)

    const updated = [...selectedTagCombinations]
    updated[combinationIndex] = isSelected
      ? combination.filter(id => id !== tagId)
      : [...combination, tagId]

    setSelectedTagCombinations(updated)
  }

  async function handleSave() {
    if (!sectionName.trim()) {
      showError('Section name is required')
      return
    }

    setSaving(true)
    try {
      const tagCombinations = selectedTagCombinations.filter(comb => comb.length > 0)

      if (editingSection) {
        const result = await updateSection(editingSection.id, {
          name: sectionName,
          displayOrder: sectionOrder,
          isActive: sectionActive,
          tagCombinations,
        })

        if (result.error) {
          showError('Failed to update section: ' + result.error.message)
          return
        }
        showSuccess('Section updated successfully')
      } else {
        const result = await createSection({
          name: sectionName,
          displayOrder: sectionOrder,
          isActive: sectionActive,
          tagCombinations,
        })

        if (result.error) {
          showError('Failed to create section: ' + result.error.message)
          return
        }
        showSuccess('Section created successfully')
      }

      setShowEditModal(false)
      await loadData()
    } catch (err) {
      showError('Failed to save section')
      debug.error('HelpCenterSections', 'Exception saving section', { error: err })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this section?')) {
      return
    }

    try {
      const result = await deleteSection(id)
      if (result.error) {
        showError('Failed to delete section: ' + result.error.message)
        return
      }
      showSuccess('Section deleted successfully')
      await loadData()
    } catch (err) {
      showError('Failed to delete section')
      debug.error('HelpCenterSections', 'Exception deleting section', { error: err })
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <PageHeader title="Sections" />
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Sections"
        subtitle="Configure display sections from tag combinations"
      />

      <div className="pa-content">
        <Card>
          <div className="pa-mb-4 pa-flex pa-justify-between pa-items-center">
            <p className="pa-text-muted">
              Define sections that group articles by tag combinations. Articles matching
              any tag combination will appear in that section.
            </p>
            <Button variant="primary" onClick={handleCreate}>
              Create Section
            </Button>
          </div>

          <div className="pa-space-y-4">
            {sections.length === 0 ? (
              <p className="pa-text-muted pa-text-center pa-py-8">
                No sections configured. Create your first section to get started.
              </p>
            ) : (
              sections.map(section => (
                <div key={section.id} className="pa-border pa-rounded pa-p-4">
                  <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
                    <div>
                      <h3 className="pa-h3">{section.name}</h3>
                      <div className="pa-text-sm pa-text-muted pa-mt-1">
                        Order: {section.displayOrder} |{' '}
                        {section.isActive ? (
                          <span className="pa-text-success">Active</span>
                        ) : (
                          <span className="pa-text-muted">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="pa-flex pa-gap-2">
                      <Button variant="secondary" size="small" onClick={() => handleEdit(section)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleDelete(section.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="pa-text-sm">
                    <div className="pa-font-semibold pa-mb-2">Tag Combinations:</div>
                    {section.tagCombinations.length === 0 ? (
                      <p className="pa-text-muted">No tag combinations defined</p>
                    ) : (
                      <div className="pa-space-y-1">
                        {section.tagCombinations.map((comb, idx) => {
                          const tagNames = comb.tagIds
                            .map(tagId => tags.find(t => t.id === tagId)?.name)
                            .filter(Boolean)
                            .join(', ')

                          return (
                            <div key={idx} className="pa-text-muted">
                              {tagNames || 'Unknown tags'}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={editingSection ? 'Edit Section' : 'Create Section'}
        >
          <div className="pa-space-y-4">
            <Input
              label="Section Name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              required
            />

            <Input
              label="Display Order"
              type="number"
              value={sectionOrder.toString()}
              onChange={(e) => setSectionOrder(parseInt(e.target.value, 10) || 0)}
            />

            <label className="pa-flex pa-items-center pa-gap-2">
              <Checkbox
                checked={sectionActive}
                onChange={(e) => setSectionActive(e.target.checked)}
              />
              <span>Active</span>
            </label>

            <div>
              <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
                <label className="pa-font-semibold">Tag Combinations</label>
                <Button variant="secondary" size="small" onClick={handleAddTagCombination}>
                  Add Combination
                </Button>
              </div>

              <div className="pa-space-y-4">
                {selectedTagCombinations.map((combination, combIdx) => (
                  <div key={combIdx} className="pa-border pa-rounded pa-p-3">
                    <div className="pa-flex pa-items-center pa-justify-between pa-mb-2">
                      <span className="pa-text-sm pa-font-semibold">
                        Combination {combIdx + 1}
                      </span>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleRemoveTagCombination(combIdx)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="pa-space-y-1">
                      {tags.map(tag => {
                        const isSelected = combination.includes(tag.id)
                        return (
                          <label
                            key={tag.id}
                            className="pa-flex pa-items-center pa-gap-2 pa-cursor-pointer"
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleTagToggle(combIdx, tag.id)}
                            />
                            <span className="pa-text-sm">
                              {tag.name} ({tag.count} posts)
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {selectedTagCombinations.length === 0 && (
                  <p className="pa-text-muted pa-text-sm pa-text-center pa-py-4">
                    No tag combinations. Click "Add Combination" to create one.
                  </p>
                )}
              </div>
            </div>

            <div className="pa-flex pa-justify-end pa-gap-3 pa-pt-4 pa-border-t">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
