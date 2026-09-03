import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const r2Host = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : 'assets.svef.is'

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md/CLAUDE.md in the repo.
  agentRules: false,
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: r2Host }],
  },
}

export default withPayload(nextConfig)
