import type { FieldDefinition, WhenRule } from './fields'

export type VisibilityContext = {
  /** Slugs of the categories the project is entered in (non-withdrawn entries). */
  categories: readonly string[]
  /** Answers by field key. For `field` rules, use resolved answers (see resolveAnswers). */
  answers: Readonly<Record<string, unknown>>
}

/** Evaluates a `when` rule. The one function the form and the server both use. */
export function evaluateWhen(
  rule: WhenRule | undefined,
  ctx: VisibilityContext,
): boolean {
  if (!rule) return true
  if ('categories' in rule) {
    const { any, anyExcept } = rule.categories
    if (any) return ctx.categories.some((c) => any.includes(c))
    if (anyExcept) return ctx.categories.some((c) => !anyExcept.includes(c))
    return false
  }
  return ctx.answers[rule.field.key] === rule.field.equals
}

export function isFieldVisible(field: FieldDefinition, ctx: VisibilityContext): boolean {
  return evaluateWhen(field.when, ctx)
}

/** The value `forced` imposes on a field right now, if any. */
export function forcedValue(
  field: FieldDefinition,
  ctx: VisibilityContext,
): { forced: true; value: unknown } | { forced: false } {
  if (field.forced && evaluateWhen(field.forced.when, ctx)) {
    return { forced: true, value: field.forced.value }
  }
  return { forced: false }
}

/**
 * Applies defaults and forced values, and drops answers of hidden fields, in definition order
 * (so a field depending on another one sees that one's resolved value, and a hidden
 * dependency counts as unset). Returns the visible field keys and the resolved answers.
 */
export function resolveAnswers(
  fields: readonly FieldDefinition[],
  categories: readonly string[],
  answers: Readonly<Record<string, unknown>>,
): { visible: FieldDefinition[]; answers: Record<string, unknown> } {
  const resolved: Record<string, unknown> = {}
  const visible: FieldDefinition[] = []
  for (const field of fields) {
    const ctx = { categories, answers: resolved }
    if (!isFieldVisible(field, ctx)) continue
    visible.push(field)
    const forced = forcedValue(field, ctx)
    let value = answers[field.key]
    if (forced.forced) value = forced.value
    else if (value === undefined && field.default !== undefined) value = field.default
    if (value !== undefined) resolved[field.key] = value
  }
  return { visible, answers: resolved }
}
