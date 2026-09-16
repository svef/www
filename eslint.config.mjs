import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  prettierConfig,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
]

export default config
