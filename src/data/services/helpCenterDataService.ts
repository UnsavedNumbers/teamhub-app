/**
 * Help Center Data Service
 * 
 * Fetches help center content with role-based filtering.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { getMappingsForRole } from './helpCenterMappingService'
import { getCategoryPageMapping } from './helpCenterMappingService'
import { getSections } from './helpCenterSectionService'
import { getWordPressConfigForApi } from './helpCenterConfigService'
import {
  type WordPressCategory,
  type WordPressPost,
  getWordPressCategories,
  getWordPressPosts,
  initializeWordPressApi,
} from './wordpressApiService'
import type { CategoryPageMapping } from './helpCenterMappingService'

// ============================================================================
// Helper Functions - Direct WordPress API (No Cache)
// ============================================================================

/**
 * Get all WordPress data directly from API (no cache)
 */
async function getAllWordPressDataDirect<T extends WordPressCategory | WordPressPost>(
  type: 'category' | 'post'
): Promise<{ data: T[]; error: Error | null }> {
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`[HelpCenter] 🌐 Fetching WordPress ${type}s directly from API (no cache)`)
    }

    const configResult = await getWordPressConfigForApi()
    if (configResult.error || !configResult.data) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ WordPress config error:', configResult.error)
      }
      return { data: [], error: configResult.error || new Error('WordPress configuration not found') }
    }

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] ✅ WordPress config loaded:', { apiUrl: configResult.data.apiUrl, authMethod: configResult.data.authMethod })
    }

    initializeWordPressApi(configResult.data)

    if (type === 'category') {
      const result = await getWordPressCategories(configResult.data)
      if (result.error) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.error('[HelpCenter] ❌ Error fetching categories:', result.error)
        }
        return { data: [], error: result.error }
      }
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`[HelpCenter] ✅ Fetched ${result.data?.length || 0} categories from WordPress API`)
      }
      return { data: (result.data || []) as T[], error: null }
    } else if (type === 'post') {
      const allPosts: WordPressPost[] = []
      let page = 1
      const perPage = 100
      let hasMore = true

      while (hasMore) {
        const result = await getWordPressPosts(configResult.data, { perPage, page })
        if (result.error) {
          if (allPosts.length > 0) {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('[HelpCenter] Partial posts loaded before error', { count: allPosts.length, error: result.error })
            }
            break
          }
          return { data: [], error: result.error }
        }

        const posts = result.data || []
        allPosts.push(...posts)

        hasMore = posts.length === perPage
        page++
      }

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`[HelpCenter] ✅ Fetched ${allPosts.length} posts from WordPress API (across ${page - 1} pages)`)
      }
      return { data: allPosts as T[], error: null }
    }

    return { data: [], error: new Error(`Unknown type: ${type}`) }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.error(`[HelpCenter] ❌ Exception getting WordPress ${type} data:`, error)
    }
    debug.error('HelpCenterDataService', `Exception getting WordPress ${type} data`, { error })
    return { data: [], error }
  }
}

// ============================================================================
// Types
// ============================================================================

export interface HelpCategory {
  id: number
  name: string
  slug: string
  parentId?: number
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
  featuredImageUrl?: string
  categorySlug: string
  categoryName: string
  categoryPath?: string[]
  categoryNames?: string[]
  tags: number[]
  lastModified: string
  readingTime?: number
}

export interface HelpSection {
  id: string
  name: string
  articles: HelpArticle[]
}

export interface HelpCategoryArticleGroup {
  id: number
  name: string
  slug: string
  parentId: number
  depth: number
  articles: HelpArticle[]
}

export interface HelpSubcategoryGroup {
  id: number
  name: string
  slug: string
  description?: string
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

function resolveAccessibleCategoryIds(
  allCategories: WordPressCategory[],
  baseCategoryIds: number[],
  includeDescendants: boolean
): number[] {
  const allowedIds = new Set(baseCategoryIds)

  if (!includeDescendants) {
    return Array.from(allowedIds)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const category of allCategories) {
      if (category.parent !== 0 && allowedIds.has(category.parent) && !allowedIds.has(category.id)) {
        allowedIds.add(category.id)
        changed = true
      }
    }
  }

  return Array.from(allowedIds)
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
  role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin',
  options?: { includeDescendants?: boolean }
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
    const allCategoriesResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    if (allCategoriesResult.error) {
      return { data: null, error: allCategoriesResult.error }
    }

    const allCategories = allCategoriesResult.data || []
    const accessibleCategoryIds = resolveAccessibleCategoryIds(
      allCategories,
      categoryIds,
      options?.includeDescendants === true
    )
    const categories = allCategories.filter(cat => accessibleCategoryIds.includes(cat.id))

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
    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
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
        parentId: category.parent,
        description: pageMapping?.pageContentHtml
          ? pageMapping.pageContentHtml.replace(/<[^>]*>/g, '').substring(0, 200)
          : undefined,
        coverPhotoUrl: categoryImageUrl, // Use WordPress category image instead of page featured image
        thumbnailUrl: thumbnails[category.slug],
        articleCount: postCounts[category.id] || 0,
      }
    }).sort((a, b) => {
      const aParent = a.parentId || 0
      const bParent = b.parentId || 0
      if (aParent !== bParent) return aParent - bParent
      return a.name.localeCompare(b.name)
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
    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
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
    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
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
      parentId: category.parent,
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
  _role: 'parent' | 'coach' | 'org_admin' | 'athlete' | 'platform_admin',
  options?: { includeDescendants?: boolean }
): Promise<ServiceResponse<{ sections: HelpSection[]; generalArticles: HelpArticle[] }>> {
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 🔍 getCategoryArticles called')
      console.log('[HelpCenter] 📍 Category slug:', categorySlug)
      console.log('[HelpCenter] 📍 Include descendants:', options?.includeDescendants)
    }

    // Get category
    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    if (categoryResult.error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ Error fetching categories:', categoryResult.error)
      }
      return { data: null, error: categoryResult.error }
    }

    const allCategories = categoryResult.data || []
    const category = allCategories.find(cat => cat.slug === categorySlug)
    if (!category) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ Category not found for slug:', categorySlug)
      }
      return { data: null, error: new Error('Category not found') }
    }

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] ✅ Category found:', { id: category.id, name: category.name, slug: category.slug, parent: category.parent })
    }

    const categoryIds = resolveAccessibleCategoryIds(
      allCategories,
      [category.id],
      options?.includeDescendants === true
    )

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 🔎 Resolved category IDs to search:', categoryIds)
    }

    // Get all posts for this category
    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
    if (allPostsResult.error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ Error fetching posts:', allPostsResult.error)
      }
      return { data: null, error: allPostsResult.error }
    }

    const categoryPosts = (allPostsResult.data || []).filter(post =>
      post.status === 'publish' && post.categories.some(catId => categoryIds.includes(catId))
    )

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 📄 Posts matching category:', categoryPosts.length)
      if (categoryPosts.length > 0) {
        console.log('[HelpCenter] 📄 Matching posts:', categoryPosts.map(p => ({
          id: p.id,
          title: p.title.rendered,
          slug: p.slug,
          categories: p.categories,
          status: p.status
        })))
      }
    }

    // Get sections (optional - if this fails, continue with no sections)
    const sectionsResult = await getSections()
    const activeSections = (sectionsResult.data || []).filter(s => s.isActive)

    // Build category path helper
    const buildCategoryPath = (cat: WordPressCategory): { slugs: string[]; names: string[] } => {
      const slugs: string[] = []
      const names: string[] = []
      let current: WordPressCategory | undefined = cat
      
      while (current) {
        slugs.unshift(current.slug)
        names.unshift(current.name)
        if (current.parent === 0) break
        current = allCategories.find(c => c.id === current!.parent)
      }
      
      return { slugs, names }
    }

    // Organize posts by sections
    const sectionArticles: Record<string, HelpArticle[]> = {}
    const generalArticles: HelpArticle[] = []

    for (const post of categoryPosts) {
      const matchedCategory = post.categories
        .map(catId => allCategories.find(cat => cat.id === catId))
        .find((cat): cat is WordPressCategory => Boolean(cat && categoryIds.includes(cat.id)))

      const articleCategory = matchedCategory || category
      const { slugs: categoryPath, names: categoryNames } = buildCategoryPath(articleCategory)

      const article: HelpArticle = {
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categorySlug: articleCategory.slug,
        categoryName: articleCategory.name,
        categoryPath,
        categoryNames,
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
 * Get descendant categories under a root category and include articles for each category.
 */
export async function getCategoryChildArticles(
  rootCategorySlug: string
): Promise<ServiceResponse<HelpCategoryArticleGroup[]>> {
  try {
    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    if (categoryResult.error) {
      return { data: null, error: categoryResult.error }
    }

    const allCategories = categoryResult.data || []
    const rootCategory = allCategories.find(cat => cat.slug === rootCategorySlug)
    if (!rootCategory) {
      return { data: null, error: new Error('Category not found') }
    }

    const descendants: Array<{ category: WordPressCategory; depth: number }> = []
    const queue: Array<{ id: number; depth: number }> = [{ id: rootCategory.id, depth: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break

      const children = allCategories
        .filter(category => category.parent === current.id)
        .sort((a, b) => a.name.localeCompare(b.name))

      for (const child of children) {
        descendants.push({ category: child, depth: current.depth + 1 })
        queue.push({ id: child.id, depth: current.depth + 1 })
      }
    }

    if (descendants.length === 0) {
      return { data: [], error: null }
    }

    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }

    const posts = allPostsResult.data || []

    const buildCategoryPath = (cat: WordPressCategory): { slugs: string[]; names: string[] } => {
      const slugs: string[] = []
      const names: string[] = []
      let current: WordPressCategory | undefined = cat
      
      while (current) {
        slugs.unshift(current.slug)
        names.unshift(current.name)
        if (current.parent === 0) break
        current = allCategories.find(c => c.id === current!.parent)
      }
      
      return { slugs, names }
    }

    const grouped: HelpCategoryArticleGroup[] = descendants.map(({ category, depth }) => {
      const categoryPosts = posts.filter(
        post => post.status === 'publish' && post.categories.includes(category.id)
      )

      const { slugs: categoryPath, names: categoryNames } = buildCategoryPath(category)

      const articles: HelpArticle[] = categoryPosts.map(post => ({
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categorySlug: category.slug,
        categoryName: category.name,
        categoryPath,
        categoryNames,
        tags: post.tags,
        lastModified: post.modified,
        readingTime: estimateReadingTime(post.content.rendered),
      }))

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parent,
        depth,
        articles,
      }
    })

    return { data: grouped, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting category child articles', { error, rootCategorySlug })
    return { data: null, error }
  }
}

/**
 * Get immediate subcategory groups under a root category with each group's articles.
 * Group headers are direct child categories. Articles include child descendants.
 */
export async function getCategorySubcategoryGroups(
  rootCategorySlug: string
): Promise<ServiceResponse<HelpSubcategoryGroup[]>> {
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 🔍 getCategorySubcategoryGroups called with rootCategorySlug:', rootCategorySlug)
    }

    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    if (categoryResult.error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ Error fetching categories:', categoryResult.error)
      }
      return { data: null, error: categoryResult.error }
    }

    const allCategories = categoryResult.data || []
    
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 📋 All categories fetched:', allCategories.length, 'categories')
      console.log('[HelpCenter] 📋 Category slugs:', allCategories.map(c => ({ id: c.id, name: c.name, slug: c.slug, parent: c.parent })))
    }

    const rootCategory = allCategories.find(cat => cat.slug === rootCategorySlug)
    if (!rootCategory) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[HelpCenter] ❌ Root category not found for slug:', rootCategorySlug)
        console.log('[HelpCenter] Available slugs:', allCategories.map(c => c.slug))
      }
      return { data: null, error: new Error('Category not found') }
    }

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] ✅ Root category found:', { id: rootCategory.id, name: rootCategory.name, slug: rootCategory.slug })
    }

    const childCategories = allCategories
      .filter(category => category.parent === rootCategory.id)
      .sort((a, b) => a.name.localeCompare(b.name))

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HelpCenter] 👶 Child categories found:', childCategories.length)
      console.log('[HelpCenter] 👶 Child category details:', childCategories.map(c => ({ id: c.id, name: c.name, slug: c.slug, parent: c.parent })))
    }

    if (childCategories.length === 0) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.warn('[HelpCenter] ⚠️ No child categories found for root category:', rootCategory.name)
      }
      return { data: [], error: null }
    }

    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }
    const posts = allPostsResult.data || []

    const collectDescendantIds = (startId: number): number[] => {
      const ids = new Set<number>([startId])
      const queue: number[] = [startId]
      while (queue.length > 0) {
        const currentId = queue.shift()
        if (!currentId) continue
        const children = allCategories.filter(category => category.parent === currentId)
        for (const child of children) {
          if (!ids.has(child.id)) {
            ids.add(child.id)
            queue.push(child.id)
          }
        }
      }
      return Array.from(ids)
    }

    const buildCategoryPath = (cat: WordPressCategory): { slugs: string[]; names: string[] } => {
      const slugs: string[] = []
      const names: string[] = []
      let current: WordPressCategory | undefined = cat
      
      while (current) {
        slugs.unshift(current.slug)
        names.unshift(current.name)
        if (current.parent === 0) break
        current = allCategories.find(c => c.id === current!.parent)
      }
      
      return { slugs, names }
    }

    const groups: HelpSubcategoryGroup[] = childCategories.map((childCategory) => {
      const groupCategoryIds = collectDescendantIds(childCategory.id)

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`[HelpCenter] 🔎 Processing child category: "${childCategory.name}" (slug: ${childCategory.slug})`)
        console.log(`[HelpCenter] 🔎 Category IDs to search:`, groupCategoryIds)
        console.log(`[HelpCenter] 🔎 Total posts available:`, posts.length)
      }

      const groupPosts = posts.filter(
        post => post.status === 'publish' && post.categories.some(catId => groupCategoryIds.includes(catId))
      )

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`[HelpCenter] 📄 Posts matching "${childCategory.name}":`, groupPosts.length)
        if (groupPosts.length > 0) {
          console.log(`[HelpCenter] 📄 Matching post details:`, groupPosts.map(p => ({
            id: p.id,
            title: p.title.rendered,
            slug: p.slug,
            categories: p.categories,
            status: p.status
          })))
        }
      }

      const { slugs: categoryPath, names: categoryNames } = buildCategoryPath(childCategory)

      const articles: HelpArticle[] = groupPosts.map(post => ({
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categorySlug: childCategory.slug,
        categoryName: childCategory.name,
        categoryPath,
        categoryNames,
        tags: post.tags,
        lastModified: post.modified,
        readingTime: estimateReadingTime(post.content.rendered),
      }))

      const seen = new Set<number>()
      const uniqueArticles = articles.filter(article => {
        if (seen.has(article.id)) return false
        seen.add(article.id)
        return true
      })

      debug.data('HelpCenterDataService', `Child category group '${childCategory.name}'`, {
        categoryId: childCategory.id,
        categorySlug: childCategory.slug,
        categoryIds: groupCategoryIds,
        matchingPosts: groupPosts.length,
        articles: uniqueArticles.length,
      })

      return {
        id: childCategory.id,
        name: childCategory.name,
        slug: childCategory.slug,
        description: childCategory.description?.rendered ? childCategory.description.rendered.replace(/<[^>]*>/g, '').substring(0, 150) : undefined,
        articles: uniqueArticles,
      }
    })

    return { data: groups.filter(group => group.articles.length > 0), error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterDataService', 'Exception getting subcategory groups', { error, rootCategorySlug })
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
    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
    if (allPostsResult.error) {
      return { data: null, error: allPostsResult.error }
    }

    const post = (allPostsResult.data || []).find(
      p => p.slug === articleSlug && p.status === 'publish'
    )

    if (!post) {
      return { data: null, error: new Error('Article not found') }
    }

    // Get all categories
    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    const allCategories = categoryResult.data || []
    
    // Find the article's category (prefer the one matching categorySlug, or first matching category)
    const articleCategory = allCategories.find(cat => 
      post.categories.includes(cat.id) && cat.slug === categorySlug
    ) || allCategories.find(cat => post.categories.includes(cat.id))

    if (!articleCategory) {
      return { data: null, error: new Error('Category not found for article') }
    }

    // Build category path hierarchy
    const buildCategoryPath = (cat: WordPressCategory): { slugs: string[]; names: string[] } => {
      const slugs: string[] = []
      const names: string[] = []
      let current: WordPressCategory | undefined = cat
      
      while (current) {
        slugs.unshift(current.slug)
        names.unshift(current.name)
        if (current.parent === 0) break
        current = allCategories.find(c => c.id === current!.parent)
      }
      
      return { slugs, names }
    }

    const { slugs: categoryPath, names: categoryNames } = buildCategoryPath(articleCategory)

    const article: HelpArticle = {
      id: post.id,
      title: post.title.rendered,
      slug: post.slug,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
      content: post.content.rendered,
      featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      categorySlug: articleCategory.slug,
      categoryName: articleCategory.name,
      categoryPath,
      categoryNames,
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
    const mappedCategoryIds = mappings.map(m => m.wordpressCategoryId)

    const allCategoriesResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    if (allCategoriesResult.error) {
      return { data: null, error: allCategoriesResult.error }
    }
    const allCategories = allCategoriesResult.data || []
    const categoryIds = resolveAccessibleCategoryIds(allCategories, mappedCategoryIds, true)

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
    const allPostsResult = await getAllWordPressDataDirect<WordPressPost>('post')
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

    const categoryResult = await getAllWordPressDataDirect<WordPressCategory>('category')
    const categories = categoryResult.data || []
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

    const buildCategoryPath = (cat: WordPressCategory): { slugs: string[]; names: string[] } => {
      const slugs: string[] = []
      const names: string[] = []
      let current: WordPressCategory | undefined = cat
      
      while (current) {
        slugs.unshift(current.slug)
        names.unshift(current.name)
        if (current.parent === 0) break
        current = categories.find(c => c.id === current!.parent)
      }
      
      return { slugs, names }
    }

    const articles: HelpArticle[] = matchingPosts.map(post => {
      const category = post.categories
        .map(catId => categoryMap.get(catId))
        .find(Boolean)
      
      if (!category) {
        return {
          id: post.id,
          title: post.title.rendered,
          slug: post.slug,
          excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
          content: post.content.rendered,
          featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
          categorySlug: '',
          categoryName: '',
          tags: post.tags,
          lastModified: post.modified,
          readingTime: estimateReadingTime(post.content.rendered),
        }
      }

      const { slugs: categoryPath, names: categoryNames } = buildCategoryPath(category)

      return {
        id: post.id,
        title: post.title.rendered,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImageUrl: post.featured_media_url || post.jetpack_featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categorySlug: category.slug,
        categoryName: category.name,
        categoryPath,
        categoryNames,
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
