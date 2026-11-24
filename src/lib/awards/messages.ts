import type { Localized } from './types'

/** Error codes the validators produce. The UI picks a language; `{max}` / `{min}` are filled in. */
export const ERROR_MESSAGES = {
  required: { is: 'Þennan reit þarf að fylla út.', en: 'This field is required.' },
  invalid: { is: 'Gildið er ógilt.', en: 'This value is not valid.' },
  invalidType: { is: 'Gildið er ógilt.', en: 'This value is not valid.' },
  tooLong: {
    is: 'Má vera að hámarki {max} stafir.',
    en: 'Must be at most {max} characters.',
  },
  tooFewItems: { is: 'Bættu við að minnsta kosti {min}.', en: 'Add at least {min}.' },
  invalidUrl: {
    is: 'Settu inn gildan tengil sem byrjar á http:// eða https://.',
    en: 'Enter a valid link starting with http:// or https://.',
  },
  invalidEmail: { is: 'Settu inn gilt netfang.', en: 'Enter a valid email address.' },
  invalidDate: { is: 'Settu inn gilda dagsetningu.', en: 'Enter a valid date.' },
  invalidDateRange: {
    is: 'Lokadagur má ekki vera á undan upphafsdegi.',
    en: 'The end date can’t be before the start date.',
  },
  mustAccept: { is: 'Þú verður að samþykkja þetta.', en: 'You need to accept this.' },
  forcedValue: {
    is: 'Þessu gildi er ekki hægt að breyta fyrir valda flokka.',
    en: 'This value can’t be changed for the selected categories.',
  },
  emailRequiredForEditor: {
    is: 'Netfang þarf til að bjóða einhverjum að breyta.',
    en: 'An email is needed to invite someone to edit.',
  },
  kennitalaFormat: { is: 'Kennitala er 10 tölustafir.', en: 'A kennitala is 10 digits.' },
  kennitalaInvalid: { is: 'Kennitalan er ógild.', en: 'This kennitala is not valid.' },
  imageDimensions: {
    is: 'Myndin er {actual} en þarf að vera {expected}.',
    en: 'This image is {actual}, it needs to be {expected}.',
  },
  imageType: {
    is: 'Myndin þarf að vera PNG eða JPG.',
    en: 'The image must be a PNG or JPG.',
  },
  imageSize: {
    is: 'Myndin má vera að hámarki {max} MB.',
    en: 'The image can be at most {max} MB.',
  },
} as const satisfies Record<string, Localized>

export type ErrorCode = keyof typeof ERROR_MESSAGES

export function formatError(
  code: string,
  params: Record<string, string | number> = {},
): Localized {
  const base =
    (ERROR_MESSAGES as Record<string, Localized>)[code] ?? ERROR_MESSAGES.invalid
  const fill = (s: string) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
  return { is: fill(base.is), en: fill(base.en) }
}
