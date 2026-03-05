import type { OperationDefinition } from "./registry.ts"
import { requestWordPress, type WordPressAuthMethod } from "../providers/wordpress.ts"

interface WordPressConfigInput {
  apiUrl: string
  authMethod: WordPressAuthMethod
  credentials?: string
}

interface WordPressPostsFilterInput {
  categories?: number[]
  tags?: number[]
  search?: string
  perPage?: number
  page?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item))
}

function parseConfig(value: unknown): WordPressConfigInput | null {
  if (!isRecord(value)) {
    return null
  }

  const authMethod = value.authMethod
  const validAuthMethod =
    authMethod === "application_password" || authMethod === "oauth_token" || authMethod === "public"

  if (!validAuthMethod || !isNonEmptyString(value.apiUrl)) {
    return null
  }

  const parsed: WordPressConfigInput = {
    apiUrl: value.apiUrl.trim(),
    authMethod,
    credentials: isNonEmptyString(value.credentials) ? value.credentials : undefined,
  }

  return parsed
}

function buildPostsEndpoint(options: WordPressPostsFilterInput): string {
  const params = new URLSearchParams()

  if (options.categories && options.categories.length > 0) {
    for (const categoryId of options.categories) {
      params.append("categories[]", String(categoryId))
    }
  }

  if (options.tags && options.tags.length > 0) {
    for (const tagId of options.tags) {
      params.append("tags[]", String(tagId))
    }
  }

  if (isNonEmptyString(options.search)) {
    params.append("search", options.search)
  }

  params.append("per_page", String(options.perPage ?? 100))
  params.append("page", String(options.page ?? 1))
  params.append("status", "publish")
  params.append("_embed", "1")

  return `/posts?${params.toString()}`
}

function wordpressOperation(args: {
  key: string
  validateInput: (input: unknown) =>
    | { ok: true; data: { config: WordPressConfigInput; endpoint: string } }
    | { ok: false; message: string }
}): OperationDefinition {
  return {
    key: args.key,
    provider: "wordpress",
    piiPolicy: "allow",
    limits: {
      timeoutMs: 20000,
      retries: 1,
    },
    idempotent: false,
    authz: {
      requireAuth: false,
      orgScoped: false,
      allowedRoles: ["public", "org_admin", "coach", "staff", "guardian", "athlete", "fan", "platform_admin"],
      requiredStaffFlags: [],
      allowPlatformAdmin: true,
    },
    validateInput: args.validateInput,
    async handler(input, context) {
      const parsed = input as { config: WordPressConfigInput; endpoint: string }
      const providerResponse = await requestWordPress({
        apiUrl: parsed.config.apiUrl,
        authMethod: parsed.config.authMethod,
        credentials: parsed.config.credentials,
        endpoint: parsed.endpoint,
        context: {
          traceId: context.traceId,
          timeoutMs: context.definition.limits.timeoutMs,
          retries: context.definition.limits.retries,
        },
      })

      return {
        providerResponse,
      }
    },
  }
}

const wordpressTestConnection = wordpressOperation({
  key: "content.wordpress.testConnection",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    return { ok: true, data: { config, endpoint: "/" } } as const
  },
})

const wordpressGetCategories = wordpressOperation({
  key: "content.wordpress.getCategories",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    const params = new URLSearchParams()
    if (typeof input.parentId === "number" && Number.isFinite(input.parentId)) {
      params.append("parent", String(input.parentId))
    }
    params.append("per_page", "100")

    if (input.includeEditContext === true) {
      params.append("context", "edit")
    }

    return {
      ok: true,
      data: { config, endpoint: `/categories?${params.toString()}` },
    } as const
  },
})

const wordpressGetTags = wordpressOperation({
  key: "content.wordpress.getTags",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    return { ok: true, data: { config, endpoint: "/tags?per_page=100" } } as const
  },
})

const wordpressGetPosts = wordpressOperation({
  key: "content.wordpress.getPosts",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    const optionsRaw = isRecord(input.options) ? input.options : {}
    const options: WordPressPostsFilterInput = {
      categories: isNumberArray(optionsRaw.categories) ? optionsRaw.categories : undefined,
      tags: isNumberArray(optionsRaw.tags) ? optionsRaw.tags : undefined,
      search: isNonEmptyString(optionsRaw.search) ? optionsRaw.search.trim() : undefined,
      perPage: typeof optionsRaw.perPage === "number" && Number.isFinite(optionsRaw.perPage)
        ? Math.floor(optionsRaw.perPage)
        : undefined,
      page: typeof optionsRaw.page === "number" && Number.isFinite(optionsRaw.page)
        ? Math.floor(optionsRaw.page)
        : undefined,
    }

    return {
      ok: true,
      data: {
        config,
        endpoint: buildPostsEndpoint(options),
      },
    } as const
  },
})

const wordpressGetPostBySlug = wordpressOperation({
  key: "content.wordpress.getPostBySlug",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    if (!isNonEmptyString(input.slug)) {
      return { ok: false, message: "slug is required." } as const
    }

    const params = new URLSearchParams()
    params.append("slug", input.slug.trim())
    params.append("status", "publish")

    return { ok: true, data: { config, endpoint: `/posts?${params.toString()}` } } as const
  },
})

const wordpressGetPages = wordpressOperation({
  key: "content.wordpress.getPages",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    return { ok: true, data: { config, endpoint: "/pages?per_page=100&status=publish" } } as const
  },
})

const wordpressGetPageBySlug = wordpressOperation({
  key: "content.wordpress.getPageBySlug",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    if (!isNonEmptyString(input.slug)) {
      return { ok: false, message: "slug is required." } as const
    }

    const params = new URLSearchParams()
    params.append("slug", input.slug.trim())
    params.append("status", "publish")

    return { ok: true, data: { config, endpoint: `/pages?${params.toString()}` } } as const
  },
})

const wordpressGetFeaturedImageUrl = wordpressOperation({
  key: "content.wordpress.getFeaturedImageUrl",
  validateInput(input: unknown) {
    if (!isRecord(input)) {
      return { ok: false, message: "Input must be an object." } as const
    }

    const config = parseConfig(input.config)
    if (!config) {
      return { ok: false, message: "config with apiUrl/authMethod is required." } as const
    }

    if (typeof input.mediaId !== "number" || !Number.isFinite(input.mediaId)) {
      return { ok: false, message: "mediaId is required." } as const
    }

    return { ok: true, data: { config, endpoint: `/media/${Math.floor(input.mediaId)}` } } as const
  },
})

export const wordpressOperations: OperationDefinition[] = [
  wordpressTestConnection,
  wordpressGetCategories,
  wordpressGetTags,
  wordpressGetPosts,
  wordpressGetPostBySlug,
  wordpressGetPages,
  wordpressGetPageBySlug,
  wordpressGetFeaturedImageUrl,
]
