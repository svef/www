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
import { getDictionary, isLocale, localePath, LOCALES } from '@/lib/i18n'
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
  // Built through `localePath` rather than by hand: pages are named in the
  // reader's language, so an English nav has to link to /en/events, not
  // /en/vidburdir — which exists, but only as a redirect to it.
  const navItems = [
    // Events first: the programme is what a visitor is most often here for.
    { href: localePath('/vidburdir', locale), label: t.nav.events },
    { href: localePath('/vefverdlaunin', locale), label: t.nav.awards },
    { href: localePath('/frettir', locale), label: t.nav.news },
    {
      href: localePath('/um-svef', locale),
      label: t.nav.about,
      // The pages split out of About SVEF in #103. Web Awards gets a submenu
      // of its own next, which is why this is a property of an item rather
      // than a special case in the header.
      children: [
        { href: localePath('/stjorn', locale), label: t.about.boardTitle },
        { href: localePath('/log-svef', locale), label: t.about.bylawsTitle },
        { href: localePath('/spurt-og-svarad', locale), label: t.about.faqTitle },
      ],
    },
    { href: localePath('/skraning', locale), label: t.nav.membership },
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
            homeHref={`/${locale}`}
            navItems={navItems}
            menuLabel={t.nav.menu}
            submenuLabel={t.nav.submenu}
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
            contactHref={localePath('/hafa-samband', locale)}
            contactLabel={t.nav.contact}
            socials={chrome.socials}
            year={2026}
          />
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  )
}
