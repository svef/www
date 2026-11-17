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
  relativeSlot,
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
    // An album may have no event: the real past events are not in the CMS yet,
    // so these are unlinked rather than pointing at a slug nothing resolves.
    // What must not happen is a slug that is set and resolves to nothing.
    const eventSlugs = new Set(events.map((e) => e.slug))
    for (const gallery of galleries) {
      if (gallery.eventSlug !== undefined) {
        expect(eventSlugs).toContain(gallery.eventSlug)
      }
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
  })

  it('carries the association’s real events, in order', () => {
    // These are not design-export fixtures any more: they are the autumn
    // programme, and the site shows them to the public.
    // The autumn programme first, then a past event (Klúðurkvöld) so the events index has
    // something in "Liðnir viðburðir" and an album to link it to (#141). The relative-dated
    // upcoming fixtures follow and are checked below, not pinned here.
    expect(events.slice(0, 3).map((e) => e.slug)).toEqual([
      'sigurvegarar-segja-fra-svef-x-kolibri',
      'vefthroun-og-gervigreind',
      'kludurkvold',
    ])
    expect(events[0]?.startDate.startsWith('2026-10-08')).toBe(true)
    expect(events[1]?.startDate.startsWith('2026-10-21')).toBe(true)
    // Ský sells the tickets for the second one; the first is free, and a free
    // event must carry no price at all, since 0 prints as "0 kr.".
    expect(events[0]?.ticketPrice).toBeUndefined()
    expect(events[1]?.ticketUrl).toContain('sky.is')
  })

  it('keeps some events upcoming, and says which ones carry sponsors', () => {
    // The dated events above are over, so the upcoming views live on the fixtures that are
    // dated relative to the day the seed runs (svef/www#141).
    const now = Date.now()
    const upcoming = events.filter((e) => new Date(e.endDate ?? e.startDate).getTime() > now)
    expect(upcoming.length).toBeGreaterThanOrEqual(3)
    // At least one sponsored, with a labelled and an unlabelled sponsor to group.
    const sponsored = events.find((e) => (e.sponsors?.length ?? 0) > 1)
    expect(sponsored).toBeDefined()
    for (const sponsor of sponsored?.sponsors ?? []) {
      if (sponsor.label) expect(sponsor.labelEn, sponsor.name).toBeTruthy()
    }
  })

  it('relativeSlot is anchored to the day it is given, not to the clock', () => {
    const now = new Date('2030-01-31T23:30:00.000Z')
    expect(relativeSlot(1, 20, 2.5, now)).toEqual({
      startDate: '2030-02-01T20:00:00.000Z',
      endDate: '2030-02-01T22:30:00.000Z',
    })
  })

  it('translates every event in full, not just its title', () => {
    // A title in English above an Icelandic body looks translated and is not,
    // which is worse than leaving it alone.
    for (const event of events) {
      expect(event.titleEn ?? event.title, event.slug).toBeTruthy()
      // An event with no body (the past one) has nothing to translate.
      if (!event.description) continue
      expect(event.descriptionEn, event.slug).toBeTruthy()
      expect(event.descriptionEn, event.slug).toHaveLength(event.description.length)
      if (event.location) expect(event.locationEn, event.slug).toBeTruthy()
    }
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

  it('gives each tier the call to action the export writes for it', () => {
    expect(membership.tiers.map((t) => t.ctaLabel)).toEqual(['Skrá mig', 'Skrá fyrirtæki'])
    expect(membershipEn.tiers.every((t) => t.ctaLabel)).toBe(true)
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
