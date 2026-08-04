import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Noto_Sans, Overpass } from 'next/font/google'
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
  const nav = [
    { href: `${base}/vefverdlaunin`, label: t.nav.awards },
    { href: `${base}/vidburdir`, label: t.nav.events },
    { href: `${base}/frettir`, label: t.nav.news },
    { href: `${base}/um-svef`, label: t.nav.about },
    { href: `${base}/skraning`, label: t.nav.membership },
  ]
  const otherLocaleHref = locale === 'en' ? '/' : '/en'
  const otherLocaleLabel = locale === 'en' ? 'IS' : 'EN'

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
          <header className="site-header">
            <Link href={base || '/'} className="site-logo" aria-label="SVEF">
              SVEF
            </Link>
            <nav aria-label="Primary">
              {nav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="site-header__utility">
              <Link href={`${base}/hafa-samband`}>{t.nav.contact}</Link>
              <Link href={otherLocaleHref} hrefLang={otherLocaleLabel.toLowerCase()}>
                {otherLocaleLabel}
              </Link>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer className="site-footer">
            <p>© {new Date().getFullYear()} SVEF — {t.footer.rights}</p>
          </footer>
        </MantineProvider>
      </body>
    </html>
  )
}
