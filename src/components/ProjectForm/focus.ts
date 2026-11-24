/**
 * Takes the person to a field (or, failing that, a section): scrolls it into view and
 * focuses its first usable control. Used by the review's "what's missing" links, which
 * are real `#field-…` anchors too, so they still work without this.
 */
export function goToField(target: { fieldKey?: string; section: string }): void {
  const el =
    (target.fieldKey && document.getElementById(`field-${target.fieldKey}`)) ||
    document.getElementById(`section-${target.section}`)
  if (!el) return
  const control = el.querySelector<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
  )
  el.scrollIntoView({ block: 'center' })
  ;(control ?? el).focus({ preventScroll: true })
}
