/**
 * Screenshot System Configuration
 * 
 * Loads and validates configuration from environment variables.
 * Supports optional Zod validation for type safety.
 */

import { z } from 'zod'
import * as path from 'path'
import * as fs from 'fs'

// ============================================================================
// Types
// ============================================================================

export type Viewport = 'desktop' | 'tablet' | 'mobile'
export type Role = 'org_admin' | 'coach' | 'parent' | 'athlete' | 'staff' | 'fan'
export type AuthStrategy = 'demo_code' | 'storage_state'

export interface ScreenshotConfig {
  baseUrl: string
  environment: string
  outputDir: string
  roles: Role[]
  viewports: Viewport[]
  authStrategy: AuthStrategy
  demoCode?: string
  storageStateDir?: string
  routeLists?: Record<Role, string[]>
  waitStrategy?: 'selector' | 'networkidle'
  maskingRules?: Array<{ selector: string; type: 'hide' | 'mask' }> // For UI consistency (hiding spinners, etc.), not PII
}

// ============================================================================
// Viewport definitions
// ============================================================================

export const VIEWPORT_SIZES: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
}

// ============================================================================
// Zod schema (optional validation)
// ============================================================================

const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  environment: z.string().min(1),
  outputDir: z.string().min(1),
  roles: z.array(z.enum(['org_admin', 'coach', 'parent', 'athlete', 'staff', 'fan'])).min(1),
  viewports: z.array(z.enum(['desktop', 'tablet', 'mobile'])).min(1),
  authStrategy: z.enum(['demo_code', 'storage_state']),
  demoCode: z.string().optional(),
  storageStateDir: z.string().optional(),
  waitStrategy: z.enum(['selector', 'networkidle']).optional().default('selector'),
})

// ============================================================================
// Configuration loader
// ============================================================================

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ScreenshotConfig {
  const baseUrl = process.env.YS_BASE_URL
  const environment = process.env.YS_ENV_LABEL || 'demo'
  const outputDir = process.env.YS_OUTPUT_DIR || 'artifacts/screenshots'
  const rolesStr = process.env.YS_ROLES || 'org_admin,guardian'
  const viewportsStr = process.env.YS_VIEWPORTS || 'desktop,mobile'
  const authStrategy = (process.env.YS_AUTH_STRATEGY || 'demo_code') as AuthStrategy
  const demoCode = process.env.YS_DEMO_CODE
  const storageStateDir = process.env.YS_STORAGE_STATE_DIR
  const waitStrategy = (process.env.YS_WAIT_STRATEGY || 'selector') as 'selector' | 'networkidle'

  // Validate required fields
  if (!baseUrl) {
    throw new Error('YS_BASE_URL is required')
  }

  // Parse roles (map 'guardian' to 'parent' for consistency)
  const roles: Role[] = rolesStr
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => (r === 'guardian' ? 'parent' : r as Role))

  if (roles.length === 0) {
    throw new Error('At least one role must be specified in YS_ROLES')
  }

  // Parse viewports
  const viewports: Viewport[] = viewportsStr
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean) as Viewport[]

  if (viewports.length === 0) {
    throw new Error('At least one viewport must be specified in YS_VIEWPORTS')
  }

  // Validate auth strategy requirements
  if (authStrategy === 'demo_code' && !demoCode) {
    throw new Error('YS_DEMO_CODE is required when using demo_code auth strategy')
  }

  if (authStrategy === 'storage_state' && !storageStateDir) {
    throw new Error('YS_STORAGE_STATE_DIR is required when using storage_state auth strategy')
  }

  const config: ScreenshotConfig = {
    baseUrl,
    environment,
    outputDir: path.resolve(outputDir),
    roles,
    viewports,
    authStrategy,
    waitStrategy,
  }

  if (demoCode) {
    config.demoCode = demoCode
  }

  if (storageStateDir) {
    config.storageStateDir = path.resolve(storageStateDir)
  }

  // Optional Zod validation (in development)
  if (process.env.NODE_ENV === 'development') {
    try {
      ConfigSchema.parse(config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Configuration validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
      }
      throw error
    }
  }

  return config
}

/**
 * Get storage state path for a role
 */
export function getStorageStatePath(config: ScreenshotConfig, role: Role): string {
  const dir = config.storageStateDir || path.join(process.cwd(), 'playwright', '.auth')
  return path.join(dir, config.environment, `${role}.json`)
}
