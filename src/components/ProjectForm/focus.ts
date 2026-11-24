/**
 * The project form shows one step at a time, so a link to a field in another step (the
 * review's "what's missing", a staff request's field list) has to switch steps first. The
 * form listens for this event, switches, and focuses the target itself; it cancels the
 * event to say so. Outside the form nothing listens, and the target is focused directly.
 */
export const GO_TO_EVENT = 'projectform:goto'

export type GoToTarget = { fieldKey?: string; section: string }

/**
 * Takes the person to a field (or, failing that, a section): switches to its step, scrolls
 * it into view and focuses its first usable control. The links that call this are real
 * `#field-…` anchors too, so they still work without it.
 */
export function goToField(target: GoToTarget): void {
  const handled = !window.dispatchEvent(
    new CustomEvent<GoToTarget>(GO_TO_EVENT, { detail: target, cancelable: true }),
  )
  if (!handled) focusTarget(target)
}

/** The element a target points at: the field, or its section. */
export function targetElement(target: GoToTarget): HTMLElement | null {
  return (
    (target.fieldKey && document.getElementById(`field-${target.fieldKey}`)) ||
    document.getElementById(`section-${target.section}`)
  )
}

/** Focuses a target that is already on screen (its step is the current one). */
export function focusTarget(target: GoToTarget): void {
  const el = targetElement(target)
  if (el) focusWithin(el)
}

/** Scrolls an element into view and focuses its first usable control (or itself). */
export function focusWithin(el: HTMLElement): void {
  // A field inside a collapsed <details> (the category pitch) is opened first.
  const details = el.closest('details')
  if (details && !details.open) details.open = true
  const control = el.querySelector<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
  )
  el.scrollIntoView({ block: 'center' })
  ;(control ?? el).focus({ preventScroll: true })
}
