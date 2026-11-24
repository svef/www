import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header/Header'
import { Footer } from '@/components/Footer/Footer'
import { LANDING_ONLY } from '@/lib/site-mode'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import { getDictionary, isLocale, localePath, LOCALES } from '@/lib/i18n'
import { buildNavItems, visibleFooterColumns } from '@/lib/nav'
import { getSiteChrome } from '@/lib/content/site-settings'
import { getSiteUrl } from '@/lib/site-url'
import { Analytics } from '@/components/Analytics/Analytics'
import { NavigationProgress } from '@/components/NavigationProgress/NavigationProgress'
import { fontClassName, fontStyle } from '@/lib/fonts'
// Not `@mantine/core/styles.css`: that is every Mantine component's CSS (~200KB, ~29KB gzip,
// render-blocking on every page) for a site that uses two of them. This is the baseline,
// the default theme variables, the globals and the one component with a stylesheet
// (`VisuallyHidden`; `FocusTrap` has none). Add a component's file here when one is used.
import '@mantine/core/styles/baseline.css'
import '@mantine/core/styles/default-css-variables.css'
import '@mantine/core/styles/global.css'
import '@mantine/core/styles/VisuallyHidden.css'
import '@/styles/globals.scss'

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
  // Empty while the rest of the site is hidden: the nav would be a row of links
  // that all bounce back to the landing page, which is worse than no nav. The
  // few pages that *are* reachable — the forms — get the mark and the language
  // link and nothing else. The full row returns with the site it belongs to.
  const navItems = LANDING_ONLY ? [] : buildNavItems(locale, t)
  const chrome = await getSiteChrome(locale)

  return (
    <html
      lang={locale}
      className={fontClassName}
      style={fontStyle}
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
            closeLabel={t.close}
            submenuLabel={t.nav.submenu}
            navLabel={t.nav.primary}
            email={chrome.contactEmail}
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
            locale={locale}
            trophyLabel={t.footer.trophy}
            blurb={chrome.footerBlurb ?? t.footer.blurb}
            blurbLang={
              chrome.footerBlurb && chrome.footerBlurbLocale !== locale
                ? chrome.footerBlurbLocale
                : undefined
            }
            email={chrome.contactEmail}
            contactHeading={t.footer.contactHeading}
            columnsLabel={t.footer.pages}
            // While the rest of the site is hidden only the two forms are
            // reachable, so they are all the footer links to.
            columns={
              LANDING_ONLY
                ? [
                    {
                      heading: t.footer.involved,
                      links: [
                        { href: localePath('/erindi', locale), label: t.forms.talk.title },
                        { href: localePath('/abendingar', locale), label: t.forms.feedback.title },
                      ],
                    },
                  ]
                : visibleFooterColumns(locale, t)
            }
            socials={chrome.socials}
          />
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  )
}
