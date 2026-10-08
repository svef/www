import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Archivo, Overpass_Mono } from 'next/font/google'
import { Header } from '@/components/Header/Header'
import { Footer } from '@/components/Footer/Footer'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import { getDictionary, isLocale, LOCALES } from '@/lib/i18n'
import { getSiteChrome } from '@/lib/content/site-settings'
import { getSiteUrl } from '@/lib/site-url'
import { Analytics } from '@/components/Analytics/Analytics'
import { NavigationProgress } from '@/components/NavigationProgress/NavigationProgress'
import '@mantine/core/styles.css'
import '@/styles/globals.scss'

// Archivo carries body and headings alike. The Figma specifies Interstate, which
// is commercial; Archivo is the closest open substitute and reads correctly at
// both text and display sizes. It replaced Noto Sans and Overpass on the landing
// page first, and this brings the full site in line.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

// The design sets small uppercase labels — eyebrows, album meta, the share row —
// in Overpass Mono. Nothing loaded a mono face before, so all of them fell back
// to the body font and quietly stopped reading as labels.
const mono = Overpass_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'SVEF — Samtök vefiðnaðarins', template: '%s | SVEF' },
  description: 'Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.',
  metadataBase: new URL(getSiteUrl()),
}

// The layout reads the `site-settings` global for the footer, so it is a route
// segment that touches Payload and takes the site's revalidation window like
// any other. See "Rendering: static plus ISR" in CLAUDE.md.
export const revalidate = 300

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getDictionary(locale)
  // Every page sits under an explicit locale prefix now — Icelandic included —
  // so this is no longer "empty for the default locale".
  const base = `/${locale}`
  const navItems = [
    { href: `${base}/vefverdlaunin`, label: t.nav.awards },
    { href: `${base}/vidburdir`, label: t.nav.events },
    { href: `${base}/frettir`, label: t.nav.news },
    { href: `${base}/um-svef`, label: t.nav.about },
    { href: `${base}/skraning`, label: t.nav.membership },
  ]
  const chrome = await getSiteChrome(locale)

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${mono.variable}`}
      style={{
        ['--font-body' as string]: 'var(--font-archivo)',
        ['--font-heading' as string]: 'var(--font-archivo)',
      }}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="dark">
          <NavigationProgress />
          <a href="#main" className="skip-link">
            {t.skipToContent}
          </a>
          <Header
            homeHref={base || '/'}
            navItems={navItems}
            menuLabel={t.nav.menu}
            navLabel={t.nav.primary}
            locale={locale}
          />
          {/*
            The fallback-language note is *not* rendered here. It belongs
            inside `<main>`, as the page's own first child, so the skip link
            lands before it — a skip-link user is exactly the reader who needs
            to be told the page is showing Icelandic, and a note above `<main>`
            is the one thing they would jump straight past. See
            `TranslationNote`.
          */}
          <main id="main">{children}</main>
          {/*
            The dictionary's sentence is the empty-database fallback only: both
            languages are seeded into the global, and an untranslated blurb
            falls back to Icelandic and is marked with `lang` like any other
            fallback copy. See the note on `SiteChrome.footerBlurb`.
          */}
          <Footer
            blurb={chrome.footerBlurb ?? t.footer.blurb}
            blurbLang={
              chrome.footerBlurb && chrome.footerBlurbLocale !== locale
                ? chrome.footerBlurbLocale
                : undefined
            }
            email={chrome.contactEmail}
            socials={chrome.socials}
            year={2026}
          />
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  )
}
