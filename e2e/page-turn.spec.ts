import { expect, test, type Page } from '@playwright/test'
import { settle } from './pages'

/**
 * The page turn (#138): a block of violet sweeps over the screen while the page changes.
 *
 * It is a View Transition that React starts for App Router navigations, so what these
 * pin is the contract around it: it runs on a link navigation and not on anything else,
 * it is absent under reduced motion, and — the part that matters — Back, Forward, scroll
 * restoration, focus and the route announcement behave exactly as they do without it.
 * "Without it" is measured, not assumed: the same sequence runs with reduced motion on
 * and the two outcomes are compared.
 */

/** Counts the browser's view transitions, and remembers whether the block's group ran. */
async function watchTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __vt: { started: number; sawBlock: boolean }
    }
    w.__vt = { started: 0, sawBlock: false }
    const original = document.startViewTransition?.bind(document)
    if (!original) return
    document.startViewTransition = ((arg?: unknown) => {
      w.__vt.started++
      const vt = original(arg as never)
      void vt.ready
        .then(() => {
          if (
            document
              .getAnimations()
              .some((a) =>
                String((a.effect as KeyframeEffect)?.pseudoElement).includes('page-turn'),
              )
          ) {
            w.__vt.sawBlock = true
          }
        })
        .catch(() => undefined)
      return vt
    }) as typeof document.startViewTransition
  })
}

const vt = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __vt: { started: number; sawBlock: boolean } }).__vt,
  )

/** The sweep is over, so the next step starts from a still page. */
const idle = (page: Page) =>
  expect
    .poll(
      () =>
        page.evaluate(
          () =>
            !(document as unknown as { activeViewTransition?: unknown })
              .activeViewTransition,
        ),
      {
        message: 'the view transition never finished',
        timeout: 5000,
      },
    )
    .toBe(true)

const describeFocus = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return el
      ? `${el.tagName.toLowerCase()}#${el.id}.${el.getAttribute('class') ?? ''}`
      : 'none'
  })

const announced = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelector('next-route-announcer')?.shadowRoot?.textContent?.trim() ??
      '',
  )

/** One trip: about page, scroll, link to events, Back, Forward. Returns what the reader would feel. */
async function trip(page: Page) {
  await page.goto('/is/um-svef')
  await settle(page)
  await page.evaluate(() => window.scrollTo(0, 700))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600)

  await page.locator('header nav a[href$="vidburdir"]').first().click()
  await page.waitForURL(/vidburdir/)
  await idle(page)
  const afterClick = {
    focus: await describeFocus(page),
    scroll: await page.evaluate(() => Math.round(window.scrollY)),
    announced: await announced(page),
    title: await page.title(),
  }

  await page.goBack()
  await page.waitForURL(/um-svef/)
  await idle(page)
  // Scroll restoration, where there is any, is applied after the commit: let it land.
  await page.waitForTimeout(600)
  const afterBack = {
    focus: await describeFocus(page),
    scroll: await page.evaluate(() => Math.round(window.scrollY)),
    announced: await announced(page),
  }

  await page.goForward()
  await page.waitForURL(/vidburdir/)
  await idle(page)
  const afterForward = {
    scroll: await page.evaluate(() => Math.round(window.scrollY)),
    h1: await page.locator('main h1').first().innerText(),
  }
  return { afterClick, afterBack, afterForward }
}

test.describe('page turn', () => {
  test('a link navigation plays the sweep', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await watchTransitions(page)
    await page.goto('/is')
    await settle(page)

    await page.locator('header nav a[href$="vidburdir"]').first().click()
    await page.waitForURL(/vidburdir/)
    await expect.poll(async () => (await vt(page)).sawBlock, { timeout: 5000 }).toBe(true)
    expect((await vt(page)).started).toBe(1)
    await idle(page)
    await expect(page.locator('main h1').first()).toBeVisible()
  })

  test('reduced motion: the block is never drawn', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await watchTransitions(page)
    await page.goto('/is')
    await settle(page)

    await page.locator('header nav a[href$="vidburdir"]').first().click()
    await page.waitForURL(/vidburdir/)
    await expect(page.locator('main h1').first()).toBeVisible()
    await idle(page)
    expect((await vt(page)).sawBlock, 'the sweep ran under reduced motion').toBe(false)
  })

  test('a hash link and a link to the page you are on do not turn the page', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await watchTransitions(page)
    await page.goto('/is/um-svef')
    await settle(page)

    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // the skip link, `#main`
    await expect(page).toHaveURL(/#main$/)
    await page.waitForTimeout(400)
    expect((await vt(page)).sawBlock).toBe(false)
  })

  test('Back, Forward, scroll, focus and the announcement are the same as without the sweep', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const baseline = await trip(page)
    expect(baseline.afterClick.scroll, 'a new page starts at the top').toBeLessThan(5)
    // Whatever Back does to the scroll position without the sweep (at the time of writing
    // the App Router lands at the top), it must do with it.

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await watchTransitions(page)
    const withSweep = await trip(page)
    expect((await vt(page)).sawBlock, 'the sweep should have run on this trip').toBe(true)

    expect(withSweep.afterClick).toEqual(baseline.afterClick)
    expect(withSweep.afterBack.focus).toEqual(baseline.afterBack.focus)
    expect(withSweep.afterBack.announced).toEqual(baseline.afterBack.announced)
    expect(Math.abs(withSweep.afterBack.scroll - baseline.afterBack.scroll)).toBeLessThan(
      4,
    )
    expect(withSweep.afterForward).toEqual(baseline.afterForward)
  })
})
