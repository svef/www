import type React from 'react'
import type { Metadata } from 'next'
import { Noto_Sans, Overpass } from 'next/font/google'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/lib/theme'
import '@mantine/core/styles.css'
import '@/styles/globals.scss'

const heading = Noto_Sans({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })
const body = Overpass({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'SVEF — Samtök vefiðnaðarins',
  description: 'Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

// Standalone root layout for the temporary one-pager (no locale, no nav).
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is" className={`${heading.variable} ${body.variable}`} {...mantineHtmlProps}>
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
