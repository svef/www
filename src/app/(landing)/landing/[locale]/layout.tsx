import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Archivo } from 'next/font/google'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import { isLocale } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { Analytics } from '@/components/Analytics/Analytics'
import { getLandingCopy } from '../../content'
import '@mantine/core/styles.css'
import '@/styles/globals.scss'

// Archivo carries the whole page — body and headings alike. The Figma landing
// specifies Interstate, which is commercial; Archivo is the closest open
// substitute and reads correctly at both text and display sizes.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const copy = getLandingCopy(locale)
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    metadataBase: new URL(getSiteUrl()),
    // The public URLs are /is and /en; /landing/<locale> is an internal rewrite
    // target and must never be what search engines are pointed at.
    alternates: {
      canonical: `/${locale}`,
      languages: { is: '/is', en: '/en' },
    },
  }
}

// Root layout for the temporary one-pager. It lives under the dynamic segment
// rather than at the route-group root so `lang` can follow the locale.
export default async function LandingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <html
      lang={locale}
      className={archivo.variable}
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
          {children}
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  )
}
