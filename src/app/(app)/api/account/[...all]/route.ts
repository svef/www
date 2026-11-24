import { toNextJsHandler } from 'better-auth/next-js'
import { getAuth } from '@/lib/awards/auth/auth'

// Better Auth's endpoints, at /api/account/*. Not /api/auth: Payload's catch-all
// owns /api, and a static segment is matched before it. The instance is created
// on the first request, not at import, so `next build` needs no database.

export function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request)
}

export function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request)
}
