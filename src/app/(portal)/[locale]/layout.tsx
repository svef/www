import type React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { theme } from '@/lib/theme'
import { isLocale } from '@/lib/i18n'
import { getSiteUrl } from '@/lib/site-url'
import { fontClassName, fontStyle } from '@/lib/fonts'
import { getViewer } from '@/lib/awards/auth/viewer'
import { portalCopy } from '@/lib/portal/copy'
import { Analytics } from '@/components/Analytics/Analytics'
import { NavigationProgress } from '@/components/NavigationProgress/NavigationProgress'
import { PortalShell } from '@/components/PortalShell/PortalShell'
// The same slim Mantine CSS as the site's layout (see the note there).
import '@mantine/core/styles/baseline.css'
import '@mantine/core/styles/default-css-variables.css'
import '@mantine/core/styles/global.css'
import '@mantine/core/styles/VisuallyHidden.css'
import '@/styles/globals.scss'

/**
 * The signed-in portal (Mínar síður, `/is/minar-sidur`) and the admin (Stjórnborð,
 * `/is/stjornbord`): their own root layout, so the app's shell replaces the site's header and
 * footer rather than sitting between them, and so these pages never touch Payload.
 *
 * Every page here is about one signed-in person, so it is rendered per request: reading the
 * session cookie opts the route out of prerendering, without `force-dynamic`. Nothing here
 * is indexable. Crossing between this layout and the site's is a full page load, which is
 * the moment the chrome changes anyway.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const name = isLocale(locale) ? portalCopy[locale].name : 'SVEF'
  return {
    title: { default: `${name} | SVEF`, template: `%s | ${name} | SVEF` },
    metadataBase: new URL(getSiteUrl()),
    robots: { index: false, follow: false },
  }
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const viewer = await getViewer()

  return (
    <html lang={locale} className={fontClassName} style={fontStyle} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="dark">
          <NavigationProgress />
          <PortalShell
            locale={locale}
            viewer={viewer && { name: viewer.name, email: viewer.email, isAdmin: viewer.isAdmin }}
          >
            {children}
          </PortalShell>
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  )
}
