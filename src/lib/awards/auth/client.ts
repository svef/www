'use client'

import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { getAuth } from './auth'
import { AUTH_BASE_PATH } from './paths'

/** Browser-side Better Auth client for the account forms. */
export const authClient = createAuthClient({
  basePath: AUTH_BASE_PATH,
  plugins: [inferAdditionalFields<ReturnType<typeof getAuth>>()],
})
