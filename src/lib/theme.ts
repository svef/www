import { createTheme, type MantineColorsTuple } from '@mantine/core'

// SVEF Mantine theme — mirrors src/styles/tokens.scss (derived from the exported
// design system). Dark canvas, Electric Violet primary. Refine against visual QA.
const violet: MantineColorsTuple = [
  '#F4EAFE',
  '#E7DCF5', // lavender (muted text)
  '#C08BF5', // violet-light
  '#B76FF1',
  '#A247ED',
  '#9E2BF7', // violet-bright (hover)
  '#8917E1', // brand — Electric Violet
  '#7412C0',
  '#5E0E9C',
  '#490B79',
]

// Dark ramp: [0] text → [7] canvas. Surfaces map to the design's violet-tinted darks.
const dark: MantineColorsTuple = [
  '#FCFBFE', // text (Shy White)
  '#E7DCF5',
  '#C08BF5',
  '#8E82A0',
  '#3A3147',
  '#241C2D', // surface-4 (borders/hover)
  '#1B1522', // surface-3 (cards)
  '#09060C', // canvas (body background)
  '#0B070F',
  '#060309',
]

export const theme = createTheme({
  primaryColor: 'violet',
  primaryShade: 6,
  colors: { violet, dark },
  white: '#FCFBFE',
  black: '#09060C',
  fontFamily: 'var(--font-body), system-ui, sans-serif',
  headings: {
    fontFamily: 'var(--font-heading), var(--font-body), system-ui, sans-serif',
    fontWeight: '800',
  },
  // Sharp/blocky brand — no rounded corners.
  defaultRadius: 0,
  radius: { sm: '0', md: '0', lg: '0' },
  other: {
    accentRed: '#FF0000',
    accentPink: '#FF0FCA',
    accentYellow: '#FFF511',
  },
})
