import type React from 'react'
import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
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
      </body>
    </html>
  )
}
