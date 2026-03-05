/**
 * WordPress API Service
 *
 * Routes all WordPress API interactions through the Supabase API Manager gateway.
 */

import { invokeApiOperation } from '../../services/apiManagerService'
import { debug } from '../../lib/debug'

export interface WordPressConfig {
  apiUrl: string
  authMethod: 'application_password' | 'oauth_token' | 'public'
  credentials?: string
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  parent: number
  count: number
  description?: {
    rendered: string
  }
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
  z_taxonomy_image_url?: string | null
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
  featured_media?: number
  featured_media_url?: string
  jetpack_featured_media_url?: string
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>
  }
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

let currentConfig: WordPressConfig | null = null

interface GatewayEnvelope {
  providerResponse?: unknown
}

function toError(message: string): ServiceResponse<never> {
  return {
    data: null,
    error: new Error(message),
  }
}

function resolveConfig(config?: WordPressConfig): WordPressConfig | null {
  if (config) {
    return config
  }
  return currentConfig
}

async function callWordPressGateway<T>(
  operation: string,
  config: WordPressConfig,
  input: Record<string, unknown> = {},
): Promise<ServiceResponse<T>> {
  const response = await invokeApiOperation<GatewayEnvelope>({
    operation,
    input: {
      ...input,
      config,
    },
  })

  if (!response.ok) {
    return toError(response.error.message)
  }

  const providerResponse = response.data?.providerResponse
  return {
    data: (providerResponse as T) ?? null,
    error: null,
  }
}

export function initializeWordPressApi(config: WordPressConfig): void {
  currentConfig = config
}

export async function testWordPressConnection(
  config: WordPressConfig,
): Promise<ServiceResponse<{ success: boolean }>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  const result = await callWordPressGateway<unknown>('content.wordpress.testConnection', activeConfig)
  if (result.error) {
    return { data: null, error: result.error }
  }

  return {
    data: { success: true },
    error: null,
  }
}

export async function getWordPressCategories(
  config: WordPressConfig,
  parentId?: number,
): Promise<ServiceResponse<WordPressCategory[]>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  const canUseEditContext = activeConfig.authMethod !== 'public' && Boolean(activeConfig.credentials)

  const firstAttempt = await callWordPressGateway<WordPressCategory[]>(
    'content.wordpress.getCategories',
    activeConfig,
    {
      ...(typeof parentId === 'number' ? { parentId } : {}),
      includeEditContext: canUseEditContext,
    },
  )

  if (!firstAttempt.error || !canUseEditContext) {
    return firstAttempt
  }

  debug.data('WordPressApiService', 'Retrying categories without edit context', {
    parentId,
    error: firstAttempt.error.message,
  })

  return callWordPressGateway<WordPressCategory[]>(
    'content.wordpress.getCategories',
    activeConfig,
    {
      ...(typeof parentId === 'number' ? { parentId } : {}),
      includeEditContext: false,
    },
  )
}

export async function getWordPressTags(
  config: WordPressConfig,
): Promise<ServiceResponse<WordPressTag[]>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  return callWordPressGateway<WordPressTag[]>('content.wordpress.getTags', activeConfig)
}

export async function getWordPressPosts(
  config: WordPressConfig,
  options: {
    categories?: number[]
    tags?: number[]
    search?: string
    perPage?: number
    page?: number
  } = {},
): Promise<ServiceResponse<WordPressPost[]>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  return callWordPressGateway<WordPressPost[]>('content.wordpress.getPosts', activeConfig, {
    options,
  })
}

export async function getWordPressPostBySlug(
  config: WordPressConfig,
  slug: string,
): Promise<ServiceResponse<WordPressPost>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  const result = await callWordPressGateway<WordPressPost[]>('content.wordpress.getPostBySlug', activeConfig, {
    slug,
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  if (!result.data || result.data.length === 0) {
    return toError(`Post with slug "${slug}" not found`)
  }

  return {
    data: result.data[0],
    error: null,
  }
}

export async function getWordPressPages(
  config: WordPressConfig,
): Promise<ServiceResponse<WordPressPage[]>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  return callWordPressGateway<WordPressPage[]>('content.wordpress.getPages', activeConfig)
}

export async function getWordPressPageBySlug(
  config: WordPressConfig,
  slug: string,
): Promise<ServiceResponse<WordPressPage>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  const result = await callWordPressGateway<WordPressPage[]>('content.wordpress.getPageBySlug', activeConfig, {
    slug,
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  if (!result.data || result.data.length === 0) {
    return toError(`Page with slug "${slug}" not found`)
  }

  return {
    data: result.data[0],
    error: null,
  }
}

export async function getWordPressFeaturedImageUrl(
  config: WordPressConfig,
  mediaId: number,
): Promise<ServiceResponse<string>> {
  const activeConfig = resolveConfig(config)
  if (!activeConfig) {
    return toError('WordPress configuration not set')
  }

  const result = await callWordPressGateway<{ source_url?: string }>(
    'content.wordpress.getFeaturedImageUrl',
    activeConfig,
    { mediaId },
  )

  if (result.error || !result.data || !result.data.source_url) {
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
