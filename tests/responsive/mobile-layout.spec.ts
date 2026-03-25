import { expect, test } from '@playwright/test'

const ROUTES = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/reset-password',
  '/dashboard',
  '/assess',
  '/chat',
  '/profile',
] as const

test.describe('responsive layout guard', () => {
  for (const route of ROUTES) {
    test(`no horizontal overflow on ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      // Let intro animations and async UI settle to catch post-load overflow.
      await page.waitForTimeout(300)

      const metrics = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement
        const viewportWidth = window.innerWidth
        const docWidth = Math.max(root.scrollWidth, document.documentElement.scrollWidth, document.body.scrollWidth)

        return { viewportWidth, docWidth }
      })

      const overBy = metrics.docWidth - metrics.viewportWidth
      expect(overBy, `Page overflowed by ${overBy}px on route: ${route}`).toBeLessThanOrEqual(1)
    })
  }
})
