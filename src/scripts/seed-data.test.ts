import { describe, expect, it } from 'vitest'

import {
  awardCategories,
  awardWinners,
  boardMembers,
  events,
  faq,
  galleries,
  membership,
  membershipEn,
  news,
  press,
  richText,
} from './seed-data'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('seed fixtures', () => {
  it('gives every event and news item a unique, URL-safe slug', () => {
    for (const { slug } of [...events, ...news, ...awardCategories]) {
      expect(slug).toMatch(slugPattern)
    }

    for (const list of [events, news, awardCategories]) {
      const slugs = list.map((item) => item.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('keys every document on a value that is unique within its collection', () => {
    // upsert() matches on these, so a duplicate would silently overwrite a sibling.
    expect(new Set(boardMembers.map((m) => m.name)).size).toBe(boardMembers.length)
    expect(new Set(galleries.map((g) => g.title)).size).toBe(galleries.length)
    expect(new Set(awardWinners.map((w) => w.siteName)).size).toBe(awardWinners.length)
  })

  it('points every gallery and winner at something that is seeded', () => {
    const eventSlugs = new Set(events.map((e) => e.slug))
    for (const gallery of galleries) {
      expect(eventSlugs).toContain(gallery.eventSlug)
    }

    const categorySlugs = new Set(awardCategories.map((c) => c.slug))
    for (const winner of awardWinners) {
      expect(categorySlugs).toContain(winner.categorySlug)
    }
  })

  it('matches the design export', () => {
    // Spot checks against the Claude Design export, so a well-meaning edit that
    // drifts back towards invented copy fails here.
    expect(awardCategories).toHaveLength(13)
    expect(awardCategories[0]?.name).toBe('Vefur ársins')
    expect(awardCategories[10]?.name).toBe('Aðgengi')
    expect(boardMembers[0]).toMatchObject({
      name: 'Salena Raquel Kauffman',
      role: 'Formaður · UX/UI hönnuður',
    })
    expect(faq).toHaveLength(14)
    // Three roles the repo had wrong before the board was wired to Payload:
    // the design export is the record, and these are what it says.
    const roles = new Map(boardMembers.map((m) => [m.name, m.role]))
    expect(roles.get('Brian Johannessen')).toBe('Meðstjórnandi · hönnun')
    expect(roles.get('Petra Dís Magnúsdóttir')).toBe('Meðstjórnandi · vefverðlaunin')
    // A deputy, not a board member — the distinction the old literal lost.
    expect(roles.get('Jón Andri Óskarsson')).toBe('Varamaður · nýir vefir')
    expect(press.map((p) => p.outlet)).toEqual(['RÚV', 'Vísir', 'Kjarninn'])
    expect(membership.tiers.map((t) => t.priceISK)).toEqual([23900, 149000])
    expect(events[0]?.startDate.startsWith('2026-11-14')).toBe(true)
  })

  it('seeds English only where the export actually has English', () => {
    const translated = events.filter((event) => event.titleEn)
    expect(translated.map((event) => event.slug)).toEqual([
      'islensku-vefverdlaunin-2026',
      'islensku-vefverdlaunin-2025',
    ])
  })

  it('keeps the English membership copy aligned with the Icelandic', () => {
    // `membershipEn` is matched to `membership.tiers` by position when the
    // fixtures are written, so a tier added to one and not the other would
    // silently seed the wrong translation.
    expect(membershipEn.tiers).toHaveLength(membership.tiers.length)
    membership.tiers.forEach((tier, index) => {
      expect(membershipEn.tiers[index]?.benefits).toHaveLength(tier.benefits.length)
    })
  })

  it('carries the design’s highlighted tier', () => {
    expect(membership.tiers.map((t) => Boolean(t.featured))).toEqual([false, true])
  })

  it('builds Lexical editor state with paragraphs and headings', () => {
    const value = richText(['Halló', { h2: 'Fyrirsögn' }])
    expect(value.root.type).toBe('root')
    expect(value.root.children).toHaveLength(2)
    expect(value.root.children[0]?.type).toBe('paragraph')
    expect(value.root.children[1]).toMatchObject({ tag: 'h2', type: 'heading' })
    expect(value.root.children[0]?.children[0]?.text).toBe('Halló')
  })
})
