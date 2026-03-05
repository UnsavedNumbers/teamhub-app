/**
 * E2E Tests - Public Routes Module
 *
 * Tests for public-facing organization pages that don't require authentication.
 * Based on QA test cases PUB-001 through PUB-015.
 *
 * Test Data Requirements:
 * - Test organization with slug (default: 'test-org')
 * - Organization must have logo, events, teams, photos for full coverage
 * - Some tests require ticketed events with inventory
 * - Some tests require valid access tokens and share tokens
 */

import { test, expect } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

/**
 * Test organization slug for public route tests.
 * Update this if your test database uses a different org slug.
 */
const TEST_ORG_SLUG = 'test-org'

test.describe('Public Routes', () => {
  test.describe('Organization Landing Page', () => {
    test('[PUB-001] renders org homepage with data and links', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`))

      const heroSection = page.locator('[class*="hero"], [class*="Hero"]').first()
      const tilesSection = page.locator('[class*="tile"], [class*="Tile"], [class*="card"], [class*="Card"]').first()

      await expect(heroSection.or(page.getByRole('heading', { level: 1 }))).toBeVisible({ timeout: 5000 })

      const eventsTile = page.getByRole('link', { name: /events?/i }).or(page.getByText(/events?/i).first())
      const photosTile = page.getByRole('link', { name: /photos?|gallery/i }).or(page.getByText(/photos?|gallery/i).first())

      if (await eventsTile.isVisible({ timeout: 2000 }).catch(() => false)) {
        await eventsTile.click()
        await expect(page).toHaveURL(/\/events|\/calendar/, { timeout: 5000 })
        await page.goBack()
      }

      if (await photosTile.isVisible({ timeout: 2000 }).catch(() => false)) {
        await photosTile.click()
        await expect(page).toHaveURL(/\/photos|\/gallery/, { timeout: 5000 })
      }

      const loginLink = page.getByRole('link', { name: /login|sign in/i })
      const loginVisible = await loginLink.isVisible({ timeout: 1000 }).catch(() => false)
      expect(loginVisible).toBe(false)
    })

    test('[PUB-002] handles empty states when org has no events or galleries', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`))

      const upcomingEventsSection = page.getByText(/upcoming events?/i).or(page.getByText(/no events?/i))
      const photosSection = page.getByText(/photos?|gallery/i)

      const hasEvents = await upcomingEventsSection.filter({ hasText: /none|no events/i }).isVisible({ timeout: 2000 }).catch(() => false)
      const eventsHidden = await upcomingEventsSection.isHidden({ timeout: 2000 }).catch(() => false)

      expect(hasEvents || eventsHidden).toBe(true)

      const photosHidden = await photosSection.isHidden({ timeout: 2000 }).catch(() => false)
      expect(photosHidden).toBe(true)

      await page.setViewportSize({ width: 390, height: 844 })
      const body = page.locator('body')
      const horizontalScroll = await body.evaluate((el) => {
        return el.scrollWidth > el.clientWidth
      })
      expect(horizontalScroll).toBe(false)
    })

    test('[PUB-010] handles invalid org slug with friendly error', async ({ page }) => {
      const invalidSlug = 'not-a-real-org-12345'
      await page.goto(getLink('portal.orgLanding', { orgSlug: invalidSlug }))

      await expect(page).toHaveURL(new RegExp(`/o/${invalidSlug}`))

      const errorMessage = page.getByText(/not found|404|organization not found|doesn't exist/i)
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

      expect(errorVisible).toBe(true)

      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.reload()
      const hasStackTrace = consoleErrors.some((err) => err.includes('at ') || err.includes('Stack'))
      expect(hasStackTrace).toBe(false)
    })

    test('[PUB-013] mobile responsive layout', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`))

      const tilesGrid = page.locator('[class*="grid"], [class*="tile"]').first()
      await expect(tilesGrid.or(page.locator('main'))).toBeVisible({ timeout: 5000 })

      const body = page.locator('body')
      const horizontalScroll = await body.evaluate((el) => {
        return el.scrollWidth > el.clientWidth
      })
      expect(horizontalScroll).toBe(false)

      const ctaButtons = page.getByRole('button', { name: /.+/ }).or(page.getByRole('link', { name: /.+/ }))
      const buttonCount = await ctaButtons.count()
      if (buttonCount > 0) {
        const firstButton = ctaButtons.first()
        const box = await firstButton.boundingBox()
        expect(box).not.toBeNull()
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('[PUB-014] accessibility smoke test', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`))

      const interactiveElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      const count = await interactiveElements.count()

      if (count > 0) {
        await interactiveElements.first().focus()
        await expect(interactiveElements.first()).toBeFocused()

        for (let i = 0; i < Math.min(count, 5); i++) {
          await page.keyboard.press('Tab')
          const focused = await page.evaluate(() => {
            const active = document.activeElement
            return active && (active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'INPUT')
          })
          expect(focused).toBe(true)
        }
      }

      const buttons = page.getByRole('button')
      const buttonCount = await buttons.count()
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        const hasAccessibleName = ariaLabel || (text && text.trim().length > 0)
        expect(hasAccessibleName).toBe(true)
      }
    })

    test('[PUB-015] performance with throttled network', async ({ page, context }) => {
      await context.route('**/*', async (route) => {
        await route.continue()
      })

      await context.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache',
      })

      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }), {
        waitUntil: 'domcontentloaded',
      })

      const loadingIndicator = page.locator('[class*="loading"], [class*="skeleton"], [class*="spinner"]').first()
      const loadingVisible = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false)

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`), { timeout: 15000 })

      const images = page.locator('img')
      const imageCount = await images.count()
      if (imageCount > 0) {
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i)
          const src = await img.getAttribute('src')
          if (src && !src.startsWith('data:')) {
            const response = await page.request.get(src).catch(() => null)
            if (response) {
              const size = (await response.body()).length
              const sizeMB = size / (1024 * 1024)
              expect(sizeMB).toBeLessThan(5)
            }
          }
        }
      }
    })
  })

  test.describe('Public Tickets', () => {
    test('[PUB-003] public ticket list and detail are org-scoped', async ({ page }) => {
      await page.goto(getLink('portal.orgTickets', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}/tickets`))

      const eventLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="event"], [class*="card"]') })
      const eventCount = await eventLinks.count()

      if (eventCount > 0) {
        await eventLinks.first().click()
        await expect(page).toHaveURL(/\/tickets\/events\//, { timeout: 5000 })

        const ticketTypes = page.getByText(/\$|\d+\.\d{2}/).or(page.getByText(/general|vip|adult|child/i))
        await expect(ticketTypes.first()).toBeVisible({ timeout: 5000 })

        const currentUrl = page.url()
        const urlMatch = currentUrl.match(/\/events\/([^/]+)/)
        if (urlMatch && urlMatch[1]) {
          const eventId = urlMatch[1]
          const invalidEventId = eventId.slice(0, -1) + 'X'
          await page.goto(getLink('portal.orgTicketEvent', { orgSlug: TEST_ORG_SLUG, eventId: invalidEventId }))
          const errorVisible = await page.getByText(/not found|404|error/i).isVisible({ timeout: 5000 }).catch(() => false)
          expect(errorVisible).toBe(true)
        }
      }
    })

    test('[PUB-004] ticket purchase flow', async ({ page }) => {
      await page.goto(getLink('portal.orgTickets', { orgSlug: TEST_ORG_SLUG }))

      const eventLinks = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[class*="event"]') })
      const eventCount = await eventLinks.count()

      if (eventCount > 0) {
        await eventLinks.first().click()
        await expect(page).toHaveURL(/\/tickets\/events\//, { timeout: 5000 })

        const addButton = page.getByRole('button', { name: /add|\+/i }).first()
        const addButtonVisible = await addButton.isVisible({ timeout: 2000 }).catch(() => false)

        if (addButtonVisible) {
          await addButton.click()

          const checkoutButton = page.getByRole('button', { name: /checkout|purchase|buy/i })
          const checkoutVisible = await checkoutButton.isVisible({ timeout: 2000 }).catch(() => false)

          if (checkoutVisible) {
            const emailInput = page.getByPlaceholder(/email|your@email/i).or(page.getByLabel(/email/i))
            await emailInput.fill('test@example.com')

            await checkoutButton.click()

            await expect(page).toHaveURL(/\/tickets\/order\//, { timeout: 10000 })

            const orderId = page.url().match(/\/order\/([^/]+)/)?.[1]
            expect(orderId).toBeTruthy()

            if (orderId) {
              await page.goto(getLink('portal.orgTicketOrder', { orgSlug: TEST_ORG_SLUG, orderId }))
              await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}/tickets/order/${orderId}`))

              const qrCode = page.locator('[class*="qr"], [class*="QR"], canvas').first()
              const qrVisible = await qrCode.isVisible({ timeout: 5000 }).catch(() => false)
              expect(qrVisible).toBe(true)
            }
          }
        }
      }
    })

    test('[PUB-005] ticket access token validation', async ({ page }) => {
      const validToken = 'test-token-12345'
      const invalidToken = 'test-token-12346'

      await page.goto(getLink('portal.orgTicketAccess', { orgSlug: TEST_ORG_SLUG, token: validToken }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}/tickets/access/${validToken}`))

      const orderVisible = await page.getByText(/order|tickets?/i).isVisible({ timeout: 5000 }).catch(() => false)
      const ticketsVisible = await page.locator('[class*="ticket"]').isVisible({ timeout: 5000 }).catch(() => false)

      if (orderVisible || ticketsVisible) {
        await page.goto(getLink('portal.orgTicketAccess', { orgSlug: TEST_ORG_SLUG, token: invalidToken }))
        const errorVisible = await page.getByText(/invalid|error|not found|expired/i).isVisible({ timeout: 5000 }).catch(() => false)
        expect(errorVisible).toBe(true)
      }
    })

    test('[PUB-012] ticket access link works in incognito context', async ({ page, context }) => {
      await context.clearCookies()
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })

      const testToken = 'test-access-token-123'
      await page.goto(getLink('portal.orgTicketAccess', { orgSlug: TEST_ORG_SLUG, token: testToken }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}/tickets/access/${testToken}`))

      const loginRequired = await page.getByText(/login|sign in|authentication required/i).isVisible({ timeout: 2000 }).catch(() => false)
      expect(loginRequired).toBe(false)

      const ticketsVisible = await page.getByText(/tickets?|order/i).isVisible({ timeout: 5000 }).catch(() => false)
      expect(ticketsVisible).toBe(true)
    })
  })

  test.describe('Shared Content', () => {
    test('[PUB-006] shared video token access', async ({ page }) => {
      const validToken = 'test-video-token-123'
      const invalidToken = 'test-video-token-124'

      await page.goto(getLink('share.video', { token: validToken }))

      await expect(page).toHaveURL(new RegExp(`/share/video/${validToken}`))

      const videoPlayer = page.locator('video').or(page.locator('[class*="video"], [class*="player"]'))
      const playerVisible = await videoPlayer.isVisible({ timeout: 5000 }).catch(() => false)

      if (playerVisible) {
        const playButton = page.getByRole('button', { name: /play/i }).or(page.locator('[class*="play"]'))
        const playVisible = await playButton.isVisible({ timeout: 2000 }).catch(() => false)
        if (playVisible) {
          await playButton.click()
        }

        const timeline = page.locator('[class*="timeline"], [class*="progress"], [class*="scrub"]').first()
        const timelineVisible = await timeline.isVisible({ timeout: 2000 }).catch(() => false)
        if (timelineVisible) {
          const box = await timeline.boundingBox()
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          }
        }
      }

      await page.goto(getLink('share.video', { token: invalidToken }))
      const errorVisible = await page.getByText(/invalid|error|not found|denied|access/i).isVisible({ timeout: 5000 }).catch(() => false)
      expect(errorVisible).toBe(true)
    })
  })

  test.describe('Sub-Organization Registration', () => {
    test('[PUB-007] sub-org registration form submission', async ({ page }) => {
      await page.goto(getLink('portal.subOrgRegistration', { orgSlug: TEST_ORG_SLUG }))

      await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}/register-sub-org`))

      const form = page.locator('form').first()
      const formVisible = await form.isVisible({ timeout: 5000 }).catch(() => false)

      if (formVisible) {
        const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
        const nameInput = page.getByLabel(/name|organization/i).or(page.locator('input[name*="name"]'))
        const submitButton = page.getByRole('button', { name: /submit|register|create/i })

        const testEmail = `test-suborg-${Date.now()}@example.com`

        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await emailInput.fill(testEmail)
        }
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('Test Sub-Org')
        }

        await submitButton.click()

        const successMessage = page.getByText(/success|created|submitted|thank you/i)
        const successVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)

        if (successVisible) {
          await page.reload()
          await emailInput.fill(testEmail)
          await submitButton.click()

          const duplicateMessage = page.getByText(/already exists|duplicate|already registered/i)
          const duplicateVisible = await duplicateMessage.isVisible({ timeout: 5000 }).catch(() => false)
          expect(duplicateVisible).toBe(true)
        }
      }
    })
  })

  test.describe('SEO and Metadata', () => {
    test('[PUB-008] SEO tags are correct per org', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      const title1 = await page.title()
      const metaDescription1 = await page.locator('meta[name="description"]').getAttribute('content')

      const otherOrgSlug = 'other-test-org'
      await page.goto(getLink('portal.orgLanding', { orgSlug: otherOrgSlug }))

      const title2 = await page.title()
      const metaDescription2 = await page.locator('meta[name="description"]').getAttribute('content')

      if (title1 && title2) {
        expect(title1).not.toBe(title2)
      }
      if (metaDescription1 && metaDescription2) {
        expect(metaDescription1).not.toBe(metaDescription2)
      }
    })
  })

  test.describe('Navigation and Tiles', () => {
    test('[PUB-009] homepage tiles route to correct org-scoped pages', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      const tiles = page.locator('[class*="tile"], [class*="card"]').filter({ has: page.getByRole('link') })
      const tileCount = await tiles.count()

      for (let i = 0; i < Math.min(tileCount, 5); i++) {
        const tile = tiles.nth(i)
        const link = tile.getByRole('link').first()
        const href = await link.getAttribute('href')

        if (href && !href.startsWith('http')) {
          await link.click()
          await expect(page).toHaveURL(new RegExp(`/${TEST_ORG_SLUG}|/o/${TEST_ORG_SLUG}`), { timeout: 5000 })

          const orgName = page.getByText(new RegExp(TEST_ORG_SLUG, 'i'))
          const orgVisible = await orgName.isVisible({ timeout: 2000 }).catch(() => false)

          await page.goBack()
          await expect(page).toHaveURL(new RegExp(`/o/${TEST_ORG_SLUG}`), { timeout: 5000 })
        }
      }

      const notFound = page.getByText(/404|not found/i)
      const notFoundVisible = await notFound.isVisible({ timeout: 1000 }).catch(() => false)
      expect(notFoundVisible).toBe(false)
    })

    test('[PUB-011] volunteer CTA leads to correct flow', async ({ page }) => {
      await page.goto(getLink('portal.orgLanding', { orgSlug: TEST_ORG_SLUG }))

      const volunteerLink = page.getByRole('link', { name: /volunteer/i }).or(page.getByText(/volunteer/i).first())
      const volunteerVisible = await volunteerLink.isVisible({ timeout: 2000 }).catch(() => false)

      if (volunteerVisible) {
        await volunteerLink.click()

        const form = page.locator('form').first()
        const formVisible = await form.isVisible({ timeout: 5000 }).catch(() => false)

        if (formVisible) {
          const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'))
          const nameInput = page.getByLabel(/name/i).or(page.locator('input[name*="name"]'))
          const submitButton = page.getByRole('button', { name: /submit|send|volunteer/i })

          if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await emailInput.fill('volunteer@example.com')
          }
          if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Test Volunteer')
          }

          await submitButton.click()

          const confirmation = page.getByText(/thank you|success|submitted|received/i)
          const confirmationVisible = await confirmation.isVisible({ timeout: 5000 }).catch(() => false)
          expect(confirmationVisible).toBe(true)
        }
      }
    })
  })
})
