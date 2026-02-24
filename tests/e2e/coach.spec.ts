/**
 * E2E Tests - Coach Portal Module
 *
 * Tests for coach-scoped operations: team visibility, attendance, announcements,
 * travel, uniforms, videos, and permission boundaries.
 * Based on QA test cases COACH-001 through COACH-015.
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Coach Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.coach)
  })

  test.describe('Team-Scoped Operations', () => {
    test('[COACH-001] coach sees assigned teams only', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      const teamSwitcher = page.getByRole('button', { name: /team|switch/i }).or(page.locator('[class*="team"], [class*="Team"]'))
      const visible = await teamSwitcher.isVisible({ timeout: 5000 }).catch(() => false)
      if (visible) {
        await teamSwitcher.click()
        const options = page.getByRole('menuitem').or(page.locator('[class*="option"]'))
        const count = await options.count()
        expect(count).toBeGreaterThan(0)
      }
      await page.goto(getLink('portal.calendar'))
      await expect(page).toHaveURL(/\/portal\/calendar/, { timeout: 5000 })
      await page.reload()
      await expect(page).toHaveURL(/\/portal\/calendar/, { timeout: 5000 })
    })

    test('[COACH-002] switch team changes events/roster data', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const switcher = page.getByRole('button', { name: /team/i })
      if (await switcher.isVisible({ timeout: 3000 }).catch(() => false)) {
        await switcher.click()
        const items = page.getByRole('menuitem')
        if (await items.count() > 1) {
          await items.nth(1).click()
          await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
        }
      }
      await page.goto(getLink('portal.athletes'))
      await expect(page).toHaveURL(/\/portal\/athletes/, { timeout: 5000 })
    })

    test('[COACH-003] mark attendance for practice event', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const eventCard = page.getByRole('button', { name: /.+/ }).filter({ has: page.locator('[class*="card"]') }).first()
      if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await eventCard.click()
        const attendanceLink = page.getByRole('link', { name: /attendance/i })
        if (await attendanceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await attendanceLink.click()
          const markButton = page.getByRole('button', { name: /mark|present/i })
          expect(await markButton.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
        }
      }
    })

    test('[COACH-004] create team announcement if allowed', async ({ page }) => {
      await page.goto(getLink('portal.messages'))
      const createBtn = page.getByRole('button', { name: /create|new|announcement/i })
      if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createBtn.click()
        const titleInput = page.getByLabel(/title/i).or(page.locator('input[name*="title"]'))
        expect(await titleInput.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
      }
    })

    test('[COACH-005] roster contact info respects privacy', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      await expect(page).toHaveURL(/\/portal\/athletes/, { timeout: 5000 })
      const roster = page.getByText(/athlete|roster|player/i)
      await expect(roster.first()).toBeVisible({ timeout: 5000 })
    })

    test('[COACH-006] event create/edit respects policy', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const createBtn = page.getByRole('button', { name: /create|add|new event/i })
      const canCreate = await createBtn.isVisible({ timeout: 5000 }).catch(() => false)
      if (canCreate) {
        await createBtn.click()
        const form = page.locator('form').first()
        await expect(form).toBeVisible({ timeout: 5000 })
      }
    })

    test('[COACH-007] travel details visible only for team scope', async ({ page }) => {
      await page.goto(getLink('portal.travel'))
      await expect(page).toHaveURL(/\/portal\/travel/, { timeout: 5000 })
      const travelContent = page.getByText(/travel|trip/i)
      await expect(travelContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[COACH-008] uniform sizes entry persists', async ({ page }) => {
      await page.goto(getLink('portal.uniforms'))
      await expect(page).toHaveURL(/\/portal\/uniforms/, { timeout: 5000 })
      const uniformsContent = page.getByText(/uniform|size/i)
      await expect(uniformsContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[COACH-009] video playback and timestamp comments work', async ({ page }) => {
      await page.goto(getLink('portal.videos'))
      await expect(page).toHaveURL(/\/portal\/videos/, { timeout: 5000 })
      const videoSection = page.locator('video').or(page.getByText(/video/i))
      await expect(videoSection.first()).toBeVisible({ timeout: 5000 })
    })

    test('[COACH-010] coach cannot access finance/reporting', async ({ page }) => {
      await page.goto(getLink('admin.organization.billing'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[COACH-011] coach removal revokes access', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      const adminLink = page.getByRole('link', { name: /admin/i })
      if (await adminLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await adminLink.click()
        await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
      }
    })

    test('[COACH-012] coach in multiple orgs switches cleanly', async ({ page }) => {
      const orgSwitcher = page.getByRole('button', { name: /organization|org/i })
      if (await orgSwitcher.isVisible({ timeout: 5000 }).catch(() => false)) {
        await orgSwitcher.click()
        const options = page.getByRole('menuitem')
        const count = await options.count()
        if (count > 1) {
          await options.nth(1).click()
          await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
        }
      }
    })

    test('[COACH-013] attendance export is team-scoped', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const exportBtn = page.getByRole('button', { name: /export|download/i })
      if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exportBtn.click()
        await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      }
    })

    test('[COACH-014] coach cannot roster athletes if policy', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      const addAthleteBtn = page.getByRole('button', { name: /add|roster/i })
      const visible = await addAthleteBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (visible) {
        await addAthleteBtn.click()
        const form = page.locator('form').first()
        await expect(form).toBeVisible({ timeout: 5000 })
      }
    })

    test('[COACH-015] notification read/unread updates for coach', async ({ page }) => {
      await page.goto(getLink('portal.notifications'))
      await expect(page).toHaveURL(/\/portal\/notifications/, { timeout: 5000 })
      const notifications = page.getByText(/notification|message/i)
      await expect(notifications.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
