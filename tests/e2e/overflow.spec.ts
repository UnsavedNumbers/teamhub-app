import { test, expect } from '@playwright/test'
import { getLink, RouteKeys } from '../../src/utils/routes'

const ROUTES_UNDER_TEST = [
  getLink(RouteKeys.MARKETING),
  getLink(RouteKeys.AUTH_LOGIN),
  getLink(RouteKeys.AUTH_SIGNUP),
  getLink(RouteKeys.AUTH_FORGOT_PASSWORD),
  getLink(RouteKeys.DEMO_REQUEST),
  getLink(RouteKeys.DEMO_ENTRY),
]

const VIEWPORTS = [
  { width: 320, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
]

test.describe('Horizontal Overflow Regression', () => {
  test('public and auth routes do not overflow horizontally', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport)

      for (const route of ROUTES_UNDER_TEST) {
        await test.step(`${viewport.width}px - ${route}`, async () => {
          await page.goto(route, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(200)

          const metrics = await page.evaluate(() => {
            const html = document.documentElement
            const body = document.body
            const root = document.getElementById('root')
            const widest = Math.max(html.scrollWidth, body.scrollWidth, root?.scrollWidth ?? 0)
            const viewportWidth = window.innerWidth

            const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
              .filter((el) => {
                const style = window.getComputedStyle(el)
                if (style.display === 'none' || style.visibility === 'hidden') return false
                const rect = el.getBoundingClientRect()
                return rect.left < -1 || rect.right > viewportWidth + 1
              })
              .slice(0, 8)
              .map((el) => {
                const rect = el.getBoundingClientRect()
                const className = (el.className || '')
                  .toString()
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .join('.')
                return {
                  tag: el.tagName.toLowerCase(),
                  className,
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                }
              })

            return { widest, viewportWidth, offenders }
          })

          expect(
            metrics.widest,
            `Horizontal overflow on ${route} at ${viewport.width}px. Offenders: ${JSON.stringify(metrics.offenders)}`,
          ).toBeLessThanOrEqual(metrics.viewportWidth + 1)
        })
      }
    }
  })
})
