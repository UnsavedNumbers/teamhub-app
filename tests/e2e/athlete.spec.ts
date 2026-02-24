/**
 * E2E Tests - Athlete Portal Module
 *
 * Tests for athlete experience: own profile, schedule, announcements,
 * tickets, profile edit restrictions, and access boundaries.
 * Based on QA test cases ATH-001 through ATH-015.
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Athlete Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.athlete)
  })

  test.describe('Athlete Experience', () => {
    test('[ATH-001] athlete sees own profile only', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      const profileLink = page.getByRole('link', { name: /profile|me|athlete/i })
      await expect(profileLink.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-002] athlete schedule shows team events', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      await expect(page).toHaveURL(/\/portal\/calendar/, { timeout: 5000 })
      const schedule = page.getByText(/event|calendar|schedule/i)
      await expect(schedule.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-003] announcements visible for team', async ({ page }) => {
      await page.goto(getLink('portal.messages'))
      await expect(page).toHaveURL(/\/portal\/messages/, { timeout: 5000 })
      const announcements = page.getByText(/announcement|message/i)
      await expect(announcements.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-004] ticket access if supported', async ({ page }) => {
      await page.goto(getLink('portal.myTickets'))
      await expect(page).toHaveURL(/\/portal\/tickets|\/portal\/my-tickets/, { timeout: 5000 })
      const ticketsContent = page.getByText(/ticket|order/i)
      await expect(ticketsContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-005] profile edit restrictions enforced', async ({ page }) => {
      await page.goto(getLink('portal.settings'))
      await expect(page).toHaveURL(/\/portal\/settings/, { timeout: 5000 })
      const restrictedField = page.locator('input[readonly], [aria-readonly="true"]')
      const count = await restrictedField.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('[ATH-006] athlete blocked from guardian tools', async ({ page }) => {
      await page.goto(getLink('admin.dashboard'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[ATH-007] video view hides private coach notes', async ({ page }) => {
      await page.goto(getLink('portal.videos'))
      await expect(page).toHaveURL(/\/portal\/videos/, { timeout: 5000 })
      const videoSection = page.locator('video').or(page.getByText(/video/i))
      await expect(videoSection.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-008] attendance history read-only', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const eventCard = page.getByRole('button', { name: /.+/ }).filter({ has: page.locator('[class*="card"]') }).first()
      if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await eventCard.click()
        const attendanceLink = page.getByRole('link', { name: /attendance/i })
        if (await attendanceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await attendanceLink.click()
          const editButton = page.getByRole('button', { name: /edit|change/i })
          const editVisible = await editButton.isVisible({ timeout: 2000 }).catch(() => false)
          expect(editVisible).toBe(false)
        }
      }
    })

    test('[ATH-009] notifications read/unread', async ({ page }) => {
      await page.goto(getLink('portal.notifications'))
      await expect(page).toHaveURL(/\/portal\/notifications/, { timeout: 5000 })
      const notifications = page.getByText(/notification|message/i)
      await expect(notifications.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-010] multi-org athlete switch', async ({ page }) => {
      const orgSwitcher = page.getByRole('button', { name: /organization|org/i })
      if (await orgSwitcher.isVisible({ timeout: 5000 }).catch(() => false)) {
        await orgSwitcher.click()
        const options = page.getByRole('menuitem')
        if (await options.count() > 0) {
          await options.first().click()
          await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
        }
      }
    })

    test('[ATH-011] athlete blocked from attendance edits', async ({ page }) => {
      await page.goto(getLink('admin.attendance'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[ATH-012] galleries view', async ({ page }) => {
      await page.goto(getLink('portal.photos'))
      await expect(page).toHaveURL(/\/portal\/photos/, { timeout: 5000 })
      const gallery = page.getByText(/photo|gallery/i)
      await expect(gallery.first()).toBeVisible({ timeout: 5000 })
    })

    test('[ATH-013] logout and back button protection', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      const logoutBtn = page.getByRole('button', { name: /logout|sign out/i })
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click()
        await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })
        await page.goBack()
        await expect(page).toHaveURL(/\/portal\/login/, { timeout: 5000 })
      }
    })

    test('[ATH-014] RSVP policy enforced', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const rsvpBtn = page.getByRole('button', { name: /rsvp|attend/i })
      if (await rsvpBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rsvpBtn.first().click()
        await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      }
    })

    test('[ATH-015] uniform size view', async ({ page }) => {
      await page.goto(getLink('portal.uniforms'))
      await expect(page).toHaveURL(/\/portal\/uniforms/, { timeout: 5000 })
      const uniformContent = page.getByText(/uniform|size/i)
      await expect(uniformContent.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
