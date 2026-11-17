import Image from 'next/image'
import { GrowText } from '@/components/GrowText/GrowText'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { ColourSwatches, type Swatch } from './ColourSwatches'
import styles from './BrandKit.module.scss'

/** SVEF's own marks, in `public/brand/`. Ten versions of the same stepped shape. */
export const BRAND_LOGOS = Array.from(
  { length: 10 },
  (_, i) => `/brand/logo-${String(i + 1).padStart(2, '0')}.svg`,
)
/** The one the export offers as the primary mark and the download. */
const PRIMARY_LOGO = BRAND_LOGOS[1]

/**
 * The brand colours, in the export's order. Names are the brand's own and are not
 * translated; the values are the site's tokens, so a swatch cannot drift from the page.
 */
export const BRAND_COLOURS: readonly Swatch[] = [
  { name: 'Blackety black', hex: '#09060C', colour: 'var(--color-black)', onDark: true },
  { name: 'Shy white', hex: '#FCFBFE', colour: 'var(--color-white)' },
  {
    name: 'Electric violet',
    hex: '#8917E1',
    colour: 'var(--color-violet)',
    onDark: true,
  },
  { name: 'Solid red', hex: '#FF0000', colour: 'var(--accent-red)' },
  { name: 'Shocking pink', hex: '#FF0FCA', colour: 'var(--accent-pink)' },
  { name: 'Lightning yellow', hex: '#FFF511', colour: 'var(--accent-yellow)' },
]

export interface BrandKitFile {
  label: string
  url: string
  /** Pre-formatted size, e.g. "12 kB"; omitted when unknown. */
  size?: string | null
}

export interface BrandKitCopy {
  title: string
  mark: {
    title: string
    blurb: string
    primary: string
    primaryAlt: string
    variants: string
    download: string
    downloadName: string
  }
  files: { title: string }
  colours: {
    title: string
    blurb: string
    copied: string
    copyFailed: string
    copyHint: string
  }
  type: { title: string; name: string; blurb: string; website: string }
}

/**
 * The brand kit section of `/um-svef` (the export's `.brandkit`): the logo with its ten
 * versions and a download, the colour swatches with copy-to-clipboard hex codes, and the
 * typeface. `files` are extra downloads an editor uploaded to the About page in the CMS.
 *
 * This is the export's section and no more; the full press pack (#105) builds on it.
 */
export function BrandKit({
  copy,
  files = [],
}: {
  copy: BrandKitCopy
  files?: BrandKitFile[]
}) {
  return (
    <section className={styles.kit} aria-labelledby="h-brand">
      <SectionHead id="h-brand" title={copy.title} right />

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>{copy.mark.title}</h3>
        <p className={styles.desc}>{copy.mark.blurb}</p>
        <div className={styles.primary}>
          <Image
            src={PRIMARY_LOGO}
            alt={copy.mark.primaryAlt}
            width={1903}
            height={1416}
            unoptimized
          />
          <span>{copy.mark.primary}</span>
        </div>
        <ul className={styles.variants} aria-label={copy.mark.variants}>
          {BRAND_LOGOS.map((src) => (
            <li key={src}>
              <Image src={src} alt="" width={200} height={150} unoptimized />
            </li>
          ))}
        </ul>
        <div className={styles.downloads}>
          <a
            className={styles.download}
            href={PRIMARY_LOGO}
            download={copy.mark.downloadName}
          >
            <GrowText>{copy.mark.download}</GrowText>
          </a>
        </div>
        {files.length > 0 && (
          <>
            <h4 className={styles.filesTitle}>{copy.files.title}</h4>
            <ul className={styles.fileList}>
              {files.map((file) => (
                <li key={file.url}>
                  <a className={styles.fileLink} href={file.url} download>
                    {file.label}
                    {file.size && <span className={styles.fileSize}>{file.size}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>{copy.colours.title}</h3>
        <p className={styles.desc}>{copy.colours.blurb}</p>
        <ColourSwatches
          swatches={BRAND_COLOURS}
          copied={copy.colours.copied}
          copyFailed={copy.colours.copyFailed}
          hint={copy.colours.copyHint}
          label={copy.colours.title}
        />
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>{copy.type.title}</h3>
        <div className={styles.type}>
          <div className={styles.aa} aria-hidden="true">
            Aa
          </div>
          <div>
            <p className={styles.fontName}>{copy.type.name}</p>
            <p className={styles.desc}>{copy.type.blurb}</p>
            <div className={styles.weights} aria-hidden="true">
              {[200, 400, 600, 800, 900].map((w) => (
                <span key={w} style={{ '--w': w } as React.CSSProperties}>
                  Vefur
                </span>
              ))}
            </div>
            <p className={styles.note}>{copy.type.website}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
