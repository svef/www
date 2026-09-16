import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  prettierConfig,
  {
    ignores: [
      // Agent worktrees (CLAUDE.md: one worktree per issue under _work/).
      // ESLint flat config matches relative paths, so no leading slash here —
      // '/_work/**' would silently match nothing (see #50).
      '_work/**',
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
