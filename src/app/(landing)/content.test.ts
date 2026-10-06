import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { LOCALES } from '@/lib/i18n'
import { getLandingCopy, type LandingCopy } from './content'

// The page renders whatever the dictionary holds, so a translation that is
// missing, empty, or has drifted out of step with the other locale would show up
// on the live page rather than failing anywhere. These check the pairing instead.

function strings(copy: LandingCopy): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(copy)
  return out
}

describe('landing content', () => {
  it.each(LOCALES)('has no empty strings in %s', (locale) => {
    const blank = strings(getLandingCopy(locale)).filter((s) => s.trim() === '')
    expect(blank).toEqual([])
  })

  it('lists the same events in both locales', () => {
    const [is, en] = [getLandingCopy('is').events.items, getLandingCopy('en').events.items]
    expect(en).toHaveLength(is.length)
    is.forEach((item, i) => {
      // Times, links and the presence of a badge are facts about the event, not
      // translations — they must not drift apart.
      expect(en[i].time).toBe(item.time)
      expect(en[i].action.href).toBe(item.action.href)
      expect(Boolean(en[i].badge)).toBe(Boolean(item.badge))
      expect(Boolean(en[i].directions)).toBe(Boolean(item.directions))
    })
  })

  it('translates every event field away from the Icelandic original', () => {
    const [is, en] = [getLandingCopy('is').events.items, getLandingCopy('en').events.items]
    is.forEach((item, i) => {
      expect(en[i].title).not.toBe(item.title)
      expect(en[i].body).not.toBe(item.body)
      expect(en[i].action.label).not.toBe(item.action.label)
      expect(en[i].ics).not.toBe(item.ics)
    })
  })

  it.each(LOCALES)('points at calendar files that exist for %s', (locale) => {
    for (const e of getLandingCopy(locale).events.items) {
      expect(existsSync(join(process.cwd(), 'public', e.ics)), e.ics).toBe(true)
    }
  })
})
