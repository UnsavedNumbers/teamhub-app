/**
 * Help Center Section Service
 * 
 * Manages help center sections and tag combinations.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'

const supabaseUntyped = supabase as any

// ============================================================================
// Types
// ============================================================================

export interface HelpSection {
  id: string
  name: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SectionTagCombination {
  id: string
  sectionId: string
  tagIds: number[]
  createdAt: string
}

export interface SectionWithTags extends HelpSection {
  tagCombinations: SectionTagCombination[]
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Sections
// ============================================================================

/**
 * Get all sections
 */
export async function getSections(): Promise<ServiceResponse<SectionWithTags[]>> {
  try {
    const { data: sections, error: sectionsError } = await supabaseUntyped
      .from('help_sections')
      .select('*')
      .order('display_order', { ascending: true })

    if (sectionsError) {
      debug.error('HelpCenterSectionService', 'Failed to get sections', { error: sectionsError })
      return { data: null, error: sectionsError }
    }

    // Get tag combinations for each section
    const sectionsWithTags: SectionWithTags[] = []
    for (const section of sections || []) {
      const { data: combinations, error: combError } = await supabaseUntyped
        .from('help_section_tag_combinations')
        .select('*')
        .eq('section_id', section.id)

      if (combError) {
        debug.error('HelpCenterSectionService', 'Failed to get tag combinations', { error: combError })
        continue
      }

      sectionsWithTags.push({
        id: section.id,
        name: section.name,
        displayOrder: section.display_order,
        isActive: section.is_active,
        createdAt: section.created_at,
        updatedAt: section.updated_at,
        tagCombinations: (combinations || []).map((comb: any) => ({
          id: comb.id,
          sectionId: comb.section_id,
          tagIds: comb.tag_ids,
          createdAt: comb.created_at,
        })),
      })
    }

    return { data: sectionsWithTags, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSectionService', 'Exception getting sections', { error })
    return { data: null, error }
  }
}

/**
 * Create section
 */
export async function createSection(
  section: {
    name: string
    displayOrder: number
    isActive?: boolean
    tagCombinations?: number[][]
  }
): Promise<ServiceResponse<SectionWithTags>> {
  try {
    // Create section
    const { data: sectionData, error: sectionError } = await supabaseUntyped
      .from('help_sections')
      .insert({
        name: section.name,
        display_order: section.displayOrder,
        is_active: section.isActive !== false,
      })
      .select()
      .single()

    if (sectionError) {
      debug.error('HelpCenterSectionService', 'Failed to create section', { error: sectionError })
      return { data: null, error: sectionError }
    }

    // Create tag combinations
    if (section.tagCombinations && section.tagCombinations.length > 0) {
      const { error: combError } = await supabaseUntyped
        .from('help_section_tag_combinations')
        .insert(
          section.tagCombinations.map(tagIds => ({
            section_id: sectionData.id,
            tag_ids: tagIds,
          }))
        )

      if (combError) {
        debug.error('HelpCenterSectionService', 'Failed to create tag combinations', { error: combError })
        // Continue anyway - section created
      }
    }

    // Fetch complete section with tags
    const result = await getSection(sectionData.id)
    return result
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSectionService', 'Exception creating section', { error })
    return { data: null, error }
  }
}

/**
 * Get single section
 */
export async function getSection(id: string): Promise<ServiceResponse<SectionWithTags>> {
  try {
    const { data: section, error: sectionError } = await supabaseUntyped
      .from('help_sections')
      .select('*')
      .eq('id', id)
      .single()

    if (sectionError) {
      return { data: null, error: sectionError }
    }

    const { data: combinations, error: combError } = await supabaseUntyped
      .from('help_section_tag_combinations')
      .select('*')
      .eq('section_id', id)

    if (combError) {
      return { data: null, error: combError }
    }

    const sectionWithTags: SectionWithTags = {
      id: section.id,
      name: section.name,
      displayOrder: section.display_order,
      isActive: section.is_active,
      createdAt: section.created_at,
      updatedAt: section.updated_at,
      tagCombinations: (combinations || []).map((comb: any) => ({
        id: comb.id,
        sectionId: comb.section_id,
        tagIds: comb.tag_ids,
        createdAt: comb.created_at,
      })),
    }

    return { data: sectionWithTags, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}

/**
 * Update section
 */
export async function updateSection(
  id: string,
  updates: {
    name?: string
    displayOrder?: number
    isActive?: boolean
    tagCombinations?: number[][]
  }
): Promise<ServiceResponse<SectionWithTags>> {
  try {
    // Update section
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseUntyped
        .from('help_sections')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        debug.error('HelpCenterSectionService', 'Failed to update section', { error: updateError })
        return { data: null, error: updateError }
      }
    }

    // Update tag combinations if provided
    if (updates.tagCombinations !== undefined) {
      // Delete existing combinations
      const { error: deleteError } = await supabaseUntyped
        .from('help_section_tag_combinations')
        .delete()
        .eq('section_id', id)

      if (deleteError) {
        debug.error('HelpCenterSectionService', 'Failed to delete tag combinations', { error: deleteError })
        return { data: null, error: deleteError }
      }

      // Create new combinations
      if (updates.tagCombinations.length > 0) {
        const { error: insertError } = await supabaseUntyped
          .from('help_section_tag_combinations')
          .insert(
            updates.tagCombinations.map(tagIds => ({
              section_id: id,
              tag_ids: tagIds,
            }))
          )

        if (insertError) {
          debug.error('HelpCenterSectionService', 'Failed to create tag combinations', { error: insertError })
          return { data: null, error: insertError }
        }
      }
    }

    // Fetch updated section
    return getSection(id)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSectionService', 'Exception updating section', { error })
    return { data: null, error }
  }
}

/**
 * Delete section
 */
export async function deleteSection(id: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabaseUntyped
      .from('help_sections')
      .delete()
      .eq('id', id)

    if (error) {
      debug.error('HelpCenterSectionService', 'Failed to delete section', { error })
      return { data: null, error }
    }

    return { data: null, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSectionService', 'Exception deleting section', { error })
    return { data: null, error }
  }
}

/**
 * Reorder sections
 */
export async function reorderSections(
  sectionOrders: Array<{ id: string; order: number }>
): Promise<ServiceResponse<void>> {
  try {
    const updates = sectionOrders.map(({ id, order }) =>
      supabaseUntyped
        .from('help_sections')
        .update({ display_order: order })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error).map(r => r.error)

    if (errors.length > 0) {
      return { data: null, error: errors[0] as any }
    }

    return { data: null, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSectionService', 'Exception reordering sections', { error })
    return { data: null, error }
  }
}
