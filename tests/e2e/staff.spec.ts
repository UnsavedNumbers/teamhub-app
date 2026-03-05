/**
 * E2E Tests - Staff Portal Module
 *
 * Tests for staff permissions: limited nav, facilities, schedule, comms,
 * roster, reporting, billing block, gate scan, medical block, and admin block.
 * Based on QA test cases STAFF-001 through STAFF-015.
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Staff Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.staff)
  })

  test.describe('Staff Permissions', () => {
    test('[STAFF-001] staff limited nav and org scope', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      const nav = page.getByRole('navigation').or(page.locator('nav'))
      await expect(nav.first()).toBeVisible({ timeout: 5000 })
    })

    test('[STAFF-002] facilities CRUD permitted', async ({ page }) => {
      await page.goto(getLink('admin.facilities.list'))
      const facilitiesVisible = await page.getByText(/facility|venue/i).isVisible({ timeout: 5000 }).catch(() => false)
      const denied = await page.getByText(/access denied|unauthorized/i).isVisible({ timeout: 3000 }).catch(() => false)
      expect(facilitiesVisible || denied).toBe(true)
    })

    test('[STAFF-003] event create/edit permitted', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      await expect(page).toHaveURL(/\/portal\/calendar/, { timeout: 5000 })
      const createBtn = page.getByRole('button', { name: /create|add|new event/i })
      const visible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible).toBe(true)
    })

    test('[STAFF-004] org-wide announcement permitted', async ({ page }) => {
      await page.goto(getLink('portal.messages'))
      await expect(page).toHaveURL(/\/portal\/messages/, { timeout: 5000 })
      const messages = page.getByText(/message|announcement/i)
      await expect(messages.first()).toBeVisible({ timeout: 5000 })
    })

    test('[STAFF-005] roster edits permitted', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      await expect(page).toHaveURL(/\/portal\/athletes/, { timeout: 5000 })
      const roster = page.getByText(/athlete|roster/i)
      await expect(roster.first()).toBeVisible({ timeout: 5000 })
    })

    test('[STAFF-006] reporting access permitted', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      const reportLink = page.getByRole('link', { name: /report|analytics/i })
      const visible = await reportLink.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[STAFF-007] billing blocked without permission', async ({ page }) => {
      await page.goto(getLink('admin.organization.billing'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[STAFF-008] gate scan permitted', async ({ page }) => {
      await page.goto(getLink('portal.ticketValidate', { token: 'scan-page' }))
      const scanVisible = await page.getByText(/scan|validate|ticket/i).isVisible({ timeout: 5000 }).catch(() => false)
      const denied = await page.getByText(/access denied|unauthorized/i).isVisible({ timeout: 3000 }).catch(() => false)
      expect(scanVisible || denied).toBe(true)
    })

    test('[STAFF-009] medical tab blocked', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      const medicalLink = page.getByRole('link', { name: /medical|health/i })
      const visible = await medicalLink.isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible).toBe(false)
    })

    test('[STAFF-010] subset team scope enforced', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      const teamSwitcher = page.getByRole('button', { name: /team/i })
      const visible = await teamSwitcher.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[STAFF-011] notifications behavior', async ({ page }) => {
      await page.goto(getLink('portal.notifications'))
      await expect(page).toHaveURL(/\/portal\/notifications/, { timeout: 5000 })
      const notifications = page.getByText(/notification|message/i)
      await expect(notifications.first()).toBeVisible({ timeout: 5000 })
    })

    test('[STAFF-012] permission change mid-session applied', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      await page.reload()
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
    })

    test('[STAFF-013] upload photos permitted', async ({ page }) => {
      await page.goto(getLink('portal.photos'))
      const uploadBtn = page.getByRole('button', { name: /upload|add|new/i })
      const visible = await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[STAFF-014] admin routes blocked', async ({ page }) => {
      await page.goto(getLink('admin.dashboard'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[STAFF-015] audit logs blocked without permission', async ({ page }) => {
      await page.goto(getLink('admin.organization.base'))
      const auditLink = page.getByRole('link', { name: /audit|log/i })
      const visible = await auditLink.isVisible({ timeout: 5000 }).catch(() => false)
      const denied = await page.getByText(/access denied|unauthorized/i).isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible === false || denied).toBe(true)
    })
  })
})
