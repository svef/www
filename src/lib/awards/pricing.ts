import { toMs, type DateInput, type Edition } from './types'

export type EarlyBirdRounding = 'nearest-900'

/**
 * Early-bird price: the amount ending in 900 nearest to `regular * (100 - pct) / 100`, in whole
 * ISK and integer arithmetic only. A tie goes to the lower amount (the spec is silent; no
 * current price produces one). Never exceeds the regular price; `pct = 0` returns it unchanged.
 */
export function earlyBirdPrice(
  regular: number,
  pct: number,
  rounding: EarlyBirdRounding = 'nearest-900',
): number {
  if (!Number.isInteger(regular) || regular < 0)
    throw new RangeError('regular must be a non-negative integer')
  if (!Number.isInteger(pct) || pct < 0 || pct > 100)
    throw new RangeError('pct must be an integer 0-100')
  if (rounding !== 'nearest-900')
    throw new RangeError(`Unknown rounding: ${String(rounding)}`)
  if (pct === 0) return regular
  // Work in hundredths of a krona: target = regular * (100 - pct) / 100 -> scaled = regular * (100 - pct).
  const scaled = regular * (100 - pct)
  // Candidates are 1000k - 100 (k >= 1), i.e. 900, 1900, 2900 ... ; in scaled units 100 * candidate.
  const k0 = Math.max(1, Math.floor((scaled + 10_000) / 100_000))
  const low = 1000 * k0 - 100
  const high = low + 1000
  const best = scaled - 100 * low <= 100 * high - scaled ? low : high
  return Math.min(best, regular)
}

export type PriceTier = 'early' | 'regular'

export type PriceSnapshot = {
  tier: PriceTier
  priceRegular: number
  discountPercent: number
  priceAmount: number
}

/**
 * The price an entry gets if submitted at `submittedAt`: early iff `submittedAt < earlyBirdEndsBefore`
 * (exclusive bound). Pass the server clock; this never reads the time itself.
 */
export function priceFor(
  submittedAt: DateInput,
  edition: Pick<
    Edition,
    'earlyBirdEndsBefore' | 'earlyBirdDiscountPercent' | 'earlyBirdRounding'
  >,
  regular: number,
): PriceSnapshot {
  const early = toMs(submittedAt) < toMs(edition.earlyBirdEndsBefore)
  if (!early)
    return {
      tier: 'regular',
      priceRegular: regular,
      discountPercent: 0,
      priceAmount: regular,
    }
  return {
    tier: 'early',
    priceRegular: regular,
    discountPercent: edition.earlyBirdDiscountPercent,
    priceAmount: earlyBirdPrice(
      regular,
      edition.earlyBirdDiscountPercent,
      edition.earlyBirdRounding,
    ),
  }
}
