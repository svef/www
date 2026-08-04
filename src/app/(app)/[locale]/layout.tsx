import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Noto_Sans, Overpass } from 'next/font/google'
import { Header } from '@/components/Header/Header'
import { Footer } from '@/components/Footer/Footer'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import { getDictionary, isLocale, LOCALES } from '@/lib/i18n'
import '@mantine/core/styles.css'
import '@/styles/globals.scss'

const heading = Noto_Sans({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })
const body = Overpass({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'SVEF — Samtök vefiðnaðarins', template: '%s | SVEF' },
  description: 'Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

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
  const base = locale === 'en' ? '/en' : ''
  const navItems = [
    { href: `${base}/vefverdlaunin`, label: t.nav.awards },
    { href: `${base}/vidburdir`, label: t.nav.events },
    { href: `${base}/frettir`, label: t.nav.news },
    { href: `${base}/um-svef`, label: t.nav.about },
    { href: `${base}/skraning`, label: t.nav.membership },
  ]
  // TODO: source socials + blurb from the SiteSettings global once content exists.
  const socials = [
    { label: 'FB', href: '#' },
    { label: 'IG', href: '#' },
    { label: 'X', href: '#' },
    { label: 'LI', href: '#' },
  ]

  return (
    <html
      lang={locale}
      className={`${heading.variable} ${body.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="dark">
          <a href="#main" className="skip-link">
            {t.skipToContent}
          </a>
          <Header
            homeHref={base || '/'}
            navItems={navItems}
            contactLabel={t.nav.contact}
            contactHref={`${base}/hafa-samband`}
            otherLocaleHref={locale === 'en' ? '/' : '/en'}
            otherLocaleLabel={locale === 'en' ? 'IS' : 'EN'}
          />
          <main id="main">{children}</main>
          <Footer
            blurb={t.footer.blurb}
            email="svef@svef.is"
            socials={socials}
            year={2026}
          />
        </MantineProvider>
      </body>
    </html>
  )
}
