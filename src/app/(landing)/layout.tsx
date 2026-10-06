import type React from 'react'
import type { Metadata } from 'next'
import { Archivo, Overpass } from 'next/font/google'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import '@mantine/core/styles.css'
import '@/styles/globals.scss'

// The Figma landing uses Interstate (commercial). Overpass is the open-source
// Interstate look-alike and carries the body copy; Archivo sets the headings.
const overpass = Overpass({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '600', '700', '800'],
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SVEF — Samtök vefiðnaðarins',
  description: 'Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

// Standalone root layout for the temporary one-pager (no locale, no nav).
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="is"
      className={`${overpass.variable} ${archivo.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}
