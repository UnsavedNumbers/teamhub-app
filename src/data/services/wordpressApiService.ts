/**
 * WordPress REST API Service
 * 
 * Handles all WordPress REST API interactions with authentication,
 * rate limiting, and error handling.
 */

import { debug } from '../../lib/debug'

// ============================================================================
// Types
// ============================================================================

export interface WordPressConfig {
  apiUrl: string
  authMethod: 'application_password' | 'oauth_token' | 'public'
  credentials?: string // Encrypted credentials
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  parent: number
  count: number
  image?: {
    id: number
    url: string
    src: string
  } | null
  acf?: {
    image?: {
      id: number
      url: string
      src: string
    } | null
  }
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
  count: number
}

export interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  slug: string
  date: string
  modified: string
  categories: number[]
  tags: number[]
  status: string
  link: string
}

export interface WordPressPage {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  slug: string
  featured_media: number
  featured_media_url?: string
  date: string
  modified: string
  status: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Rate Limiting
// ============================================================================

class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number = 100
  private readonly windowMs: number = 60000 // 1 minute

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    
    // Remove requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 100 // Add 100ms buffer
      if (waitTime > 0) {
        debug.data('WordPressApiService', 'Rate limit reached, waiting', { waitTime })
        await new Promise(resolve => setTimeout(resolve, waitTime))
        // Clean up again after waiting
        this.requests = this.requests.filter(time => Date.now() - time < this.windowMs)
      }
    }
    
    // Record this request
    this.requests.push(Date.now())
  }
}

const rateLimiter = new RateLimiter()

// ============================================================================
// WordPress API Client
// ============================================================================

class WordPressApiClient {
  private config: WordPressConfig | null = null

  setConfig(config: WordPressConfig): void {
    this.config = config
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.config) {
      return {}
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.config.authMethod === 'application_password' && this.config.credentials) {
      // Application password format: username:password
      const credentials = Buffer.from(this.config.credentials).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    } else if (this.config.authMethod === 'oauth_token' && this.config.credentials) {
      headers['Authorization'] = `Bearer ${this.config.credentials}`
    }

    return headers
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    if (!this.config) {
      return {
        data: null,
        error: new Error('WordPress configuration not set'),
      }
    }

    // Rate limiting
    await rateLimiter.waitIfNeeded()

    const url = `${this.config.apiUrl.replace(/\/$/, '')}${endpoint}`
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    }

    debug.perf.start(`wordpressApi.${endpoint}`)
    debug.data('WordPressApiService', `Request: ${options.method || 'GET'} ${url}`)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      debug.perf.end(`wordpressApi.${endpoint}`)

      // Handle errors
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          } else if (errorJson.code) {
            errorMessage = `${errorJson.code}: ${errorJson.message || errorText}`
          }
        } catch {
          // Use default error message
        }

        // Specific error handling
        if (response.status === 401) {
          return {
            data: null,
            error: new Error('Authentication failed. Please check your credentials.'),
          }
        }

        if (response.status === 404) {
          return {
            data: null,
            error: new Error('Resource not found'),
          }
        }

        if (response.status === 429) {
          return {
            data: null,
            error: new Error('Rate limit exceeded. Please try again later.'),
          }
        }

        return {
          data: null,
          error: new Error(errorMessage),
        }
      }

      // Parse response
      const text = await response.text()
      if (!text || text.trim() === '') {
        return { data: null, error: null }
      }

      const data = JSON.parse(text) as T
      debug.data('WordPressApiService', `Response: ${endpoint}`, { success: true })
      
      return { data, error: null }
    } catch (err) {
      debug.perf.end(`wordpressApi.${endpoint}`)
      debug.error('WordPressApiService', `Request failed: ${endpoint}`, { error: err })
      
      const error = err instanceof Error ? err : new Error(String(err))
      
      // Network error handling
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          data: null,
          error: new Error('Network error. Please check your connection and WordPress API URL.'),
        }
      }

      return {
        data: null,
        error,
      }
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Test WordPress API connection
   */
  async testConnection(): Promise<ServiceResponse<{ success: boolean }>> {
    const result = await this.makeRequest<{ name: string }>('/')
    if (result.error) {
      return { data: null, error: result.error }
    }
    return { data: { success: true }, error: null }
  }

  /**
   * Get categories
   * WordPress categories may include image data via plugins (Category Images) or ACF fields
   */
  async getCategories(parentId?: number): Promise<ServiceResponse<WordPressCategory[]>> {
    const params = new URLSearchParams()
    if (parentId !== undefined) {
      params.append('parent', parentId.toString())
    }
    params.append('per_page', '100')
    // Note: WordPress REST API v2 doesn't include category images by default
    // Images may be added via plugins (Category Images) or ACF, which will be in the response
    
    const endpoint = `/categories${params.toString() ? `?${params.toString()}` : ''}`
    return this.makeRequest<WordPressCategory[]>(endpoint)
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<ServiceResponse<WordPressCategory>> {
    return this.makeRequest<WordPressCategory>(`/categories/${id}`)
  }

  /**
   * Get tags
   */
  async getTags(): Promise<ServiceResponse<WordPressTag[]>> {
    return this.makeRequest<WordPressTag[]>(`/tags?per_page=100`)
  }

  /**
   * Get posts with filters
   */
  async getPosts(options: {
    categories?: number[]
    tags?: number[]
    search?: string
    perPage?: number
    page?: number
  } = {}): Promise<ServiceResponse<WordPressPost[]>> {
    const params = new URLSearchParams()
    
    if (options.categories && options.categories.length > 0) {
      options.categories.forEach(catId => params.append('categories[]', catId.toString()))
    }
    
    if (options.tags && options.tags.length > 0) {
      options.tags.forEach(tagId => params.append('tags[]', tagId.toString()))
    }
    
    if (options.search) {
      params.append('search', options.search)
    }
    
    params.append('per_page', (options.perPage || 100).toString())
    params.append('page', (options.page || 1).toString())
    params.append('status', 'publish') // Only published posts
    
    return this.makeRequest<WordPressPost[]>(`/posts?${params.toString()}`)
  }

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug: string): Promise<ServiceResponse<WordPressPost>> {
    const params = new URLSearchParams()
    params.append('slug', slug)
    params.append('status', 'publish')
    
    const result = await this.makeRequest<WordPressPost[]>(`/posts?${params.toString()}`)
    
    if (result.error) {
      return { data: null, error: result.error }
    }
    
    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: new Error(`Post with slug "${slug}" not found`),
      }
    }
    
    return {
      data: result.data[0],
      error: null,
    }
  }

  /**
   * Get pages
   */
  async getPages(): Promise<ServiceResponse<WordPressPage[]>> {
    return this.makeRequest<WordPressPage[]>(`/pages?per_page=100&status=publish`)
  }

  /**
   * Get a single page by slug
   */
  async getPageBySlug(slug: string): Promise<ServiceResponse<WordPressPage>> {
    const params = new URLSearchParams()
    params.append('slug', slug)
    params.append('status', 'publish')
    
    const result = await this.makeRequest<WordPressPage[]>(`/pages?${params.toString()}`)
    
    if (result.error) {
      return { data: null, error: result.error }
    }
    
    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: new Error(`Page with slug "${slug}" not found`),
      }
    }
    
    return {
      data: result.data[0],
      error: null,
    }
  }

  /**
   * Get featured image URL for a media ID
   */
  async getFeaturedImageUrl(mediaId: number): Promise<ServiceResponse<string>> {
    const result = await this.makeRequest<{ source_url: string }>(`/media/${mediaId}`)
    
    if (result.error || !result.data) {
      return {
        data: null,
        error: result.error || new Error('Featured image not found'),
      }
    }
    
    return {
      data: result.data.source_url,
      error: null,
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const wordPressApiClient = new WordPressApiClient()

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Initialize WordPress API client with configuration
 */
export function initializeWordPressApi(config: WordPressConfig): void {
  wordPressApiClient.setConfig(config)
}

/**
 * Test WordPress API connection
 */
export async function testWordPressConnection(
  config: WordPressConfig
): Promise<ServiceResponse<{ success: boolean }>> {
  initializeWordPressApi(config)
  return wordPressApiClient.testConnection()
}

/**
 * Get WordPress categories
 */
export async function getWordPressCategories(
  config: WordPressConfig,
  parentId?: number
): Promise<ServiceResponse<WordPressCategory[]>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getCategories(parentId)
}

/**
 * Get WordPress tags
 */
export async function getWordPressTags(
  config: WordPressConfig
): Promise<ServiceResponse<WordPressTag[]>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getTags()
}

/**
 * Get WordPress posts
 */
export async function getWordPressPosts(
  config: WordPressConfig,
  options: {
    categories?: number[]
    tags?: number[]
    search?: string
    perPage?: number
    page?: number
  } = {}
): Promise<ServiceResponse<WordPressPost[]>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getPosts(options)
}

/**
 * Get WordPress post by slug
 */
export async function getWordPressPostBySlug(
  config: WordPressConfig,
  slug: string
): Promise<ServiceResponse<WordPressPost>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getPostBySlug(slug)
}

/**
 * Get WordPress pages
 */
export async function getWordPressPages(
  config: WordPressConfig
): Promise<ServiceResponse<WordPressPage[]>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getPages()
}

/**
 * Get WordPress page by slug
 */
export async function getWordPressPageBySlug(
  config: WordPressConfig,
  slug: string
): Promise<ServiceResponse<WordPressPage>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getPageBySlug(slug)
}

/**
 * Get featured image URL
 */
export async function getWordPressFeaturedImageUrl(
  config: WordPressConfig,
  mediaId: number
): Promise<ServiceResponse<string>> {
  initializeWordPressApi(config)
  return wordPressApiClient.getFeaturedImageUrl(mediaId)
}
