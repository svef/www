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
  {
    // These paths render exported SVG/brand assets and masked photos where
    // next/image adds nothing (fixed decorative assets, CSS mask-image
    // targets) — <img> is deliberate here, not an oversight.
    files: [
      'src/app/(landing)/**',
      'src/components/LogoBuild/**',
      'src/components/BlockPanel/**',
      'src/components/BoardMemberCard/**',
    ],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
