import fieldsJson from './data/fields-2026.json'
import type { Localized } from './types'

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'url'
  | 'url_list'
  | 'boolean'
  | 'access_credentials'
  | 'date_range'
  | 'image'
  | 'person_list'
  | 'waiver'

export type FieldScope = 'project' | 'entry'
export type FieldVisibility = 'admin' | 'judges' | 'public'

/** Visibility rule: exactly one of the three forms is present. */
export type WhenRule =
  | { categories: { any: string[]; anyExcept?: undefined } }
  | { categories: { anyExcept: string[]; any?: undefined } }
  | { field: { key: string; equals: unknown } }

export type PersonItemFieldDefinition = {
  label: Localized
  type: 'short_text' | 'email'
  required: boolean
  maxLength?: number
}

export type FieldDefinition = {
  key: string
  scope: FieldScope
  type: FieldType
  label: Localized
  description?: Localized
  tooltip?: Localized
  required: boolean
  visibility: FieldVisibility
  editableAfterSubmit: boolean
  maxLength?: number
  minItems?: number
  when?: WhenRule
  default?: unknown
  /** The value is forced (and unchangeable) while `when` holds. */
  forced?: { value: unknown; when: WhenRule }
  encrypted?: boolean
  /** person_list: the item sub-fields, keyed by name. */
  item?: Record<string, PersonItemFieldDefinition>
  /** image: constraints checked on the server as well. */
  validation?: { width: number; height: number; types: string[]; maxBytes: number }
  termsVersion?: string | null
}

export const FIELD_DEFINITIONS: readonly FieldDefinition[] = (
  fieldsJson as unknown as { fields: FieldDefinition[] }
).fields

const BY_KEY = new Map(FIELD_DEFINITIONS.map((f) => [f.key, f]))

export function getField(key: string): FieldDefinition {
  const field = BY_KEY.get(key)
  if (!field) throw new Error(`Unknown field: ${key}`)
  return field
}

export const PROJECT_FIELDS = FIELD_DEFINITIONS.filter((f) => f.scope === 'project')
export const ENTRY_FIELDS = FIELD_DEFINITIONS.filter((f) => f.scope === 'entry')
