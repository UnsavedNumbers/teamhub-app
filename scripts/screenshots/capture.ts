/**
 * Screenshot capture logic
 * 
 * Handles the main loop: roles → viewports → routes
 * Normalizes UI, takes screenshots, and builds manifest
 */

import { Browser, BrowserContext, Page, chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import type { ScreenshotConfig, Viewport, Role } from './config'
import { VIEWPORT_SIZES, getStorageStatePath } from './config'
import { ensureStorageState } from './auth'
import { getRoutesForRole, resolveDynamicSegment, getRouteUrl, type RouteTask } from './routes'
import { ensureDir, sanitizeFilename, slugifyRoute, getDateString, formatDuration } from './utils'

// ============================================================================
// Manifest types
// ============================================================================

export interface ScreenshotManifestEntry {
  timestamp: string
  environment: string
  role: Role
  route: string
  routeKey: string
  viewport: Viewport
  fullPage: boolean
  authMethod: string
  success: boolean
  error?: string
  duration: number
  filename: string
}

export interface ScreenshotManifest {
  generatedAt: string
  environment: string
  totalScreenshots: number
  successful: number
  failed: number
  entries: ScreenshotManifestEntry[]
}

// ============================================================================
// UI normalization
// ============================================================================

/**
 * Normalize UI before screenshot: disable animations, hide dynamic elements, mask PII
 */
async function normalizeUI(page: Page, config: ScreenshotConfig): Promise<void> {
  // Inject CSS to disable animations and transitions
  await page.addStyleTag({
    content: `
      * {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
      [data-testid*="spinner"],
      [data-testid*="loading"],
      .loading,
      .spinner {
        display: none !important;
      }
    `,
  })

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready)

  // Hide dynamic elements if masking rules provided (for UI consistency, not PII)
  if (config.maskingRules) {
    for (const rule of config.maskingRules) {
      if (rule.type === 'hide') {
        await page.locator(rule.selector).evaluateAll((els) => {
          els.forEach((el) => {
            ;(el as HTMLElement).style.display = 'none'
          })
        })
      } else if (rule.type === 'mask') {
        await page.locator(rule.selector).evaluateAll((els) => {
          els.forEach((el) => {
            ;(el as HTMLElement).style.backgroundColor = '#000'
            ;(el as HTMLElement).style.color = '#000'
          })
        })
      }
    }
  }
}

/**
 * Wait for page to be ready
 */
async function waitForPageReady(page: Page, config: ScreenshotConfig): Promise<void> {
  if (config.waitStrategy === 'networkidle') {
    await page.waitForLoadState('networkidle')
  } else {
    // Selector-based wait: try common selectors
    const selectors = [
      '[data-testid="page-title"]',
      'h1',
      'h2',
      '.oa-main',
      'main',
      '[data-testid="dashboard"]',
    ]

    let found = false
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
        found = true
        break
      } catch {
        // Try next selector
      }
    }

    if (!found) {
      // Fallback: wait for load state
      await page.waitForLoadState('domcontentloaded')
    }
  }

  // Always wait for fonts
  await page.evaluate(() => document.fonts.ready)
}

// ============================================================================
// Screenshot capture
// ============================================================================

/**
 * Capture screenshot for a single route
 */
async function captureRoute(
  page: Page,
  context: BrowserContext,
  config: ScreenshotConfig,
  role: Role,
  viewport: Viewport,
  task: RouteTask,
  outputDir: string,
  index: number
): Promise<ScreenshotManifestEntry> {
  const startTime = Date.now()
  const routeKey = task.routeKey
  let success = false
  let error: string | undefined
  let filename = ''
  let finalUrl = ''

  try {
    // Resolve dynamic segments if needed
    let params: Record<string, string> | null = null
    if (task.requiresIdResolution) {
      params = await resolveDynamicSegment(page, task, config.baseUrl)
      if (!params || Object.keys(params).length === 0) {
        throw new Error(`Could not resolve ID for route ${routeKey}. List may be empty or selector not found.`)
      }
    }
    
    // Merge any pre-defined params with resolved params
    if (task.params) {
      params = { ...task.params, ...params }
    }

    // Navigate to route with retry logic
    finalUrl = getRouteUrl(task, config.baseUrl, params || undefined)
    console.log(`[Capture] ${role}/${viewport}: ${routeKey} -> ${finalUrl}`)

    let navigationSuccess = false
    let retries = 2
    
    while (!navigationSuccess && retries > 0) {
      try {
        const response = await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        
        // Check for error status codes
        if (response && response.status() >= 400) {
          throw new Error(`HTTP ${response.status()}: ${response.statusText()}`)
        }
        
        // Check if we were redirected to login/demo (auth expired)
        const currentUrl = page.url()
        if (currentUrl.includes('/demo') || currentUrl.includes('/login') || currentUrl.includes('/portal/auth')) {
          throw new Error(`Authentication expired - redirected to ${currentUrl}. Storage state may need to be refreshed.`)
        }
        
        navigationSuccess = true
      } catch (err) {
        retries--
        if (retries === 0) {
          throw err
        }
        console.warn(`[Capture] Navigation failed, retrying... (${retries} attempts left)`)
        await page.waitForTimeout(1000)
      }
    }
    
    await waitForPageReady(page, config)
    await normalizeUI(page, config)

    // Determine if fullPage or viewport screenshot
    const fullPage = !routeKey.includes('modal') && !routeKey.includes('dialog')

    // Generate filename
    const routeSlug = slugifyRoute(routeKey)
    const indexStr = String(index + 1).padStart(3, '0')
    filename = `${indexStr}_${routeSlug}__${viewport}.png`
    const filePath = path.join(outputDir, filename)

    // Take screenshot
    await page.screenshot({
      path: filePath,
      fullPage,
    })

    success = true
    console.log(`[Capture] ✓ ${filename}`)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error(`[Capture] ✗ ${routeKey}: ${error}`)

    // Save error screenshot
    try {
      const routeSlug = slugifyRoute(routeKey)
      filename = `ERROR_${routeSlug}__${viewport}.png`
      const filePath = path.join(outputDir, filename)
      await page.screenshot({ path: filePath, fullPage: true })
    } catch {
      // Ignore error screenshot failures
    }
  }

  const duration = Date.now() - startTime

  return {
    timestamp: new Date().toISOString(),
    environment: config.environment,
    role,
    route: finalUrl || task.routeKey,
    routeKey,
    viewport,
    fullPage: !routeKey.includes('modal') && !routeKey.includes('dialog'),
    authMethod: config.authStrategy,
    success,
    error,
    duration,
    filename,
  }
}

// ============================================================================
// Main capture function
// ============================================================================

/**
 * Run screenshot capture for all roles, viewports, and routes
 */
export async function runCapture(config: ScreenshotConfig): Promise<ScreenshotManifest> {
  const manifest: ScreenshotManifest = {
    generatedAt: new Date().toISOString(),
    environment: config.environment,
    totalScreenshots: 0,
    successful: 0,
    failed: 0,
    entries: [],
  }

  const dateStr = getDateString()
  const baseOutputDir = path.join(config.outputDir, dateStr, config.environment)

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({ headless: true })

    // Process each role sequentially
    for (const role of config.roles) {
      console.log(`\n[Capture] Processing role: ${role}`)
      const roleOutputDir = path.join(baseOutputDir, role)
      ensureDir(roleOutputDir)

      // Ensure storage state for this role (create if needed)
      let storageState: object | undefined
      const storageStatePath = getStorageStatePath(config, role)

      // Always check if storage state exists and is valid
      if (fs.existsSync(storageStatePath)) {
        const { loadStorageState } = await import('./auth')
        const loadedState = loadStorageState(config, role)
        if (loadedState) {
          // Verify storage state is still valid by testing it
          const testContext = await browser.newContext({
            viewport: VIEWPORT_SIZES.desktop,
            timezoneId: 'America/New_York',
            locale: 'en-US',
            colorScheme: 'light',
            reducedMotion: 'reduce',
            storageState: loadedState, // Use the loaded storage state
          })
          
          const testPage = await testContext.newPage()
          // Navigate to a protected route to verify auth (use role-specific route)
          let testRoute: string
          if (role === 'org_admin') {
            testRoute = '/admin/dashboard'
          } else if (role === 'coach') {
            testRoute = '/coach/dashboard'
          } else if (role === 'guardian') {
            testRoute = '/parent/home'
          } else if (role === 'athlete') {
            testRoute = '/athlete/home'
          } else if (role === 'staff') {
            testRoute = '/staff/dashboard'
          } else {
            testRoute = '/fan/events'
          }
          
          try {
            await testPage.goto(`${config.baseUrl}${testRoute}`, { waitUntil: 'domcontentloaded', timeout: 10000 })
            
            // Check if we're redirected to login/demo (auth expired)
            const testUrl = testPage.url()
            if (testUrl.includes('/demo') || testUrl.includes('/login') || testUrl.includes('/portal/auth')) {
              console.warn(`[Capture] Storage state for ${role} appears expired, re-authenticating...`)
              await testContext.close()
              storageState = undefined // Force re-authentication
            } else {
              // Auth is valid
              console.log(`[Capture] Using existing storage state for ${role}`)
              storageState = loadedState
              await testContext.close()
            }
          } catch (err) {
            console.warn(`[Capture] Error verifying storage state for ${role}, will re-authenticate:`, err)
            await testContext.close()
            storageState = undefined
          }
        } else {
          console.warn(`[Capture] Storage state file exists but is invalid, will re-authenticate`)
          storageState = undefined
        }
      }
      
      if (!storageState) {
        // Create new storage state via login
        const authContext = await browser.newContext({
          viewport: VIEWPORT_SIZES.desktop, // Temporary context for auth
          timezoneId: 'America/New_York',
          locale: 'en-US',
          colorScheme: 'light',
          reducedMotion: 'reduce',
        })

        const page = await authContext.newPage()
        await ensureStorageState(page, authContext, config, role)

        // Verify authentication worked by checking if we're logged in
        const currentUrl = page.url()
        if (currentUrl.includes('/demo') || currentUrl.includes('/login')) {
          throw new Error(`Authentication failed for ${role} - still on login/demo page`)
        }

        // Save and load storage state
        const { saveStorageState, loadStorageState } = await import('./auth')
        await saveStorageState(authContext, config, role)
        
        // Reload to validate it was saved correctly
        const savedState = loadStorageState(config, role)
        if (!savedState) {
          throw new Error(`Failed to save storage state for ${role}`)
        }
        storageState = savedState

        await authContext.close()
      }

      // Process each viewport
      for (const viewport of config.viewports) {
        console.log(`\n[Capture] Processing viewport: ${viewport}`)

        const viewportSize = VIEWPORT_SIZES[viewport]
        const viewportContext = await browser.newContext({
          viewport: viewportSize,
          timezoneId: 'America/New_York',
          locale: 'en-US',
          colorScheme: 'light',
          reducedMotion: 'reduce',
          storageState, // Use the storage state we ensured above
        })

        const viewportPage = await viewportContext.newPage()

        // Get routes for this role
        const routes = getRoutesForRole(role)

        // Process each route
        for (let i = 0; i < routes.length; i++) {
          const task = routes[i]
          const entry = await captureRoute(
            viewportPage,
            viewportContext,
            config,
            role,
            viewport,
            task,
            roleOutputDir,
            manifest.entries.length
          )

          manifest.entries.push(entry)
          manifest.totalScreenshots++

          if (entry.success) {
            manifest.successful++
          } else {
            manifest.failed++
          }

          // Small delay between routes
          await viewportPage.waitForTimeout(500)
        }

        await viewportContext.close()
      }
    }

    // Write manifest
    ensureDir(baseOutputDir)
    const manifestPath = path.join(baseOutputDir, 'manifest.json')
    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
      console.log(`\n[Capture] Manifest written to ${manifestPath}`)
      console.log(`[Capture] Total: ${manifest.totalScreenshots}, Success: ${manifest.successful}, Failed: ${manifest.failed}`)
    } catch (error) {
      console.error(`[Capture] Failed to write manifest:`, error)
      // Don't throw - manifest is nice to have but not critical
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }

  return manifest
}

