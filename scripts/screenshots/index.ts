#!/usr/bin/env node
/**
 * Screenshot System CLI Entry Point
 * 
 * Usage:
 *   npm run screenshots
 *   npm run screenshots -- --roles org_admin,parent --viewports desktop,mobile --env demo
 */

// Load environment variables from .env file (or .env.screenshots)
import * as path from 'path'
import * as fs from 'fs'

// Load .env file manually (dotenv may not be available)
function loadEnvFile() {
  const envScreenshotsPath = path.join(process.cwd(), '.env.screenshots')
  const envPath = path.join(process.cwd(), '.env')
  const envFile = fs.existsSync(envScreenshotsPath) ? envScreenshotsPath : (fs.existsSync(envPath) ? envPath : null)
  
  if (!envFile) {
    return
  }
  
  try {
    // Try to use dotenv if available
    const dotenv = require('dotenv')
    dotenv.config({ path: envFile })
    return
  } catch {
    // dotenv not available, parse manually
  }
  
  // Manual parsing
  const content = fs.readFileSync(envFile, 'utf-8')
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

loadEnvFile()

import { chromium, Page } from '@playwright/test'
import { loadConfig } from './config'
import { runCapture } from './capture'
import { redactSecrets } from './utils'

// ============================================================================
// CLI argument parsing
// ============================================================================

function parseArgs(): Record<string, string | undefined> {
  const args: Record<string, string | undefined> = {}
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = argv[i + 1]?.startsWith('--') ? undefined : argv[i + 1]
      args[key] = value
      if (value) i++ // Skip next arg if it's a value
    }
  }

  return args
}

function applyArgsToEnv(args: Record<string, string | undefined>): void {
  if (args.roles) {
    process.env.YS_ROLES = args.roles
  }
  if (args.viewports) {
    process.env.YS_VIEWPORTS = args.viewports
  }
  if (args.env) {
    process.env.YS_ENV_LABEL = args.env
  }
  if (args.baseUrl) {
    process.env.YS_BASE_URL = args.baseUrl
  }
  if (args.outputDir) {
    process.env.YS_OUTPUT_DIR = args.outputDir
  }
  if (args.demoCode) {
    process.env.YS_DEMO_CODE = args.demoCode
  }
}

/**
 * Delete all cached storage state files to force fresh authentication.
 * Used when --fresh-auth flag is passed.
 */
function clearStorageState(): void {
  const storageStateDir = path.join(process.cwd(), 'playwright', '.auth')
  if (!fs.existsSync(storageStateDir)) {
    console.log('[Auth] No cached storage state to clear.')
    return
  }
  const deleted: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.json')) {
        fs.unlinkSync(full)
        deleted.push(full)
      }
    }
  }
  walk(storageStateDir)
  if (deleted.length > 0) {
    console.log(`[Auth] Cleared ${deleted.length} cached storage state file(s).`)
  } else {
    console.log('[Auth] No storage state files found to clear.')
  }
}

// ============================================================================
// Health check
// ============================================================================

async function healthCheck(baseUrl: string): Promise<boolean> {
  console.log(`[Health] Checking ${baseUrl}...`)

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const status = response?.status() || 0

    await context.close()

    if (status >= 200 && status < 500) {
      console.log(`[Health] ✓ Site is reachable (${status})`)
      return true
    } else {
      console.error(`[Health] ✗ Site returned status ${status}`)
      return false
    }
  } catch (error) {
    console.error(`[Health] ✗ Failed to reach site:`, error instanceof Error ? error.message : error)
    return false
  } finally {
    await browser.close()
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('=== Playwright Screenshot System ===\n')

  // Parse CLI arguments
  const args = parseArgs()
  applyArgsToEnv(args)

  // Note: Storage state is always cleared at the start of capture
  // The --fresh-auth flag is no longer needed but kept for backward compatibility
  if ('fresh-auth' in args || 'freshAuth' in args) {
    console.log('[Info] --fresh-auth flag is no longer needed (always starting fresh)')
  }

  // Load configuration
  let config
  try {
    config = loadConfig()
    console.log('[Config] Configuration loaded:')
    console.log(`  Base URL: ${config.baseUrl}`)
    console.log(`  Environment: ${config.environment}`)
    console.log(`  Output Dir: ${config.outputDir}`)
    console.log(`  Roles: ${config.roles.join(', ')}`)
    console.log(`  Viewports: ${config.viewports.join(', ')}`)
    console.log(`  Auth Strategy: ${config.authStrategy}`)
    console.log(`  Wait Strategy: ${config.waitStrategy}`)
    console.log('')
  } catch (error) {
    console.error('[Config] Failed to load configuration:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  // Health check
  const healthy = await healthCheck(config.baseUrl)
  if (!healthy) {
    console.error('[Health] Health check failed. Exiting.')
    process.exit(1)
  }

  // Run capture
  try {
    const manifest = await runCapture(config)
    
    console.log('\n=== Capture Complete ===')
    console.log(`Total: ${manifest.totalScreenshots}`)
    console.log(`Successful: ${manifest.successful}`)
    console.log(`Failed: ${manifest.failed}`)
    
    if (manifest.failed > 0) {
      console.log('\nFailed routes:')
      manifest.entries
        .filter((e) => !e.success)
        .forEach((e) => {
          console.log(`  - ${e.role}/${e.viewport}: ${e.routeKey} - ${e.error}`)
        })
    }

    process.exit(manifest.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('[Capture] Fatal error:', error instanceof Error ? error.message : error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run if called directly (check if this is the entry point)
// In Node.js with tsx/ts-node, process.argv[1] will be the script path
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('screenshots/index') ||
                     process.argv[1]?.endsWith('screenshots/index.ts') ||
                     !process.env.NODE_ENV // If no NODE_ENV, likely direct execution

if (isMainModule) {
  main().catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export { main }
