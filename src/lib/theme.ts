import { createTheme, type MantineColorsTuple } from '@mantine/core'

// PLACEHOLDER theme — real tokens come from translating the exported design system
// (.local/svef/SVEF Design System (standalone).html). Electric Violet + dark canvas.
const violet: MantineColorsTuple = [
  '#F4EAFE',
  '#E5CDFB',
  '#CE9EF6',
  '#B76FF1',
  '#A247ED',
  '#9528E9',
  '#8917E1', // brand — Electric Violet
  '#7412C0',
  '#5E0E9C',
  '#490B79',
]

const dark: MantineColorsTuple = [
  '#C1BFC6',
  '#9E9BA6',
  '#7C7986',
  '#5B5866',
  '#423F4C',
  '#2B2833',
  '#1A1722',
  '#09060C', // Blakety Black — body background
  '#070409',
  '#050307',
]

export const theme = createTheme({
  primaryColor: 'violet',
  primaryShade: 6,
  colors: { violet, dark },
  white: '#FCFBFE', // Shy White
  black: '#09060C',
  fontFamily: 'var(--font-body), system-ui, sans-serif',
  headings: {
    fontFamily: 'var(--font-heading), var(--font-body), system-ui, sans-serif',
    fontWeight: '800',
  },
  defaultRadius: 'md',
})
