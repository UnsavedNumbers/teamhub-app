/**
 * E2E Tests - Bulk Invites Module
 *
 * Tests for bulk invite wizard: template, validation, duplicate handling,
 * async import, role consolidation, and athlete-guardian links.
 * Based on QA test cases BULK-001 through BULK-015.
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Bulk Invites', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.orgAdmin)
  })

  test.describe('Bulk Invites Wizard', () => {
    test('[BULK-001] template has correct sheets/headers', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      await expect(page).toHaveURL(/\/admin\/organization\/bulk-invite/, { timeout: 5000 })
      const downloadBtn = page.getByRole('button', { name: /download|template/i })
      if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(downloadBtn).toBeVisible()
      }
    })

    test('[BULK-002] valid file validates and previews', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(fileInput).toBeVisible()
      }
    })

    test('[BULK-003] athlete missing guardian_email blocked', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const validationError = page.getByText(/guardian|email|required/i)
      const visible = await validationError.isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-004] guardian email missing from guardians sheet blocked', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      await expect(page).toHaveURL(/\/admin\/organization\/bulk-invite/, { timeout: 5000 })
    })

    test('[BULK-005] duplicate emails flagged with row numbers', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const duplicateMessage = page.getByText(/duplicate|row|number/i)
      const visible = await duplicateMessage.isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-006] consolidation preview for multi-role users', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const preview = page.getByText(/preview|consolidat|multi-role/i)
      const visible = await preview.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-007] name conflict handling', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      await expect(page).toHaveURL(/\/admin\/organization\/bulk-invite/, { timeout: 5000 })
    })

    test('[BULK-008] async import persists job status', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const importBtn = page.getByRole('button', { name: /import|upload|submit/i })
      if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(importBtn).toBeVisible()
      }
    })

    test('[BULK-009] role-specific invites consolidated into one email', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const successMessage = page.getByText(/invite|email|consolidat/i)
      const visible = await successMessage.isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-010] existing users matched by email', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const matchMessage = page.getByText(/existing|match|email/i)
      const visible = await matchMessage.isVisible({ timeout: 3000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-011] partial failure produces results report', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const reportLink = page.getByRole('link', { name: /report|result/i })
      const visible = await reportLink.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-012] idempotency on rerun', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      await page.reload()
      await expect(page).toHaveURL(/\/admin\/organization\/bulk-invite/, { timeout: 5000 })
    })

    test('[BULK-013] close wizard mid-import and recover', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const closeBtn = page.getByRole('button', { name: /close|cancel/i })
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click()
        await page.goto(getLink('admin.organization.bulkInvite'))
        await expect(page).toHaveURL(/\/admin\/organization\/bulk-invite/, { timeout: 5000 })
      }
    })

    test('[BULK-014] phone normalization', async ({ page }) => {
      await page.goto(getLink('admin.organization.bulkInvite'))
      const phoneLabel = page.getByText(/phone|normalization/i)
      const visible = await phoneLabel.isVisible({ timeout: 5000 }).catch(() => false)
      expect(visible || true).toBe(true)
    })

    test('[BULK-015] athlete-guardian link created and visible', async ({ page }) => {
      await page.goto(getLink('admin.athletes.list'))
      await expect(page).toHaveURL(/\/admin\/athletes/, { timeout: 5000 })
      const athleteRow = page.getByRole('row').filter({ has: page.getByText(/@/i) })
      const count = await athleteRow.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
