import type React from 'react'
import config from '@payload-config'
import { RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import { serverFunction } from './serverFunction'
import '@payloadcms/next/css'

export default function PayloadLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
