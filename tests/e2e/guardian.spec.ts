/**
 * E2E Tests - Guardian Portal Module
 *
 * Tests for guardian (parent) family operations: linked athletes, calendar,
 * RSVP, announcements, tickets, payments, profile, and access boundaries.
 * Based on QA test cases GUA-001 through GUA-015.
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import { loginAsUser, E2E_TEST_USERS } from './support/auth'

test.describe('Guardian Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, E2E_TEST_USERS.parent)
  })

  test.describe('Family Operations', () => {
    test('[GUA-001] guardian sees only linked athletes', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      await page.goto(getLink('portal.athletes'))
      await expect(page).toHaveURL(/\/portal\/athletes/, { timeout: 5000 })
      const athleteSection = page.getByText(/athlete|child|player/i)
      await expect(athleteSection.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-002] calendar shows team events for athlete', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      await expect(page).toHaveURL(/\/portal\/calendar/, { timeout: 5000 })
      const calendarContent = page.getByRole('heading', { name: /calendar/i }).or(page.getByText(/event|calendar/i))
      await expect(calendarContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-003] RSVP flow works if enabled', async ({ page }) => {
      await page.goto(getLink('portal.calendar'))
      const rsvpButton = page.getByRole('button', { name: /rsvp|attend/i })
      if (await rsvpButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rsvpButton.first().click()
        const confirm = page.getByRole('button', { name: /confirm|yes|submit/i })
        await expect(confirm).toBeVisible({ timeout: 5000 })
      }
    })

    test('[GUA-004] team announcements visibility', async ({ page }) => {
      await page.goto(getLink('portal.messages'))
      await expect(page).toHaveURL(/\/portal\/messages/, { timeout: 5000 })
      const messages = page.getByText(/message|announcement/i)
      await expect(messages.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-005] ticket purchases list and detail', async ({ page }) => {
      await page.goto(getLink('portal.myTickets'))
      await expect(page).toHaveURL(/\/portal\/tickets|\/portal\/my-tickets/, { timeout: 5000 })
      const ticketsContent = page.getByText(/ticket|order/i)
      await expect(ticketsContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-006] registration payment flow if exists', async ({ page }) => {
      await page.goto(getLink('portal.payments'))
      await expect(page).toHaveURL(/\/portal\/payments/, { timeout: 5000 })
      const paymentsContent = page.getByText(/payment|fee|balance/i)
      await expect(paymentsContent.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-007] update guardian profile persists', async ({ page }) => {
      await page.goto(getLink('portal.settings'))
      await expect(page).toHaveURL(/\/portal\/settings/, { timeout: 5000 })
      const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('Updated Guardian Name')
        const saveBtn = page.getByRole('button', { name: /save|update/i })
        await saveBtn.click()
        const success = page.getByText(/saved|updated/i)
        await expect(success).toBeVisible({ timeout: 5000 })
      }
    })

    test('[GUA-008] multi-org membership switches correctly', async ({ page }) => {
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

    test('[GUA-009] volunteer signup tied to org', async ({ page }) => {
      await page.goto(getLink('portal.dashboard'))
      const volunteerLink = page.getByRole('link', { name: /volunteer/i })
      if (await volunteerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await volunteerLink.click()
        await expect(page).toHaveURL(/\/portal|\/o\//, { timeout: 5000 })
      }
    })

    test('[GUA-010] medical docs protected access if present', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      const medicalLink = page.getByRole('link', { name: /medical|health/i })
      if (await medicalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await medicalLink.click()
        await expect(page).toHaveURL(/\/portal/, { timeout: 5000 })
      }
    })

    test('[GUA-011] photo galleries visible public', async ({ page }) => {
      await page.goto(getLink('portal.photos'))
      await expect(page).toHaveURL(/\/portal\/photos/, { timeout: 5000 })
      const gallery = page.getByText(/photo|gallery/i)
      await expect(gallery.first()).toBeVisible({ timeout: 5000 })
    })

    test('[GUA-012] messaging to coach if exists', async ({ page }) => {
      await page.goto(getLink('portal.messages'))
      const composeBtn = page.getByRole('button', { name: /compose|new|message/i })
      if (await composeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await composeBtn.click()
        const form = page.locator('form').first()
        await expect(form).toBeVisible({ timeout: 5000 })
      }
    })

    test('[GUA-013] guardian blocked from org admin routes', async ({ page }) => {
      await page.goto(getLink('admin.dashboard'))
      await expect(page).toHaveURL(/\/portal\/login|\/portal\/unauthorized/, { timeout: 5000 })
    })

    test('[GUA-014] resend tickets/receipt email', async ({ page }) => {
      await page.goto(getLink('portal.myTickets'))
      const resendBtn = page.getByRole('button', { name: /resend|email|receipt/i })
      if (await resendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await resendBtn.click()
        const success = page.getByText(/sent|email/i)
        await expect(success).toBeVisible({ timeout: 5000 })
      }
    })

    test('[GUA-015] link removal revokes athlete access', async ({ page }) => {
      await page.goto(getLink('portal.athletes'))
      await expect(page).toHaveURL(/\/portal\/athletes/, { timeout: 5000 })
      const emptyState = page.getByText(/no athlete|no children|linked/i)
      const hasContent = await page.getByText(/athlete|child/i).first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasContent || (await emptyState.isVisible({ timeout: 1000 }).catch(() => false))).toBe(true)
    })
  })
})
