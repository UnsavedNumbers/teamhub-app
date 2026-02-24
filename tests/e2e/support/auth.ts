/**
 * E2E Test – Browser-based Authentication Helpers
 *
 * Provides browser-based login functionality for Playwright E2E tests.
 * Uses the same test users as RLS contract tests but performs login
 * through the browser UI rather than API calls.
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { getLink } from '../../../src/utils/routes'

/**
 * Test user credentials for E2E tests.
 * These users must exist in the test database.
 * Password defaults to 'TestPassword123!' unless overridden via CONTRACT_TEST_PASSWORD env var.
 */
export interface E2ETestUser {
  label: string
  email: string
  password: string
  expectedRole: 'org_admin' | 'coach' | 'parent' | 'staff' | 'fan' | 'platform_admin' | 'athlete'
}

const DEFAULT_TEST_PASSWORD = 'TestPassword123!'
const TEST_PASSWORD = process.env.CONTRACT_TEST_PASSWORD ?? DEFAULT_TEST_PASSWORD

export const E2E_TEST_USERS: Record<string, E2ETestUser> = {
  orgAdmin: {
    label: 'Org Admin 1',
    email: 'admin-org1@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'org_admin',
  },
  coach: {
    label: 'Coach 1',
    email: 'coach-org1@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'coach',
  },
  parent: {
    label: 'Guardian 1',
    email: 'parent-org1@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'parent',
  },
  staff: {
    label: 'Staff 1',
    email: 'coach-multi@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'staff',
  },
  fan: {
    label: 'Fan 1 (no test-org membership)',
    email: 'parent-org2@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'fan',
  },
  athlete: {
    label: 'Athlete 1',
    email: 'athlete-org1@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'athlete',
  },
  platformAdmin: {
    label: 'Platform Admin',
    email: 'platform-admin@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'platform_admin',
  },
  orgAdmin2: {
    label: 'Org Admin 2 (cross-org)',
    email: 'admin-org2@test.com',
    password: TEST_PASSWORD,
    expectedRole: 'org_admin',
  },
}

/**
 * Logs in a test user through the browser UI.
 * Navigates to login page, fills credentials, submits form, and waits for redirect.
 *
 * @param page - Playwright Page instance
 * @param user - Test user to log in as
 * @param expectedRedirectPattern - Optional regex pattern to verify redirect URL
 * @throws Error if login fails or redirect doesn't match expected pattern
 */
export async function loginAsUser(
  page: Page,
  user: E2ETestUser,
  expectedRedirectPattern?: RegExp
): Promise<void> {
  await page.goto(getLink('auth.login'))

  const emailInput = page.getByLabel(/email/i).or(page.locator('#email'))
  const passwordInput = page.getByLabel(/password/i).or(page.locator('#password'))
  const submitButton = page.getByRole('button', { name: /continue|signing in|sign in/i })

  await expect(emailInput).toBeVisible({ timeout: 5000 })
  await expect(passwordInput).toBeVisible({ timeout: 5000 })
  await expect(submitButton).toBeVisible({ timeout: 5000 })

  await emailInput.fill(user.email)
  await passwordInput.fill(user.password)

  await submitButton.click()

  if (expectedRedirectPattern) {
    await expect(page).toHaveURL(expectedRedirectPattern, { timeout: 10000 })
  } else {
    await expect(page).not.toHaveURL(/\/portal\/login/, { timeout: 10000 })
  }
}

/**
 * Logs out the current user by clearing browser storage and navigating to login.
 * Use this to reset authentication state between tests.
 *
 * @param page - Playwright Page instance
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(getLink('auth.login'))
}

/**
 * Verifies that the current page requires authentication by checking
 * if user is redirected to login page.
 *
 * @param page - Playwright Page instance
 * @param protectedUrl - URL that should require authentication
 */
export async function verifyRequiresAuth(page: Page, protectedUrl: string): Promise<void> {
  await page.goto(protectedUrl)
  await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })
}
