/**
 * Authentication utilities for screenshot system
 * 
 * Handles demo code login flow and storage state management.
 */

import { BrowserContext, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import type { Role } from './config'
import { getStorageStatePath, type ScreenshotConfig } from './config'
import { ensureDir } from './utils'

/**
 * Login using demo code flow
 * 
 * Flow:
 * 1. Navigate to /demo
 * 2. Enter demo code and submit
 * 3. Wait for role selector dropdown (appears AFTER code validation)
 * 4. Select role from dropdown
 * 5. Click submit button
 * 6. Wait for redirect and post-login selector
 */
export async function loginDemoCode(
  page: Page,
  demoCode: string,
  role: Role,
  baseUrl: string
): Promise<void> {
  console.log(`[Auth] Logging in as ${role} with demo code...`)

  // Navigate to demo entry page
  await page.goto(`${baseUrl}/demo`)
  await page.waitForLoadState('networkidle')

  // Fill demo code input
  const demoCodeInput = page.locator('#demo-code')
  await demoCodeInput.waitFor({ state: 'visible', timeout: 10000 })
  await demoCodeInput.fill(demoCode)
  
  // Submit the code by pressing Enter (triggers validation)
  await demoCodeInput.press('Enter')

  // Wait for role selector dropdown to appear AFTER code validation
  // The dropdown appears conditionally when availableRoles.length > 0
  const roleSelect = page.locator('#demo-role')
  
  // Wait for element to be attached to DOM (it exists but might not be visible yet)
  await roleSelect.waitFor({ state: 'attached', timeout: 20000 })
  
  // Wait a moment for React to render and options to be populated
  await page.waitForTimeout(1000)
  
  // Verify the element is actually there and has options
  const optionCount = await roleSelect.locator('option').count()
  if (optionCount === 0) {
    throw new Error('Role selector found but has no options. Validation may have failed.')
  }

  // Map role names to select option values/labels
  const roleOptionMap: Record<Role, string> = {
    org_admin: 'org_admin',
    coach: 'coach',
    parent: 'parent',
    athlete: 'athlete',
    staff: 'staff',
    fan: 'fan',
  }

  const roleValue = roleOptionMap[role]
  
  // Select role from dropdown
  try {
    await roleSelect.selectOption({ value: roleValue })
  } catch {
    // Fallback: try by label
    const roleLabels: Record<Role, string[]> = {
      org_admin: ['Org Admin'],
      coach: ['Coach'],
      parent: ['Guardian'],
      athlete: ['Athlete'],
      staff: ['Volunteer'],
      fan: ['Fan'],
    }
    const labels = roleLabels[role] || [role]
    await roleSelect.selectOption({ label: labels[0] })
  }

  // Click the submit button
  const submitButton = page.locator('button:has-text("Enter demo"), button:has-text("Enter Demo"), button[type="submit"]').first()
  await submitButton.waitFor({ state: 'visible', timeout: 5000 })
  await submitButton.click()

  // Wait for redirect (magic link flow via /portal/auth/callback)
  await page.waitForURL(/\/portal\/auth\/callback|\/admin|\/portal|\/fan/, { timeout: 30000 })
  
  // If we're on callback page, wait for redirect to complete
  if (page.url().includes('/portal/auth/callback')) {
    await page.waitForURL(/\/admin|\/portal|\/fan/, { timeout: 15000 })
  }
  
  // Wait for post-login selector (app shell or dashboard)
  // Try multiple selectors to handle different roles
  const postLoginSelectors = [
    '[data-testid="app-shell"]',
    '[data-testid="dashboard"]',
    'nav',
    '.oa-sidebar',
    '.oa-main',
  ]

  let found = false
  for (const selector of postLoginSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 })
      found = true
      break
    } catch {
      // Try next selector
    }
  }

  if (!found) {
    // Fallback: wait for fonts and a reasonable timeout
    await page.waitForLoadState('domcontentloaded')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(3000)
  }

  // Additional wait to ensure session is fully established
  // This helps prevent storage state from being saved before auth cookies are set
  await page.waitForTimeout(2000)
  
  // Verify we're actually authenticated by checking URL
  const finalUrl = page.url()
  if (finalUrl.includes('/demo') || finalUrl.includes('/login')) {
    throw new Error(`Login verification failed - still on login/demo page: ${finalUrl}`)
  }

  console.log(`[Auth] Successfully logged in as ${role} (${finalUrl})`)
}

/**
 * Save storage state to file
 */
export async function saveStorageState(
  context: BrowserContext,
  config: ScreenshotConfig,
  role: Role
): Promise<void> {
  const storageStatePath = getStorageStatePath(config, role)
  ensureDir(path.dirname(storageStatePath))
  
  await context.storageState({ path: storageStatePath })
  console.log(`[Auth] Saved storage state to ${storageStatePath}`)
}

/**
 * Load storage state from file
 */
export function loadStorageState(config: ScreenshotConfig, role: Role): object | null {
  const storageStatePath = getStorageStatePath(config, role)
  
  if (!fs.existsSync(storageStatePath)) {
    return null
  }

  try {
    const content = fs.readFileSync(storageStatePath, 'utf-8')
    const state = JSON.parse(content)
    
    // Basic validation: check if it has expected structure
    if (!state || typeof state !== 'object') {
      console.warn(`[Auth] Invalid storage state structure at ${storageStatePath}`)
      return null
    }
    
    // Check if cookies array exists (basic validation)
    if (!Array.isArray(state.cookies) && !state.origins) {
      console.warn(`[Auth] Storage state appears invalid (missing cookies/origins)`)
      return null
    }
    
    return state
  } catch (error) {
    console.warn(`[Auth] Failed to load storage state from ${storageStatePath}:`, error)
    return null
  }
}

/**
 * Logout by clicking logout button in UserContextDropdown
 * This properly clears the session before switching roles
 */
export async function logout(page: Page, baseUrl: string): Promise<void> {
  console.log(`[Auth] Logging out...`)
  
  // Navigate to a page where the user dropdown is visible (any authenticated page)
  const currentUrl = page.url()
  if (!currentUrl.includes('/admin') && !currentUrl.includes('/portal') && !currentUrl.includes('/fan')) {
    // If not on an authenticated page, try navigating to dashboard
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      // If admin doesn't work, try portal
      return page.goto(`${baseUrl}/portal/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 })
    })
  }
  
  // Wait for page to settle
  await page.waitForTimeout(1000)
  
  // Find and click the user avatar/dropdown button
  // Try multiple selectors to find the dropdown trigger
  let dropdownOpened = false
  
  // Try button with aria-expanded attribute
  try {
    const button = page.locator('button[aria-expanded]').first()
    await button.waitFor({ state: 'visible', timeout: 3000 })
    await button.click()
    await page.waitForTimeout(500)
    dropdownOpened = true
  } catch {
    // Try button containing rounded avatar
    try {
      const button = page.locator('button:has(div.rounded-full)').first()
      await button.waitFor({ state: 'visible', timeout: 3000 })
      await button.click()
      await page.waitForTimeout(500)
      dropdownOpened = true
    } catch {
      // Try clicking the avatar div itself (it might be clickable)
      try {
        const avatar = page.locator('div.rounded-full').first()
        await avatar.waitFor({ state: 'visible', timeout: 3000 })
        await avatar.click()
        await page.waitForTimeout(500)
        dropdownOpened = true
      } catch {
        throw new Error('Could not find user dropdown button')
      }
    }
  }
  
  if (!dropdownOpened) {
    throw new Error('Failed to open user dropdown')
  }
  
  // Find and click the logout button
  // Look for button with text "Log out" (case insensitive) or containing logout icon
  const logoutButton = page.locator('button:has-text("Log out"), button:has-text("Logout"), button:has-text("log out"), button:has(.material-symbols-outlined:text("logout"))').first()
  
  await logoutButton.waitFor({ state: 'visible', timeout: 5000 })
  await logoutButton.click()
  
  // Wait for redirect to login page
  await page.waitForURL(/\/demo|\/login/, { timeout: 10000 })
  console.log(`[Auth] ✓ Logged out`)
}

/**
 * Ensure storage state exists, creating it if necessary
 */
export async function ensureStorageState(
  page: Page,
  context: BrowserContext,
  config: ScreenshotConfig,
  role: Role
): Promise<void> {
  const storageStatePath = getStorageStatePath(config, role)

  // Check if storage state exists and is valid
  if (config.authStrategy === 'storage_state' || fs.existsSync(storageStatePath)) {
    const storageState = loadStorageState(config, role)
    if (storageState) {
      console.log(`[Auth] Using existing storage state for ${role}`)
      return
    }
  }

  // Need to login
  if (!config.demoCode) {
    throw new Error(`Demo code required but not provided. Set YS_DEMO_CODE or provide storage state at ${storageStatePath}`)
  }

  await loginDemoCode(page, config.demoCode, role, config.baseUrl)
  await saveStorageState(context, config, role)
}
