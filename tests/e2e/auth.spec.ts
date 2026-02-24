/**
 * E2E Tests - Authentication Module
 *
 * Tests for authentication flows including login, logout, password reset,
 * invite acceptance, and session management.
 * Based on QA test cases AUTH-001 through AUTH-015.
 *
 * Test Data Requirements:
 * - Test users must exist in database (see tests/e2e/support/auth.ts)
 * - Some tests require pending invites (created via admin panel)
 * - Password reset tests require email service access (may be skipped in CI)
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, logout, E2E_TEST_USERS } from './support/auth'

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('[AUTH-001] login success redirects to correct portal', async ({ page }) => {
      await page.goto(getLink('auth.login'))

      const emailInput = page.getByLabel(/email/i).or(page.locator('#email'))
      const passwordInput = page.getByLabel(/password/i).or(page.locator('#password'))
      const submitButton = page.getByRole('button', { name: /continue|signing in|sign in/i })

      await expect(emailInput).toBeVisible({ timeout: 5000 })
      await expect(passwordInput).toBeVisible({ timeout: 5000 })

      await emailInput.fill(E2E_TEST_USERS.orgAdmin.email)
      await passwordInput.fill(E2E_TEST_USERS.orgAdmin.password)
      await submitButton.click()

      await expect(page).not.toHaveURL(/\/portal\/login/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })

      const orgSelector = page.getByRole('button', { name: /organization|org/i }).or(page.locator('[class*="org"], [class*="Org"]'))
      const orgSelectorVisible = await orgSelector.isVisible({ timeout: 5000 }).catch(() => false)
      expect(orgSelectorVisible).toBe(true)
    })

    test('[AUTH-002] invalid password shows error', async ({ page }) => {
      await page.goto(getLink('auth.login'))

      const emailInput = page.getByLabel(/email/i).or(page.locator('#email'))
      const passwordInput = page.getByLabel(/password/i).or(page.locator('#password'))
      const submitButton = page.getByRole('button', { name: /continue|signing in|sign in/i })

      await emailInput.fill(E2E_TEST_USERS.orgAdmin.email)
      await passwordInput.fill('wrong-password-12345')
      await submitButton.click()

      await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })

      const errorMessage = page.getByText(/invalid|incorrect|wrong|error/i)
      await expect(errorMessage).toBeVisible({ timeout: 5000 })

      const loginForm = page.locator('form').first()
      await expect(loginForm).toBeVisible()
    })

    test('[AUTH-009] auth pages redirect when already logged in', async ({ page }) => {
      await loginAsUser(page, E2E_TEST_USERS.orgAdmin)

      await page.goto(getLink('auth.login'))
      await expect(page).not.toHaveURL(/\/portal\/login/, { timeout: 5000 })
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })

      const loginForm = page.locator('form').first()
      const formVisible = await loginForm.isVisible({ timeout: 2000 }).catch(() => false)
      expect(formVisible).toBe(false)
    })
  })

  test.describe('Password Reset', () => {
    test('[AUTH-003] password reset flow', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Password reset requires email service access - skipping in CI'
      )

      await page.goto(getLink('auth.forgotPassword'))

      const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
      const submitButton = page.getByRole('button', { name: /send|reset|submit/i })

      await expect(emailInput).toBeVisible({ timeout: 5000 })
      await emailInput.fill(E2E_TEST_USERS.orgAdmin.email)
      await submitButton.click()

      const successMessage = page.getByText(/email sent|check your email|reset link/i)
      await expect(successMessage).toBeVisible({ timeout: 5000 })

      const resetLink = process.env.TEST_PASSWORD_RESET_LINK
      if (resetLink) {
        await page.goto(resetLink)

        const newPasswordInput = page.getByLabel(/new password|password/i).or(page.locator('input[type="password"]').first())
        const confirmPasswordInput = page.getByLabel(/confirm|verify/i).or(page.locator('input[type="password"]').nth(1))
        const saveButton = page.getByRole('button', { name: /save|update|reset/i })

        const newPassword = 'NewTestPassword123!'
        await newPasswordInput.fill(newPassword)
        await confirmPasswordInput.fill(newPassword)
        await saveButton.click()

        await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })

        await loginAsUser(page, {
          ...E2E_TEST_USERS.orgAdmin,
          password: newPassword,
        })

        await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })

        await logout(page)

        const oldPasswordLogin = await loginAsUser(page, E2E_TEST_USERS.orgAdmin).catch(() => null)
        expect(oldPasswordLogin).toBeNull()
      }
    })
  })

  test.describe('Invite Acceptance', () => {
    test('[AUTH-004] invite acceptance creates membership', async ({ page }) => {
      const inviteLink = process.env.TEST_INVITE_LINK
      test.skip(!inviteLink, 'TEST_INVITE_LINK not set - skipping invite test')

      await page.goto(inviteLink)

      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const confirmPasswordInput = page.getByLabel(/confirm/i).or(page.locator('input[type="password"]').nth(1))
      const acceptButton = page.getByRole('button', { name: /accept|create|set password/i })

      const testPassword = 'InviteTestPassword123!'
      await passwordInput.fill(testPassword)
      await confirmPasswordInput.fill(testPassword)
      await acceptButton.click()

      await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

      const roleIndicator = page.getByText(/admin|coach|parent|staff/i).or(page.locator('[class*="role"]'))
      const roleVisible = await roleIndicator.isVisible({ timeout: 5000 }).catch(() => false)
      expect(roleVisible).toBe(true)
    })

    test('[AUTH-011] guardian invite links athlete correctly', async ({ page }) => {
      const guardianInviteLink = process.env.TEST_GUARDIAN_INVITE_LINK
      test.skip(!guardianInviteLink, 'TEST_GUARDIAN_INVITE_LINK not set - skipping guardian invite test')

      await page.goto(guardianInviteLink)

      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const acceptButton = page.getByRole('button', { name: /accept|create/i })

      await passwordInput.fill('GuardianTestPassword123!')
      await acceptButton.click()

      await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

      const athleteLink = page.getByRole('link', { name: /athlete|child/i }).or(page.getByText(/athlete|child/i))
      const athleteVisible = await athleteLink.isVisible({ timeout: 5000 }).catch(() => false)
      expect(athleteVisible).toBe(true)

      const unrelatedAthleteUrl = getLink('portal.athletes') + '/unrelated-athlete-id'
      await page.goto(unrelatedAthleteUrl)
      const deniedMessage = page.getByText(/access denied|unauthorized|not found/i)
      const deniedVisible = await deniedMessage.isVisible({ timeout: 5000 }).catch(() => false)
      expect(deniedVisible).toBe(true)
    })

    test('[AUTH-012] athlete invite restricts to self', async ({ page }) => {
      const athleteInviteLink = process.env.TEST_ATHLETE_INVITE_LINK
      test.skip(!athleteInviteLink, 'TEST_ATHLETE_INVITE_LINK not set - skipping athlete invite test')

      await page.goto(athleteInviteLink)

      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const acceptButton = page.getByRole('button', { name: /accept|create/i })

      await passwordInput.fill('AthleteTestPassword123!')
      await acceptButton.click()

      await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

      const ownProfile = page.getByText(/profile|my profile|athlete profile/i)
      const profileVisible = await ownProfile.isVisible({ timeout: 5000 }).catch(() => false)
      expect(profileVisible).toBe(true)

      await page.goto(getLink('admin.dashboard'))
      const deniedMessage = page.getByText(/access denied|unauthorized/i)
      const deniedVisible = await deniedMessage.isVisible({ timeout: 5000 }).catch(() => false)
      expect(deniedVisible).toBe(true)
    })

    test('[AUTH-013] resend invite sends working link', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Resend invite requires email service access - skipping in CI'
      )

      const resendInviteLink = process.env.TEST_RESEND_INVITE_LINK
      test.skip(!resendInviteLink, 'TEST_RESEND_INVITE_LINK not set - skipping resend invite test')

      await page.goto(resendInviteLink)

      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const acceptButton = page.getByRole('button', { name: /accept|create/i })

      await passwordInput.fill('ResendTestPassword123!')
      await acceptButton.click()

      await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

      const membershipCreated = page.getByText(/welcome|membership|success/i)
      const createdVisible = await membershipCreated.isVisible({ timeout: 5000 }).catch(() => false)
      expect(createdVisible).toBe(true)
    })
  })

  test.describe('Multi-Role and Org Switching', () => {
    test('[AUTH-005] multi-role consolidation uses one login', async ({ page }) => {
      const multiRoleUser = E2E_TEST_USERS.coach
      await loginAsUser(page, multiRoleUser)

      const roleSwitcher = page.getByRole('button', { name: /role|switch|change/i }).or(page.locator('[class*="role"], [class*="switcher"]'))
      const switcherVisible = await roleSwitcher.isVisible({ timeout: 5000 }).catch(() => false)

      if (switcherVisible) {
        await roleSwitcher.click()

        const roleOptions = page.getByRole('menuitem', { name: /.+/ }).or(page.locator('[class*="option"], [class*="item"]'))
        const optionCount = await roleOptions.count()
        expect(optionCount).toBeGreaterThan(0)

        if (optionCount > 0) {
          await roleOptions.first().click()

          const navChanged = page.getByText(/coach|admin|parent/i)
          const navVisible = await navChanged.isVisible({ timeout: 5000 }).catch(() => false)
          expect(navVisible).toBe(true)
        }
      }
    })

    test('[AUTH-010] org switcher changes scope cleanly', async ({ page }) => {
      await loginAsUser(page, E2E_TEST_USERS.orgAdmin)

      const orgSwitcher = page.getByRole('button', { name: /organization|org/i }).or(page.locator('[class*="org"], [class*="Org"]'))
      const switcherVisible = await orgSwitcher.isVisible({ timeout: 5000 }).catch(() => false)

      if (switcherVisible) {
        await orgSwitcher.click()

        const orgOptions = page.getByRole('menuitem', { name: /.+/ }).or(page.locator('[class*="org"], [class*="option"]'))
        const orgCount = await orgOptions.count()

        if (orgCount > 1) {
          const firstOrg = await orgOptions.first().textContent()
          await orgOptions.nth(1).click()

          await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })

          const dataChanged = page.getByText(/teams|athletes|events/i)
          await expect(dataChanged).toBeVisible({ timeout: 5000 })

          await orgSwitcher.click()
          await orgOptions.first().click()

          await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
        }
      }
    })
  })

  test.describe('Session Management', () => {
    test('[AUTH-007] session expiry forces re-login', async ({ page }) => {
      await loginAsUser(page, E2E_TEST_USERS.orgAdmin)

      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
        document.cookie.split(';').forEach((c) => {
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
        })
      })

      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })
    })

    test('[AUTH-015] logout clears protected content', async ({ page }) => {
      await loginAsUser(page, E2E_TEST_USERS.orgAdmin)

      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })

      const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).or(page.getByRole('link', { name: /logout/i }))
      const logoutVisible = await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (logoutVisible) {
        await logoutButton.click()
      } else {
        await logout(page)
      }

      await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })

      await page.goBack()
      await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })

      const protectedContent = page.getByText(/dashboard|portal|home/i)
      const contentVisible = await protectedContent.isVisible({ timeout: 2000 }).catch(() => false)
      expect(contentVisible).toBe(false)
    })
  })

  test.describe('Signup', () => {
    test('[AUTH-008] signup creates user if enabled', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Signup may require email verification - skipping in CI'
      )

      await page.goto(getLink('auth.signup'))

      const signupForm = page.locator('form').first()
      const formVisible = await signupForm.isVisible({ timeout: 5000 }).catch(() => false)
      test.skip(!formVisible, 'Signup form not available - signup may be disabled')

      const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const submitButton = page.getByRole('button', { name: /sign up|create|register/i })

      const testEmail = `test-signup-${Date.now()}@example.com`
      await emailInput.fill(testEmail)
      await passwordInput.fill('SignupTestPassword123!')
      await submitButton.click()

      const successMessage = page.getByText(/check your email|verify|confirmation/i)
      const successVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)

      if (successVisible) {
        const verificationLink = process.env.TEST_EMAIL_VERIFICATION_LINK
        if (verificationLink) {
          await page.goto(verificationLink)
          await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

          const profile = page.getByText(/profile|welcome|dashboard/i)
          await expect(profile).toBeVisible({ timeout: 5000 })
        }
      } else {
        await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })
      }
    })
  })

  test.describe('Email Case Normalization', () => {
    test('[AUTH-014] email case normalization prevents duplicates', async ({ page }) => {
      test.skip(
        process.env.CI === 'true',
        'Email case normalization test requires invite with mixed case - skipping in CI'
      )

      const mixedCaseInviteLink = process.env.TEST_MIXED_CASE_INVITE_LINK
      test.skip(!mixedCaseInviteLink, 'TEST_MIXED_CASE_INVITE_LINK not set - skipping case normalization test')

      await page.goto(mixedCaseInviteLink)

      const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]').first())
      const acceptButton = page.getByRole('button', { name: /accept|create/i })

      await passwordInput.fill('CaseTestPassword123!')
      await acceptButton.click()

      await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

      await logout(page)

      const lowercaseEmail = mixedCaseInviteLink.match(/email=([^&]+)/)?.[1]?.toLowerCase()
      if (lowercaseEmail) {
        await page.goto(getLink('auth.login'))
        const emailInput = page.getByLabel(/email/i).or(page.locator('#email'))
        const passwordInput = page.getByLabel(/password/i).or(page.locator('#password'))
        const submitButton = page.getByRole('button', { name: /continue|sign in/i })

        await emailInput.fill(lowercaseEmail)
        await passwordInput.fill('CaseTestPassword123!')
        await submitButton.click()

        await expect(page).toHaveURL(/\/portal/, { timeout: 10000 })

        const rolesVisible = page.getByText(/admin|coach|parent/i)
        const rolesExist = await rolesVisible.isVisible({ timeout: 5000 }).catch(() => false)
        expect(rolesExist).toBe(true)
      }
    })
  })

  test.describe('Access Control', () => {
    test('[AUTH-006] membership removed mid-session blocks access', async ({ browser }) => {
      const context = await browser.newContext()
      const pageA = await context.newPage()
      const pageB = await context.newPage()

      await loginAsUser(pageA, E2E_TEST_USERS.orgAdmin)

      await pageA.goto(getLink('portal.dashboard'))
      await expect(pageA).toHaveURL(/\/portal/, { timeout: 5000 })

      await pageB.goto(getLink('admin.dashboard'))
      await loginAsUser(pageB, E2E_TEST_USERS.orgAdmin)

      const removeMembershipButton = pageB.getByRole('button', { name: /remove|delete/i }).or(pageB.getByText(/remove.*membership/i))
      const removeVisible = await removeMembershipButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (removeVisible) {
        await removeMembershipButton.click()
        const confirmButton = pageB.getByRole('button', { name: /confirm|yes|delete/i })
        await confirmButton.click()

        await pageA.goto(getLink('portal.dashboard'))
        const accessRemoved = pageA.getByText(/access removed|membership|unauthorized/i)
        const removedVisible = await accessRemoved.isVisible({ timeout: 5000 }).catch(() => false)
        expect(removedVisible).toBe(true)
      }

      await context.close()
    })
  })
})
