import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import { MantineProvider } from '@mantine/core'
import { theme } from '../src/lib/theme'
import '@mantine/core/styles.css'
import '../src/styles/globals.scss'

// Note: --font-heading / --font-body come from next/font in the app; in Storybook
// they fall back to system-ui. Component structure/colors still render correctly.
const preview: Preview = {
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={theme} forceColorScheme="dark">
        <div style={{ background: 'var(--bg)', color: 'var(--fg)', padding: 32 }}>
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
}

export default preview
