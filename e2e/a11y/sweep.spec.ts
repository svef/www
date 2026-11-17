import { expect, test } from '@playwright/test'
import { everyPage, LOCALES, settle, urlFor } from '../pages'

// Checks axe cannot make: how the page behaves under the settings and devices that a
// rule-based scan never tries. Each one came out of the #135 accessibility sweep.

test.describe('label in name (WCAG 2.5.3)', () => {
  for (const locale of LOCALES) {
    for (const width of [1440, 390]) {
      test(`${locale} @${width}: the language link's name contains what it shows`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(urlFor(locale, ''))
        const link = page
          .locator(`a[hreflang="${locale === 'is' ? 'en' : 'is'}"]`)
          .first()
        // On a phone the link lives in the menu, which is closed; its name is still in the tree.
        const name = await link.evaluate((el) => el.textContent ?? '')
        const target = locale === 'is' ? 'EN' : 'IS'
        expect(name.trimStart().startsWith(target)).toBe(true)
        // What is drawn is IS and/or EN, in a node hidden from assistive technology.
        const drawn = await link.locator('[aria-hidden="true"]').allTextContents()
        expect(drawn.join(' ')).toMatch(/\b(IS|EN)\b/)
      })
    }
  }
})

test.describe('reflow (WCAG 1.4.10)', () => {
  // 320px is the criterion's width; 720px is a 1440px window at 200% zoom.
  for (const width of [320, 720]) {
    for (const { locale, page: spec, url } of everyPage()) {
      if (locale !== 'is' && !['home', 'events', 'about'].includes(spec.name)) continue
      test(`${locale} ${spec.name} @${width}px has no horizontal scroll`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(url)
        await settle(page)
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `${url} scrolls sideways at ${width}px`).toBeLessThanOrEqual(0)
      })
    }
  }
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  for (const path of ['', '/vidburdir', '/frettir', '/myndir', '/um-svef']) {
    test(`${path || 'home'}: nothing animates and nothing is held back`, async ({
      page,
    }) => {
      await page.goto(urlFor('is', path))
      await settle(page)
      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 700)
        await page.waitForTimeout(100)
      }
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map(
            (a) =>
              (a as CSSAnimation).animationName ??
              (a as CSSTransition).transitionProperty,
          ),
      )
      expect(running, 'animations still running under prefers-reduced-motion').toEqual([])

      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll('main h1, main h2, main p, main time')]
          .filter((el) => {
            let opacity = 1
            for (let n: Element | null = el; n; n = n.parentElement) {
              opacity *= Number(getComputedStyle(n).opacity)
            }
            // below 0.6 is an entrance that never finished; deliberate dimming sits above it
            return opacity < 0.6 && (el as HTMLElement).offsetParent !== null
          })
          .map((el) => el.textContent?.trim().slice(0, 30)),
      )
      expect(hidden, 'content left transparent with motion reduced').toEqual([])
    })
  }
})

test.describe('visible focus', () => {
  for (const [width, path] of [
    [1440, '/um-svef'],
    [390, '/vidburdir'],
  ] as const) {
    test(`@${width} ${path}: every tab stop is visible and shows a focus ring`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(urlFor('is', path))
      await settle(page)
      const problems: string[] = []
      for (let i = 0; i < 60; i += 1) {
        await page.keyboard.press('Tab')
        const stop = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return null
          const cs = getComputedStyle(el)
          const box = el.getBoundingClientRect()
          return {
            name: (el.getAttribute('aria-label') ?? el.textContent ?? '')
              .trim()
              .slice(0, 30),
            hidden:
              !!el.closest('[aria-hidden="true"],[inert],[hidden]') ||
              cs.visibility !== 'visible',
            empty: box.width === 0 || box.height === 0,
            ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
          }
        })
        if (!stop) break // past the last control, back to the browser
        if (stop.hidden || stop.empty) problems.push(`hidden stop: ${stop.name}`)
        else if (!stop.ring) problems.push(`no focus ring: ${stop.name}`)
      }
      expect(problems).toEqual([])
    })
  }
})
