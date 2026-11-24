import { expect, type Page } from '@playwright/test'

/**
 * The project form shows one step at a time (a stepper across the top). These open a step
 * the way a person does, by its link in the stepper, and wait until it is the one on screen.
 */
export const stepper = (page: Page) =>
  page.getByRole('navigation', { name: /^(Sections|Hlutar)$/ })

export const stepLink = (page: Page, title: string) =>
  stepper(page).getByRole('link', { name: new RegExp(`^${title}`) })

/** The section on screen now. */
export const currentStep = (page: Page) => page.locator('section[data-step]:not([hidden])')

export async function goToStep(page: Page, title: string) {
  await stepLink(page, title).click()
  await expect(currentStep(page).locator('h2')).toHaveText(title)
}
