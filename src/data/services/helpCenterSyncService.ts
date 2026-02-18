/**
 * Help Center Sync Service
 * 
 * Handles synchronization of WordPress data to local cache.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import {
  type WordPressConfig,
  type WordPressCategory,
  type WordPressTag,
  type WordPressPost,
  type WordPressPage,
  getWordPressCategories,
  getWordPressTags,
  getWordPressPosts,
  getWordPressPages,
  getWordPressFeaturedImageUrl,
  initializeWordPressApi,
} from './wordpressApiService'

const supabaseUntyped = supabase as any

// ============================================================================
// Types
// ============================================================================

export interface SyncProgress {
  step: string
  progress: number
  total: number
  message?: string
}

export type SyncProgressCallback = (progress: SyncProgress) => void

export interface SyncResult {
  success: boolean
  categoriesSynced: number
  tagsSynced: number
  postsSynced: number
  pagesSynced: number
  errors: string[]
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Store item in cache
 */
async function cacheItem(
  cacheType: 'category' | 'tag' | 'post' | 'page',
  wordpressId: number,
  wordpressSlug: string,
  data: WordPressCategory | WordPressTag | WordPressPost | WordPressPage,
  expiresAt?: Date
): Promise<{ error: Error | null }> {
  try {
    const expiresAtValue = expiresAt || new Date(Date.now() + 60 * 60 * 1000) // 1 hour default

    const { error } = await supabaseUntyped
      .from('help_wordpress_cache')
      .upsert(
        {
          cache_type: cacheType,
          wordpress_id: wordpressId,
          wordpress_slug: wordpressSlug,
          data: data as any,
          expires_at: expiresAtValue.toISOString(),
        },
        {
          onConflict: 'cache_type,wordpress_id',
        }
      )

    if (error) {
      debug.error('HelpCenterSyncService', `Failed to cache ${cacheType}`, { error, wordpressId })
      return { error }
    }

    return { error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterSyncService', `Exception caching ${cacheType}`, { error, wordpressId })
    return { error }
  }
}

/**
 * Clear expired cache entries
 */
async function clearExpiredCache(): Promise<void> {
  try {
    const { error } = await supabaseUntyped
      .from('help_wordpress_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      debug.error('HelpCenterSyncService', 'Failed to clear expired cache', { error })
    }
  } catch (err) {
    debug.error('HelpCenterSyncService', 'Exception clearing expired cache', { error: err })
  }
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Sync categories from WordPress
 */
async function syncCategories(
  config: WordPressConfig,
  onProgress?: SyncProgressCallback
): Promise<{ categories: WordPressCategory[]; errors: string[] }> {
  const errors: string[] = []
  let categories: WordPressCategory[] = []

  try {
    onProgress?.({
      step: 'categories',
      progress: 0,
      total: 1,
      message: 'Fetching categories...',
    })

    // First, find the "Help" parent category
    const allCategoriesResult = await getWordPressCategories(config)
    if (allCategoriesResult.error) {
      errors.push(`Failed to fetch categories: ${allCategoriesResult.error.message}`)
      return { categories: [], errors }
    }

    if (!allCategoriesResult.data) {
      errors.push('No categories returned from WordPress')
      return { categories: [], errors }
    }

    // Find parent "Help" category (slug should be "help")
    const helpCategory = allCategoriesResult.data.find(cat => cat.slug === 'help')
    if (!helpCategory) {
      errors.push('Parent "Help" category not found. Please create a category with slug "help" in WordPress.')
      return { categories: [], errors }
    }

    // Get child categories under "Help"
    const childCategoriesResult = await getWordPressCategories(config, helpCategory.id)
    if (childCategoriesResult.error) {
      errors.push(`Failed to fetch child categories: ${childCategoriesResult.error.message}`)
      return { categories: [], errors }
    }

    categories = childCategoriesResult.data || []

    // Cache all categories (including parent)
    const categoriesToCache = [helpCategory, ...categories]
    let cached = 0

    for (const category of categoriesToCache) {
      const cacheResult = await cacheItem('category', category.id, category.slug, category)
      if (cacheResult.error) {
        errors.push(`Failed to cache category ${category.name}: ${cacheResult.error.message}`)
      } else {
        cached++
      }
    }

    onProgress?.({
      step: 'categories',
      progress: cached,
      total: categoriesToCache.length,
      message: `Cached ${cached} categories`,
    })

    debug.data('HelpCenterSyncService', 'Categories synced', { count: cached, total: categoriesToCache.length })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    errors.push(`Exception syncing categories: ${error.message}`)
    debug.error('HelpCenterSyncService', 'Exception syncing categories', { error })
  }

  return { categories, errors }
}

/**
 * Sync tags from WordPress
 */
async function syncTags(
  config: WordPressConfig,
  onProgress?: SyncProgressCallback
): Promise<{ tags: WordPressTag[]; errors: string[] }> {
  const errors: string[] = []
  let tags: WordPressTag[] = []

  try {
    onProgress?.({
      step: 'tags',
      progress: 0,
      total: 1,
      message: 'Fetching tags...',
    })

    const tagsResult = await getWordPressTags(config)
    if (tagsResult.error) {
      errors.push(`Failed to fetch tags: ${tagsResult.error.message}`)
      return { tags: [], errors }
    }

    tags = tagsResult.data || []

    // Cache tags
    let cached = 0
    for (const tag of tags) {
      const cacheResult = await cacheItem('tag', tag.id, tag.slug, tag)
      if (cacheResult.error) {
        errors.push(`Failed to cache tag ${tag.name}: ${cacheResult.error.message}`)
      } else {
        cached++
      }
    }

    onProgress?.({
      step: 'tags',
      progress: cached,
      total: tags.length,
      message: `Cached ${cached} tags`,
    })

    debug.data('HelpCenterSyncService', 'Tags synced', { count: cached, total: tags.length })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    errors.push(`Exception syncing tags: ${error.message}`)
    debug.error('HelpCenterSyncService', 'Exception syncing tags', { error })
  }

  return { tags, errors }
}

/**
 * Sync posts from WordPress (with pagination)
 */
async function syncPosts(
  config: WordPressConfig,
  categoryIds: number[],
  onProgress?: SyncProgressCallback
): Promise<{ posts: WordPressPost[]; errors: string[] }> {
  const errors: string[] = []
  const posts: WordPressPost[] = []
  const perPage = 100
  let page = 1
  let hasMore = true

  try {
    while (hasMore) {
      onProgress?.({
        step: 'posts',
        progress: posts.length,
        total: posts.length + perPage,
        message: `Fetching posts page ${page}...`,
      })

      const postsResult = await getWordPressPosts(config, {
        categories: categoryIds,
        perPage,
        page,
      })

      if (postsResult.error) {
        errors.push(`Failed to fetch posts page ${page}: ${postsResult.error.message}`)
        hasMore = false
        break
      }

      const pagePosts = postsResult.data || []
      posts.push(...pagePosts)

      // Cache posts
      let cached = 0
      for (const post of pagePosts) {
        const cacheResult = await cacheItem('post', post.id, post.slug, post)
        if (cacheResult.error) {
          errors.push(`Failed to cache post ${post.title.rendered}: ${cacheResult.error.message}`)
        } else {
          cached++
        }
      }

      // Check if there are more pages
      hasMore = pagePosts.length === perPage
      page++

      onProgress?.({
        step: 'posts',
        progress: posts.length,
        total: posts.length,
        message: `Cached ${cached} posts (page ${page - 1})`,
      })
    }

    debug.data('HelpCenterSyncService', 'Posts synced', { count: posts.length })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    errors.push(`Exception syncing posts: ${error.message}`)
    debug.error('HelpCenterSyncService', 'Exception syncing posts', { error })
  }

  return { posts, errors }
}

/**
 * Sync pages from WordPress
 */
async function syncPages(
  config: WordPressConfig,
  categorySlugs: string[],
  onProgress?: SyncProgressCallback
): Promise<{ pages: WordPressPage[]; errors: string[] }> {
  const errors: string[] = []
  const pages: WordPressPage[] = []

  try {
    onProgress?.({
      step: 'pages',
      progress: 0,
      total: categorySlugs.length,
      message: 'Fetching pages...',
    })

    // Fetch all pages
    const allPagesResult = await getWordPressPages(config)
    if (allPagesResult.error) {
      errors.push(`Failed to fetch pages: ${allPagesResult.error.message}`)
      return { pages: [], errors }
    }

    const allPages = allPagesResult.data || []

    // Filter pages that match category slugs
    const matchingPages = allPages.filter(page =>
      categorySlugs.includes(page.slug)
    )

    // Cache matching pages and fetch featured images
    let cached = 0
    for (const page of matchingPages) {
      // Fetch featured image URL if available
      if (page.featured_media && page.featured_media > 0) {
        const imageResult = await getWordPressFeaturedImageUrl(config, page.featured_media)
        if (!imageResult.error && imageResult.data) {
          (page as any).featured_media_url = imageResult.data
        }
      }

      const cacheResult = await cacheItem('page', page.id, page.slug, page)
      if (cacheResult.error) {
        errors.push(`Failed to cache page ${page.title.rendered}: ${cacheResult.error.message}`)
      } else {
        cached++
        pages.push(page)
      }
    }

    onProgress?.({
      step: 'pages',
      progress: cached,
      total: matchingPages.length,
      message: `Cached ${cached} pages`,
    })

    debug.data('HelpCenterSyncService', 'Pages synced', { count: cached, total: matchingPages.length })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    errors.push(`Exception syncing pages: ${error.message}`)
    debug.error('HelpCenterSyncService', 'Exception syncing pages', { error })
  }

  return { pages, errors }
}

// ============================================================================
// Main Sync Function
// ============================================================================

/**
 * Full sync of WordPress data
 */
export async function syncWordPressData(
  config: WordPressConfig,
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  debug.perf.start('helpCenterSync.fullSync')
  debug.data('HelpCenterSyncService', 'Starting full sync', { apiUrl: config.apiUrl })

  const result: SyncResult = {
    success: false,
    categoriesSynced: 0,
    tagsSynced: 0,
    postsSynced: 0,
    pagesSynced: 0,
    errors: [],
  }

  try {
    // Initialize API client
    initializeWordPressApi(config)

    // Clear expired cache
    await clearExpiredCache()

    // Step 1: Sync categories
    onProgress?.({
      step: 'categories',
      progress: 0,
      total: 1,
      message: 'Syncing categories...',
    })

    const categoriesResult = await syncCategories(config, onProgress)
    result.categoriesSynced = categoriesResult.categories.length
    result.errors.push(...categoriesResult.errors)

    if (categoriesResult.categories.length === 0) {
      result.errors.push('No categories found. Sync cannot continue.')
      debug.perf.end('helpCenterSync.fullSync')
      return result
    }

    // Step 2: Sync tags
    onProgress?.({
      step: 'tags',
      progress: 0,
      total: 1,
      message: 'Syncing tags...',
    })

    const tagsResult = await syncTags(config, onProgress)
    result.tagsSynced = tagsResult.tags.length
    result.errors.push(...tagsResult.errors)

    // Step 3: Sync posts (for all category IDs)
    const categoryIds = categoriesResult.categories.map(cat => cat.id)
    
    onProgress?.({
      step: 'posts',
      progress: 0,
      total: 1,
      message: 'Syncing posts...',
    })

    const postsResult = await syncPosts(config, categoryIds, onProgress)
    result.postsSynced = postsResult.posts.length
    result.errors.push(...postsResult.errors)

    // Step 4: Sync pages (matching category slugs)
    const categorySlugs = categoriesResult.categories.map(cat => cat.slug)
    
    onProgress?.({
      step: 'pages',
      progress: 0,
      total: categorySlugs.length,
      message: 'Syncing pages...',
    })

    const pagesResult = await syncPages(config, categorySlugs, onProgress)
    result.pagesSynced = pagesResult.pages.length
    result.errors.push(...pagesResult.errors)

    // Update sync timestamp in config
    try {
      const { error: updateError } = await supabaseUntyped
        .from('help_wordpress_config')
        .update({
          last_sync_at: new Date().toISOString(),
          connection_status: 'connected',
          last_error: result.errors.length > 0 ? result.errors.join('; ') : null,
        })
        .eq('id', (await getConfigId()) || '')

      if (updateError) {
        debug.error('HelpCenterSyncService', 'Failed to update sync timestamp', { error: updateError })
      }
    } catch (err) {
      debug.error('HelpCenterSyncService', 'Exception updating sync timestamp', { error: err })
    }

    result.success = result.errors.length === 0 || result.postsSynced > 0

    onProgress?.({
      step: 'complete',
      progress: 100,
      total: 100,
      message: 'Sync complete',
    })

    debug.perf.end('helpCenterSync.fullSync')
    debug.data('HelpCenterSyncService', 'Sync complete', result)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    result.errors.push(`Sync failed: ${error.message}`)
    debug.error('HelpCenterSyncService', 'Sync exception', { error })
    debug.perf.end('helpCenterSync.fullSync')
  }

  return result
}

/**
 * Get WordPress config ID (helper function)
 */
async function getConfigId(): Promise<string | null> {
  const { data } = await supabaseUntyped
    .from('help_wordpress_config')
    .select('id')
    .limit(1)
    .maybeSingle()

  return data?.id || null
}

/**
 * Get cached WordPress data
 */
export async function getCachedWordPressData<T>(
  cacheType: 'category' | 'tag' | 'post' | 'page',
  wordpressId?: number,
  wordpressSlug?: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    let query = supabaseUntyped
      .from('help_wordpress_cache')
      .select('data')
      .eq('cache_type', cacheType)
      .gt('expires_at', new Date().toISOString())

    if (wordpressId !== undefined) {
      query = query.eq('wordpress_id', wordpressId)
    } else if (wordpressSlug) {
      query = query.eq('wordpress_slug', wordpressSlug)
    } else {
      return {
        data: null,
        error: new Error('Either wordpressId or wordpressSlug must be provided'),
      }
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: null }
    }

    return { data: data.data as T, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}

/**
 * Get all cached items of a type
 */
export async function getAllCachedWordPressData<T>(
  cacheType: 'category' | 'tag' | 'post' | 'page'
): Promise<{ data: T[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseUntyped
      .from('help_wordpress_cache')
      .select('data')
      .eq('cache_type', cacheType)
      .gt('expires_at', new Date().toISOString())

    if (error) {
      return { data: [], error }
    }

    const items = (data || []).map((item: any) => item.data as T)
    return { data: items, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: [], error }
  }
}
