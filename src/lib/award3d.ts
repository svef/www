/**
 * Loader for the vendored 3D trophy bundle (`public/vendor/award3d.js`, see its README).
 *
 * The bundle carries three.js, so nothing imports it at build time: a `<script>` is injected
 * the first time something asks, and every later caller shares that one request. Client only.
 */

export const AWARD3D_SRC = '/vendor/award3d.js?v=20261026'

export interface Award3d {
  mount(el: HTMLElement): { kick(): void }
}

declare global {
  interface Window {
    SVEFAward?: Award3d
  }
}

let loading: Promise<Award3d> | undefined

export function loadAward3d(): Promise<Award3d> {
  if (typeof window === 'undefined') return Promise.reject(new Error('client only'))
  if (window.SVEFAward) return Promise.resolve(window.SVEFAward)
  if (loading) return loading
  const attempt = new Promise<Award3d>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = AWARD3D_SRC
    script.async = true
    script.onload = () =>
      window.SVEFAward ? resolve(window.SVEFAward) : reject(new Error('award3d: no export'))
    script.onerror = () => {
      script.remove()
      reject(new Error('award3d: failed to load'))
    }
    document.head.appendChild(script)
  })
  // A failed load can be tried again later; a successful one is kept for good.
  loading = attempt
  attempt.catch(() => {
    if (loading === attempt) loading = undefined
  })
  return attempt
}
