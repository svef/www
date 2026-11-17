import type { Locale } from '@/lib/i18n'
import { resolveStickers } from '@/lib/stickers/resolve'
import type { BandName, StickerPage } from '@/lib/stickers/placements'
import { Sticker } from './Sticker'

interface PageStickersProps {
  page: StickerPage
  /**
   * Only the stickers on this band. Left out: all of the page's. A page with stickers on
   * several bands renders each band's inside that band.
   */
  band?: BandName
  /** The locale, for stickers whose copy is text. */
  locale: Locale
}

/**
 * Renders a page's stickers from the placement data (`lib/stickers/placements`). The
 * stickers are absolutely positioned, so put this inside the band they sit on (which must
 * be `position: relative`):
 *
 *     <header className="band" style={{ position: 'relative' }}>
 *       <PageStickers page="vidburdir" band="header" locale={locale} />
 *       …
 *     </header>
 *
 * `page="footer"` is the shared footer band's sticker, on every page.
 */
export function PageStickers({ page, band, locale }: PageStickersProps) {
  return resolveStickers(page, band).map((s) => {
    const common = {
      position: s.position,
      rotate: s.rotate,
      speed: s.speed,
      mobile: s.mobile,
    }
    return s.kind === 'artwork' ? (
      <Sticker key={s.id} kind="artwork" art={s.art} recolor={s.recolor} {...common} />
    ) : (
      <Sticker
        key={s.id}
        kind="text"
        copy={s.copy}
        locale={locale}
        tone={s.recolor ?? s.tone}
        {...common}
      />
    )
  })
}
