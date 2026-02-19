/**
 * WordPress API Cache Service
 * 
 * Implements stale-while-revalidate caching for WordPress API responses.
 * Cache duration: 5 minutes
 * Strategy: Serve cached version immediately, fetch fresh content in background
 */

import { debug } from '../../lib/debug'
import {
  type WordPressConfig,
  type WordPressCategory,
  type WordPressPost,
  type WordPressTag,
  type WordPressPage,
  getWordPressCategories,
  getWordPressPosts,
  getWordPressTags,
  getWordPressPages,
  getWordPressPostBySlug,
  getWordPressPageBySlug,
} from './wordpressApiService'

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY_PREFIX = 'wp_api_cache_'

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

type CacheKey = 
  | 'categories'
  | 'categories_parent'
  | 'posts'
  | 'posts_page'
  | 'tags'
  | 'pages'
  | 'post_slug'
  | 'page_slug'

// ============================================================================
// Cache Storage
// ============================================================================

/**
 * In-memory cache store
 */
const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Generate cache key
 */
function getCacheKey(key: CacheKey, params?: Record<string, any>): string {
  const baseKey = `${CACHE_KEY_PREFIX}${key}`
  if (!params || Object.keys(params).length === 0) {
    return baseKey
  }
  const paramString = JSON.stringify(params)
  return `${baseKey}_${btoa(paramString).replace(/[^a-zA-Z0-9]/g, '')}`
}

/**
 * Check if cache entry is fresh (within cache duration)
 */
function isFresh(expiresAt: number): boolean {
  return Date.now() < expiresAt
}

/**
 * Check if cache entry is stale but usable (expired but can serve stale)
 */
function isStale(expiresAt: number): boolean {
  const now = Date.now()
  return now >= expiresAt && now < expiresAt + CACHE_DURATION_MS // Allow stale for another cache duration
}

/**
 * Get cached data
 */
function getCached<T>(key: string): CacheEntry<T> | null {
  const entry = memoryCache.get(key)
  if (!entry) {
    return null
  }
  
  // Remove expired entries that are too old
  if (Date.now() >= entry.expiresAt + CACHE_DURATION_MS) {
    memoryCache.delete(key)
    return null
  }
  
  return entry
}

/**
 * Set cached data
 */
function setCached<T>(key: string, data: T): void {
  const now = Date.now()
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + CACHE_DURATION_MS,
  }
  memoryCache.set(key, entry)
}

/**
 * Clear all cache entries
 */
export function clearWordPressCache(): void {
  memoryCache.clear()
  debug.data('WordPressApiCacheService', 'Cache cleared')
}

// ============================================================================
// Cached API Functions
// ============================================================================

/**
 * Get WordPress categories with caching
 */
export async function getCachedWordPressCategories(
  config: WordPressConfig,
  parentId?: number
): Promise<{ data: WordPressCategory[] | null; error: Error | null }> {
  const cacheKey = getCacheKey('categories', parentId !== undefined ? { parentId } : {})
  const cached = getCached<WordPressCategory[]>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Categories cache hit (fresh)', { parentId })
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Categories cache hit (stale), revalidating', { parentId })
    
    // Fetch fresh data in background (don't await)
    getWordPressCategories(config, parentId)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Categories cache revalidated', { parentId })
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err, parentId })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Categories cache miss, fetching', { parentId })
  const result = await getWordPressCategories(config, parentId)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}

/**
 * Get WordPress posts with caching
 */
export async function getCachedWordPressPosts(
  config: WordPressConfig,
  options: {
    categories?: number[]
    tags?: number[]
    search?: string
    perPage?: number
    page?: number
  } = {}
): Promise<{ data: WordPressPost[] | null; error: Error | null }> {
  const cacheKey = getCacheKey('posts', options)
  const cached = getCached<WordPressPost[]>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Posts cache hit (fresh)', options)
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Posts cache hit (stale), revalidating', options)
    
    // Fetch fresh data in background (don't await)
    getWordPressPosts(config, options)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Posts cache revalidated', options)
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err, options })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Posts cache miss, fetching', options)
  const result = await getWordPressPosts(config, options)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}

/**
 * Get WordPress tags with caching
 */
export async function getCachedWordPressTags(
  config: WordPressConfig
): Promise<{ data: WordPressTag[] | null; error: Error | null }> {
  const cacheKey = getCacheKey('tags')
  const cached = getCached<WordPressTag[]>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Tags cache hit (fresh)')
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Tags cache hit (stale), revalidating')
    
    // Fetch fresh data in background (don't await)
    getWordPressTags(config)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Tags cache revalidated')
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Tags cache miss, fetching')
  const result = await getWordPressTags(config)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}

/**
 * Get WordPress pages with caching
 */
export async function getCachedWordPressPages(
  config: WordPressConfig
): Promise<{ data: WordPressPage[] | null; error: Error | null }> {
  const cacheKey = getCacheKey('pages')
  const cached = getCached<WordPressPage[]>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Pages cache hit (fresh)')
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Pages cache hit (stale), revalidating')
    
    // Fetch fresh data in background (don't await)
    getWordPressPages(config)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Pages cache revalidated')
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Pages cache miss, fetching')
  const result = await getWordPressPages(config)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}

/**
 * Get WordPress post by slug with caching
 */
export async function getCachedWordPressPostBySlug(
  config: WordPressConfig,
  slug: string
): Promise<{ data: WordPressPost | null; error: Error | null }> {
  const cacheKey = getCacheKey('post_slug', { slug })
  const cached = getCached<WordPressPost>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Post by slug cache hit (fresh)', { slug })
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Post by slug cache hit (stale), revalidating', { slug })
    
    // Fetch fresh data in background (don't await)
    getWordPressPostBySlug(config, slug)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Post by slug cache revalidated', { slug })
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err, slug })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Post by slug cache miss, fetching', { slug })
  const result = await getWordPressPostBySlug(config, slug)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}

/**
 * Get WordPress page by slug with caching
 */
export async function getCachedWordPressPageBySlug(
  config: WordPressConfig,
  slug: string
): Promise<{ data: WordPressPage | null; error: Error | null }> {
  const cacheKey = getCacheKey('page_slug', { slug })
  const cached = getCached<WordPressPage>(cacheKey)
  
  // If we have fresh cache, return immediately
  if (cached && isFresh(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Page by slug cache hit (fresh)', { slug })
    return { data: cached.data, error: null }
  }
  
  // If we have stale cache, return it immediately and fetch fresh in background
  if (cached && isStale(cached.expiresAt)) {
    debug.data('WordPressApiCacheService', 'Page by slug cache hit (stale), revalidating', { slug })
    
    // Fetch fresh data in background (don't await)
    getWordPressPageBySlug(config, slug)
      .then(result => {
        if (!result.error && result.data) {
          setCached(cacheKey, result.data)
          debug.data('WordPressApiCacheService', 'Page by slug cache revalidated', { slug })
        }
      })
      .catch(err => {
        debug.error('WordPressApiCacheService', 'Background revalidation failed', { error: err, slug })
      })
    
    // Return stale data immediately
    return { data: cached.data, error: null }
  }
  
  // No cache or too old, fetch fresh data
  debug.data('WordPressApiCacheService', 'Page by slug cache miss, fetching', { slug })
  const result = await getWordPressPageBySlug(config, slug)
  
  if (!result.error && result.data) {
    setCached(cacheKey, result.data)
  }
  
  return result
}
