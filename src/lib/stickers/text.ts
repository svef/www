/**
 * Text stickers: the brand's die-cut label, a black base with a stepped colour block,
 * its words in Icelandic or English. The locale picks the copy at render time; there is
 * no dictionary swap on the client.
 *
 * Which of the three label layouts a copy gets is the export's `stickerHTML` heuristic,
 * kept as a pure function so it can be tested.
 */
import type { Locale } from '@/lib/i18n'

/** The colour of the stepped block (`--sc`) and, with it, the text colour on it. */
export type StickerTone = 'yellow' | 'pink' | 'violet' | 'red'

export interface StickerCopy {
  /** The words, one entry per line break. */
  lines: string[]
  /** A second, smaller line ("I am a developer"). Turns the sticker into the label-and-block layout. */
  sub?: string
}

export type LocalizedCopy = Record<Locale, StickerCopy>

export type TextLayout =
  /** A label strip on top, the coloured block with the line below ("Trust me / I am a developer"). */
  | { kind: 'strip-block'; strip: string; block: string[]; upper: boolean }
  /** A word, the coloured stepped block, a word ("Cool / thing"). */
  | { kind: 'word-block-word'; top: string; bottom: string }
  /** The block with the text in it ("This could have been an email"). */
  | { kind: 'block'; lines: string[] }

/** Joined copy shorter than this, in two lines, gets the word-block-word layout. */
export const SHORT_COPY_LENGTH = 24

export function textLayout(copy: StickerCopy): TextLayout {
  const lines = copy.lines.map((l) => l.trim()).filter(Boolean)
  const sub = copy.sub?.trim()
  if (sub) {
    // The first two words go on one line, the rest on the next.
    const m = /^(\S+\s\S+)\s(.+)$/.exec(sub)
    return {
      kind: 'strip-block',
      strip: lines.join(' '),
      block: m ? [m[1], m[2]] : [sub],
      upper: false,
    }
  }
  if (lines.length === 2 && lines.join(' ').length < SHORT_COPY_LENGTH) {
    return { kind: 'word-block-word', top: lines[0], bottom: lines[1] }
  }
  if (lines.length >= 3) {
    return { kind: 'strip-block', strip: lines[0], block: lines.slice(1), upper: true }
  }
  return { kind: 'block', lines }
}

/** The export's copy for each sticker, for placements that use the text form. */
export const TEXT_STICKERS = {
  'trust-me-developer': {
    is: { lines: ['Treystu mér'], sub: 'Ég er forritari' },
    en: { lines: ['Trust me'], sub: 'I am a developer' },
  },
  'trust-me-designer': {
    is: { lines: ['Treystu mér'], sub: 'Ég er hönnuður' },
    en: { lines: ['Trust me'], sub: 'I am a designer' },
  },
  cool: {
    is: { lines: ['Algjör', 'snilld'] },
    en: { lines: ['Cool', 'thing'] },
  },
  'needs-sparkles': {
    is: { lines: ['Þetta vantar', 'glimmer'] },
    en: { lines: ['This needs', 'sparkles'] },
  },
  'trend-alert': {
    is: { lines: ['Tísku', 'viðvörun'] },
    en: { lines: ['Trend', 'alert'] },
  },
  'developer-friendly': {
    is: { lines: ['Forritara', 'vænt'] },
    en: { lines: ['Developer', 'friendly'] },
  },
  'love-design-system': {
    is: { lines: ['Ég elska', 'hönnunar-', 'kerfið þitt'] },
    en: { lines: ['I love', 'your design', 'system'] },
  },
  'could-have-been-email': {
    is: { lines: ['Þetta hefði getað', 'verið tölvupóstur'] },
    en: { lines: ['This could have', 'been an email'] },
  },
  'not-accessible': {
    is: { lines: ['Djörf', 'skref'] },
    en: { lines: ['Bold', 'moves'] },
  },
} satisfies Record<string, LocalizedCopy>

export type TextStickerName = keyof typeof TEXT_STICKERS
