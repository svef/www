/**
 * The page numbers a pager shows: the first and last, and two either side of the current
 * one, with `null` where a run is left out. Pure.
 *
 *   pageWindow(6, 20) → [1, null, 4, 5, 6, 7, 8, null, 20]
 */
export function pageWindow(page: number, pageCount: number, around = 2): (number | null)[] {
  if (pageCount <= 1) return [1]
  const shown = new Set<number>([1, pageCount])
  for (let n = page - around; n <= page + around; n++) if (n >= 1 && n <= pageCount) shown.add(n)
  const sorted = [...shown].sort((a, b) => a - b)
  const out: (number | null)[] = []
  for (const n of sorted) {
    const prev = out[out.length - 1]
    // A gap of one page is shown as that page rather than as "…".
    if (typeof prev === 'number' && n - prev === 2) out.push(prev + 1)
    else if (typeof prev === 'number' && n - prev > 2) out.push(null)
    out.push(n)
  }
  return out
}
