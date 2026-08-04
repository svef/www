import { is } from './is'
import { en } from './en'

export const LOCALES = ['is', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'is'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

const dictionaries = { is, en } as const
export type Dictionary = typeof is

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}
