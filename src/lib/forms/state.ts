/**
 * The shape a form action returns, kept out of the `'use server'` module.
 *
 * A file marked `'use server'` may only export async functions — every export
 * becomes a callable server endpoint, so a plain object is rejected outright at
 * build time. The constant and the types therefore live here, where both the
 * action and the client components can import them.
 */

export type FieldErrors = Record<string, string>

export interface FormState {
  status: 'idle' | 'success' | 'error'
  /** Field name to error *key*, looked up in the dictionary by the form. */
  errors?: FieldErrors
}

export const EMPTY_STATE: FormState = { status: 'idle' }
