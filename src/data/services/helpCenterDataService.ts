/**
 * Help Center Data Service
 * 
 * Fetches help center content with role-based filtering.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import {
  getAllCachedWordPressData,
} from './helpCenterSyncService'
import { getMappingsForRole } from './helpCenterMappingService'
import { getCategoryPageMapping } from './helpCenterMappingService'
import { getSections } from './helpCenterSectionService'
import type { WordPressCategory, WordPressPost } from './wordpressApiService'
import type { CategoryPageMapping } from './helpCenterMappingService'

// ============================================================================
// Types
// ============================================================================

export interface HelpCategory {
  id: number
  name: string
  slug: string
  description?: string
  coverPhotoUrl?: string
  thumbnailUrl?: string
  articleCount: number
}

export interface HelpArticle {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  categorySlug: string
  categoryName: string
  tags: number[]
  lastModified: string
  readingTime?: number
}

export interface HelpSection {
  id: string
  name: string
  articles: HelpArticle[]
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

const THUMBNAILS_BUCKET = 'help-center-thumbnails'
const THUMBNAILS_FOLDER = 'category-thumbnails'

function getSlugFromFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '')
}

async function getCategoryThumbnailUrls(
  categorySlugs: string[]
): Promise<Record<string, string>> {
  if (categorySlugs.length === 0) {
    return {}
  }

  try {
    const slugSet = new Set(categorySlugs)
    const { data: files, error } = await supabase.storage
      .from(THUMBNAILS_BUCKET)
      .list(THUMBNAILS_FOLDER, {
        limit: 1000,
        sortBy: { column: 'updated_at', order: 'desc' },
      })

    if (error || !files) {
      return {}
    }

    const thumbnails: Record<string, string> = {}

    for (const file of files) {
      const slug = getSlugFromFileName(file.name)

      if (!slugSet.has(slug) || thumbnails[slug]) {
        continue
      }

      const { data: urlData } = supabase.storage
        .from(THUMBNAILS_BUCKET)
        .getPublicUrl(`${THUMBNAILS_FOLDER}/${file.name}`)

      if (urlData?.publicUrl) {
        thumbnails[slug] = urlData.publicUrl
      }
    }

    return thumbnails
  } catch {
    return {}
  }
}

// ============================================================================
// Role-Based Category Fetching
// ============================================================================

/**
 * Get categories available to a user role
 */
export async function getCategoriesForRole(
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
): Promise<ServiceResponse<HelpCategory[]>> {
  try {
    // Get role mappings
    const mappingsResult = await getMappingsForRole(role)
    if (mappingsResult.error) {
      return { data: null, error: mappingsResult.error }
    }

    const mappings = mappingsResult.data || []
    if (mappings.length === 0) {
      return { data: [], error: null }
    }

    // Get categories from cache
    const categoryIds = mappings.map(m => m.wordpressCategoryId)
    const allCategoriesResult = await getAllCachedWordPressData<WordPressCategory>('category')
    if (allCategoriesResult.error) {
      return { data: null, error: allCategoriesResult.error }
    }

    const categories = (allCategoriesResult.data || []).filter(cat =>
      categoryIds.includes(cat.id)
    )

    // Get thumbnails from storage (supports jpg/png/webp)
    const thumbnails = await getCategoryThumbnailUrls(categories.map(category => category.slug))

    // Get category page mappings for descriptions (cover photos now come from category images)
    const categoryPages: Record<string, CategoryPageMapping> = {}
    for (const category of categories) {
      const pageResult = await getCategoryPageMapping(category.slug)
      if (!pageResult.error && pageResult.data) {
        categoryPages[category.slug] = pageResult.data
      }
    }

    // Get post counts
    const allPostsResult = await getAllCachedWordPressData<WordPressPost>('post')
    const posts = allPostsResult.data || []
    const postCounts: Record<number, number> = {}
    posts.forEach(post => {
      post.categories.forEach(catId => {
        postCounts[catId] = (postCounts[catId] || 0) + 1
      })
    })

    // Helper function to extract category image URL
    const getCategoryImageUrl = (category: WordPressCategory): string | undefined => {
      // Try direct image field first (Category Images plugin)
      if (category.image?.url || category.image?.src) {
        return category.image.url || category.image.src
      }
      // Try ACF image field
      if (category.acf?.image?.url || category.acf?.image?.src) {
        return category.acf.image.url || category.acf.image.src
      }
      return undefined
    }

    // Build help categories
    const helpCategories: HelpCategory[] = categories.map(category => {
      const pageMapping = categoryPages[category.slug]
      const categoryImageUrl = getCategoryImageUrl(category)
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: pageMapping?.pageContentHtml
          ? pageMapping.pageContentHtml.replace(/<[^>]*>/g, '').substring(0, 200)
          : undefined,
        coverPhotoUrl: categoryImageUrl, // Use WordPress category image instead of page featured image
        thumbnailUrl: thumbnails[category.slug],
        articleCount: postCounts[category.id] || 0,
      }
    })

    return { data: helpCategories, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting categories for role', { error, role })
    return { data: null, error }
  }
}

/**
 * Get category details with cover photo and description
 */
export async function getCategoryDetails(
  categorySlug: string
): Promise<ServiceResponse<HelpCategory & { coverPhotoUrl: string; description: string }>> {
  try {
    // Get category from cache
    const categoryResult = await getAllCachedWordPressData<WordPressCategory>('category')
    if (categoryResult.error) {
      return { data: null, error: categoryResult.error }
    }

    const category = (categoryResult.data || []).find(cat => cat.slug === categorySlug)
    if (!category) {
      return { data: null, error: new Error('Category not found') }
    }

    // Get page mapping for description (cover photo comes from category image)
    const pageResult = await getCategoryPageMapping(categorySlug)
    const pageMapping = pageResult.data

    // Get post count
    const allPostsResult = await getAllCachedWordPressData<WordPressPost>('post')
    const posts = allPostsResult.data || []
    const articleCount = posts.filter(post => post.categories.includes(category.id)).length

    const thumbnailUrls = await getCategoryThumbnailUrls([category.slug])
    const thumbnailUrl = thumbnailUrls[category.slug]

    // Get category image URL
    const getCategoryImageUrl = (cat: WordPressCategory): string => {
      // Try direct image field first (Category Images plugin)
      if (cat.image?.url || cat.image?.src) {
        return cat.image.url || cat.image.src
      }
      // Try ACF image field
      if (cat.acf?.image?.url || cat.acf?.image?.src) {
        return cat.acf.image.url || cat.acf.image.src
      }
      return ''
    }

    const helpCategory: HelpCategory & { coverPhotoUrl: string; description: string } = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      coverPhotoUrl: getCategoryImageUrl(category), // Use WordPress category image
      description: pageMapping?.pageContentHtml || '',
      thumbnailUrl,
      articleCount,
    }

    return { data: helpCategory, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting category details', { error, categorySlug })
    return { data: null, error }
  }
}

/**
 * Get articles for a category, organized by sections
 */
export async function getCategoryArticles(
  categorySlug: string,
  _role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
): Promise<ServiceResponse<{ sections: HelpSection[]; generalArticles: HelpArticle[] }>> {
  try {
    // Get category
    const categoryResult = await getAllCachedWordPressData<WordPressCategory>('category')
    if (categoryResult.error) {
      return { data: null, error: categoryResult.error }
    }

    const category = (categoryResult.data || []).find(cat => cat.slug === categorySlug)
    if (!category) {
      return { data: null, error: new Error('Category not found') }
    }

    // Get all posts for this category
    const allPostsResult = await getAllCachedWordPressData<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }

    const categoryPosts = (allPostsResult.data || []).filter(post =>
      post.categories.includes(category.id) && post.status === 'publish'
    )

    // Get sections
    const sectionsResult = await getSections()
    if (sectionsResult.error) {
      return { data: null, error: sectionsResult.error }
    }

    const activeSections = (sectionsResult.data || []).filter(s => s.isActive)

    // Organize posts by sections
    const sectionArticles: Record<string, HelpArticle[]> = {}
    const generalArticles: HelpArticle[] = []

    for (const post of categoryPosts) {
      const article: HelpArticle = {
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        categorySlug: category.slug,
        categoryName: category.name,
        tags: post.tags,
        lastModified: post.modified,
        readingTime: estimateReadingTime(post.content.rendered),
      }

      // Check which sections this article belongs to
      let belongsToSection = false
      for (const section of activeSections) {
        for (const combination of section.tagCombinations) {
          // Article must have ALL tags in the combination
          const hasAllTags = combination.tagIds.every(tagId => post.tags.includes(tagId))
          if (hasAllTags) {
            if (!sectionArticles[section.id]) {
              sectionArticles[section.id] = []
            }
            sectionArticles[section.id].push(article)
            belongsToSection = true
            break
          }
        }
      }

      if (!belongsToSection) {
        generalArticles.push(article)
      }
    }

    // Build sections array
    const sections: HelpSection[] = activeSections
      .filter(section => sectionArticles[section.id] && sectionArticles[section.id].length > 0)
      .map(section => ({
        id: section.id,
        name: section.name,
        articles: sectionArticles[section.id],
      }))
      .sort((a, b) => {
        const aOrder = activeSections.find(s => s.id === a.id)?.displayOrder || 0
        const bOrder = activeSections.find(s => s.id === b.id)?.displayOrder || 0
        return aOrder - bOrder
      })

    return {
      data: {
        sections,
        generalArticles,
      },
      error: null,
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting category articles', { error, categorySlug })
    return { data: null, error }
  }
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(
  categorySlug: string,
  articleSlug: string
): Promise<ServiceResponse<HelpArticle>> {
  try {
    const allPostsResult = await getAllCachedWordPressData<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }

    const post = (allPostsResult.data || []).find(
      p => p.slug === articleSlug && p.status === 'publish'
    )

    if (!post) {
      return { data: null, error: new Error('Article not found') }
    }

    // Get category
    const categoryResult = await getAllCachedWordPressData<WordPressCategory>('category')
    const category = (categoryResult.data || []).find(cat => cat.slug === categorySlug)

    const article: HelpArticle = {
      id: post.id,
      title: post.title.rendered,
      slug: post.slug,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
      content: post.content.rendered,
      categorySlug: categorySlug,
      categoryName: category?.name || '',
      tags: post.tags,
      lastModified: post.modified,
      readingTime: estimateReadingTime(post.content.rendered),
    }

    return { data: article, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting article', { error, articleSlug })
    return { data: null, error }
  }
}

/**
 * Search articles (role-filtered)
 */
export async function searchArticles(
  query: string,
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin'
): Promise<ServiceResponse<HelpArticle[]>> {
  try {
    if (!query || query.trim().length < 2) {
      return { data: [], error: null }
    }

    // Get role mappings
    const mappingsResult = await getMappingsForRole(role)
    if (mappingsResult.error) {
      return { data: null, error: mappingsResult.error }
    }

    const mappings = mappingsResult.data || []
    const categoryIds = mappings.map(m => m.wordpressCategoryId)

    // Use client-side search (more reliable than PostgREST JSONB queries)
    return searchArticlesClientSide(query, categoryIds)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception searching articles', { error, query })
    return { data: null, error }
  }
}

/**
 * Client-side search fallback
 */
async function searchArticlesClientSide(
  query: string,
  categoryIds: number[]
): Promise<ServiceResponse<HelpArticle[]>> {
  try {
    const allPostsResult = await getAllCachedWordPressData<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }

    const searchLower = query.toLowerCase()
    const matchingPosts = (allPostsResult.data || [])
      .filter(
        post =>
          post.status === 'publish' &&
          post.categories.some(catId => categoryIds.includes(catId)) &&
          (post.title.rendered.toLowerCase().includes(searchLower) ||
            post.content.rendered.toLowerCase().includes(searchLower) ||
            post.excerpt.rendered.toLowerCase().includes(searchLower))
      )
      .slice(0, 20)

    const categoryResult = await getAllCachedWordPressData<WordPressCategory>('category')
    const categories = categoryResult.data || []
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

    const articles: HelpArticle[] = matchingPosts.map(post => {
      const category = post.categories
        .map(catId => categoryMap.get(catId))
        .find(Boolean)

      return {
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        categorySlug: category?.slug || '',
        categoryName: category?.name || '',
        tags: post.tags,
        lastModified: post.modified,
        readingTime: estimateReadingTime(post.content.rendered),
      }
    })

    return { data: articles, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}

/**
 * Estimate reading time in minutes
 */
function estimateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, '')
  const words = text.split(/\s+/).length
  const minutes = Math.ceil(words / 200) // Average reading speed: 200 words/minute
  return minutes
}
