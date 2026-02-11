import { test, expect, Page } from '@playwright/test'
import { getLink } from '../../src/utils/routes'

// ============================================
// Page Object: Calendar
// ============================================

class CalendarPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(getLink('portal.calendar'))
  }

  async gotoEventDetail(eventId: string) {
    await this.page.goto(getLink('portal.eventDetail', { eventId }))
  }

  get loadingSpinner() {
    return this.page.getByRole('progressbar')
  }

  get calendarTitle() {
    return this.page.getByRole('heading', { name: /calendar/i })
  }

  get eventCards() {
    return this.page.getByRole('button', { name: /.+/ }).filter({
      has: this.page.locator('[class*="pa-card"]'),
    })
  }

  get agendaViewButton() {
    return this.page.getByRole('button', { name: /agenda/i }).first()
  }

  get monthViewButton() {
    return this.page.getByRole('button', { name: /month/i }).first()
  }

  get emptyState() {
    return this.page.getByText(/no events|get started|upcoming/i)
  }

  get createEventButton() {
    return this.page.getByRole('button', { name: /create|add|new event/i }).first()
  }

  async waitForLoad() {
    await expect(this.loadingSpinner).toBeHidden({ timeout: 10000 })
  }
}

// ============================================
// Tests
// ============================================

test.describe('Calendar', () => {
  let calendarPage: CalendarPage

  test.beforeEach(async ({ page }) => {
    calendarPage = new CalendarPage(page)
  })

  test.describe('authentication', () => {
    test('redirects unauthenticated user to login when visiting calendar', async ({ page }) => {
      await calendarPage.goto()
      await expect(page).toHaveURL(/\/portal\/login/)
    })

    test('login page has email and password fields', async ({ page }) => {
      await page.goto(getLink('auth.login'))
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /continue|signing in/i })).toBeVisible()
    })
  })

  test.describe('login page accessibility', () => {
    test('login form is keyboard accessible', async ({ page }) => {
      await page.goto(getLink('auth.login'))
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/password/i)
      await expect(emailInput).toBeVisible()
      await emailInput.focus()
      await expect(emailInput).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(passwordInput).toBeFocused()
    })
  })
})
