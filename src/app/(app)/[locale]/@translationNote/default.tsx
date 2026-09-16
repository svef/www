/**
 * No note for routes that have not opted into one.
 *
 * Every page under `[locale]` fills this slot; a page whose content is not
 * localized through Payload has nothing to say here, and `default.tsx` is what
 * Next renders for it.
 */
export default function NoTranslationNote() {
  return null
}
