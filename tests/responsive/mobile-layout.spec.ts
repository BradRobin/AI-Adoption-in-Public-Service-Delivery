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
      // waitUntil: 'domcontentloaded' avoids ERR_ABORTED on auth redirects and
      // 'networkidle' timeouts on pages with Supabase realtime connections.
      await page.goto(route, { waitUntil: 'domcontentloaded' })

      // Let intro animations and async UI settle to catch post-load overflow.
      await page.waitForTimeout(500)

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
