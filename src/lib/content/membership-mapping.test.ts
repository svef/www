import { describe, it, expect } from 'vitest'
import {
  formatFee,
  membershipLocales,
  toMembership,
  type MembershipAllLocales,
} from './membership-mapping'

const doc = {
  id: 1,
  intro: { is: 'Kynning', en: 'Intro' },
  signupCtaLabel: { is: 'Sækja um aðild', en: 'Apply' },
  tiers: [
    {
      id: 'a',
      priceISK: 23900,
      featured: false,
      ctaLabel: { is: 'Skrá mig', en: 'Sign me up' },
      name: { is: 'Einstaklingsaðild', en: 'Individual' },
      benefits: [
        { id: 'b1', benefit: { is: 'Frítt á viðburði', en: 'Free entry' } },
        // Opened in the admin and left blank — Payload writes `''`.
        { id: 'b2', benefit: { is: 'Póstlisti', en: '' } },
      ],
    },
    {
      id: 'b',
      priceISK: 149000,
      featured: true,
      // No CTA of its own — falls back to the page-wide label.
      ctaLabel: { is: '', en: '' },
      name: { is: 'Fyrirtækjaaðild', en: null },
      benefits: null,
    },
  ],
} as unknown as MembershipAllLocales

describe('formatFee', () => {
  it('writes the fee the way each language writes money', () => {
    expect(formatFee(23900, 'is')).toBe('23.900 kr.')
    expect(formatFee(23900, 'en')).toBe('23,900 ISK')
    expect(formatFee(149000, 'is')).toBe('149.000 kr.')
    expect(formatFee(149000, 'en')).toBe('149,000 ISK')
  })

  it('never shows a fraction of a króna', () => {
    expect(formatFee(23900.4, 'is')).toBe('23.900 kr.')
  })
})

describe('toMembership', () => {
  it('resolves every field into the locale that was asked for', () => {
    const membership = toMembership(doc, 'is')
    expect(membership.intro).toBe('Kynning')
    expect(membership.ctaLabel).toBe('Sækja um aðild')
    expect(membership.tiers.map((t) => t.name)).toEqual([
      'Einstaklingsaðild',
      'Fyrirtækjaaðild',
    ])
    expect(membership.tiers.map((t) => t.price)).toEqual(['23.900 kr.', '149.000 kr.'])
  })

  it('gives each tier its own call to action', () => {
    // Two adjacent links to the same anchor: identical names would read as
    // "Sækja um aðild, Sækja um aðild" in a screen reader's link list.
    expect(toMembership(doc, 'is').tiers.map((t) => t.ctaLabel)).toEqual([
      'Skrá mig',
      'Sækja um aðild',
    ])
    expect(toMembership(doc, 'en').tiers.map((t) => t.ctaLabel)).toEqual(['Sign me up', 'Apply'])
  })

  it('reports the locale of the label it actually used', () => {
    const [individual, company] = toMembership(doc, 'en').tiers
    expect(individual.ctaLabelLocale).toBe('en')
    // Fell back to the page-wide label, which does have English.
    expect(company.ctaLabelLocale).toBe('en')
  })

  it('carries the featured flag through from the CMS', () => {
    expect(toMembership(doc, 'is').tiers.map((t) => t.featured)).toEqual([false, true])
  })

  it('falls back to Icelandic per field and says so', () => {
    const membership = toMembership(doc, 'en')
    expect(membership.tiers[0].name).toBe('Individual')
    expect(membership.tiers[0].nameLocale).toBe('en')
    // No English tier name was written, so the Icelandic one shows.
    expect(membership.tiers[1].name).toBe('Fyrirtækjaaðild')
    expect(membership.tiers[1].nameLocale).toBe('is')
  })

  it('falls back on a benefit that was left blank rather than dropping it', () => {
    const [individual] = toMembership(doc, 'en').tiers
    expect(individual.benefits.map((b) => b.text)).toEqual(['Free entry', 'Póstlisti'])
    expect(individual.benefits.map((b) => b.locale)).toEqual(['en', 'is'])
  })

  it('drops a benefit with no text in any locale', () => {
    const empty = {
      ...doc,
      tiers: [{ ...doc.tiers![0], benefits: [{ id: 'x', benefit: { is: '', en: '' } }] }],
    } as unknown as MembershipAllLocales
    expect(toMembership(empty, 'is').tiers[0].benefits).toEqual([])
  })

  it('survives a global that has never been filled in', () => {
    const blank = { id: 1, intro: null, signupCtaLabel: null } as unknown as MembershipAllLocales
    const membership = toMembership(blank, 'is')
    expect(membership.intro).toBeNull()
    expect(membership.tiers).toEqual([])
  })
})

describe('membershipLocales', () => {
  it('reports the locale of every resolved field', () => {
    // One untranslated tier name is enough to put the page on the note.
    expect(membershipLocales(toMembership(doc, 'en'))).toContain('is')
    expect(membershipLocales(toMembership(doc, 'is')).every((l) => l === 'is')).toBe(true)
  })

  it('reports the asked-for locale for a field that is simply empty', () => {
    const blank = { id: 1, intro: null, signupCtaLabel: null } as unknown as MembershipAllLocales
    // Nothing is untranslated — there is nothing there at all — so an English
    // reader must not be told the page is showing Icelandic.
    expect(membershipLocales(toMembership(blank, 'en'))).toEqual(['en', 'en'])
  })
})
