import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventPage from './page'

/**
 * The ticket call to action (svef/www#80).
 *
 * Before this test the branch had no coverage at all: `event.ticketUrl && (…)`
 * gates the hero button, the member-discount sentence and the sidebar button,
 * and no seed fixture set a `ticketUrl` to exercise either side of it. One now
 * does — the Ský-run "Vefþróun og gervigreind" event — alongside the free
 * Kolibri evening, which still sets none. Both are transcribed here rather than
 * imported from `seed-data.ts`, so this test does not break if the fixtures
 * change shape, only if the rendering contract does.
 *
 * Payload's Local API is stubbed the same way `events.test.ts` stubs it: what
 * matters is what the page does with the row it gets back, not a real database.
 * Going through `@/lib/payload` rather than mocking `@/lib/content/events`
 * means `findEvent`'s own mapping (`toEventDetail`) runs for real, so this
 * covers the whole path from a Payload-shaped document to the rendered button —
 * not just a presentational component handed a `ticketUrl` prop directly.
 */
const find = vi.fn()
const findGlobal = vi.fn()
vi.mock('@/lib/payload', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payload')>('@/lib/payload')
  return { ...actual, getPayload: async () => ({ find, findGlobal }) }
})

const NOW = new Date('2026-10-08T12:00:00.000Z')

function event(overrides: Record<string, unknown>) {
  return {
    id: 1,
    endDate: null,
    location: { is: 'Grandi 101' },
    venueAddress: null,
    description: null,
    accessibility: { is: null },
    coverImage: null,
    gallery: [],
    ticketUrl: null,
    ticketPrice: null,
    memberPrice: null,
    ...overrides,
    slug: { is: (overrides.slug as string | undefined) ?? 'vidburdur' },
    title: { is: (overrides.title as string | undefined) ?? 'Viðburður' },
  }
}

// Transcribed from `src/scripts/seed-data.ts`: Ský sells the tickets, so the
// event carries a `ticketUrl` and no on-site price.
const SKY_EVENT = event({
  id: 2,
  slug: 'vefthroun-og-gervigreind',
  title: 'Vefþróun og gervigreind: Hvað er framundan?',
  startDate: '2026-10-21T11:50:00.000Z',
  endDate: '2026-10-21T14:00:00.000Z',
  location: { is: 'Harpa, Kaldalón (1. hæð)' },
  venueAddress: 'Austurbakki 2, 101 Reykjavík',
  ticketUrl: 'https://www.sky.is/vidburdur/3165-2026-vidburdur-1021',
})

// Transcribed from the same file: the Kolibri evening is free, so it carries no
// `ticketPrice` and no `ticketUrl` — the exact row the button must stay hidden
// on.
const KOLIBRI_EVENT = event({
  id: 1,
  slug: 'sigurvegarar-segja-fra-svef-x-kolibri',
  title: 'Sigurvegarar segja frá – SVEF x Kolibri',
  startDate: '2026-10-08T17:00:00.000Z',
  endDate: '2026-10-08T20:00:00.000Z',
  location: { is: 'Skrifstofur Kolibri' },
  venueAddress: 'Borgartún 26, 105 Reykjavík',
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  find.mockReset()
  findGlobal.mockReset()
  findGlobal.mockResolvedValue({ contactEmail: 'svef@svef.is' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('event page ticket CTA', () => {
  it('renders the ticket button, pointed at the ticketUrl, when one is set', async () => {
    find.mockResolvedValue({ docs: [SKY_EVENT] })
    const page = await EventPage({
      params: Promise.resolve({ locale: 'is', slug: 'vefthroun-og-gervigreind' }),
    })
    render(page)

    // One in the band, one on the facts card (the export has both).
    const links = screen.getAllByRole('link', { name: /Kaupa miða/ })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute(
        'href',
        'https://www.sky.is/vidburdur/3165-2026-vidburdur-1021',
      )
    }
  })

  it('renders no button, and no member-discount sentence, when the event is free', async () => {
    find.mockResolvedValue({ docs: [KOLIBRI_EVENT] })
    const page = await EventPage({
      params: Promise.resolve({ locale: 'is', slug: 'sigurvegarar-segja-fra-svef-x-kolibri' }),
    })
    render(page)

    expect(screen.queryByRole('link', { name: /Kaupa miða/ })).toBeNull()
    expect(screen.queryByText(/afslátt/)).toBeNull()
  })
})

describe('event page content', () => {
  const LOGO = { id: 7, url: '/dev-fixtures/sponsors/kaldur.svg', width: 120, height: 120, alt: { is: 'Kaldur' } }

  it('shows the date, the venue with its address and the sponsors with their label', async () => {
    find.mockResolvedValue({
      docs: [
        {
          ...SKY_EVENT,
          sponsors: [
            { id: 'a', name: 'Kaldur', logo: LOGO, url: 'https://example.com/kaldur', label: { is: 'Drykkir í boði' } },
            { id: 'b', name: 'Norðurljós', logo: { ...LOGO, id: 8 }, label: { is: 'Drykkir í boði' } },
          ],
        },
      ],
    })
    const page = await EventPage({
      params: Promise.resolve({ locale: 'is', slug: 'vefthroun-og-gervigreind' }),
    })
    render(page)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vefþróun og gervigreind')
    // The venue is a pill in the band and again in the facts card.
    expect(screen.getAllByText('Harpa, Kaldalón (1. hæð)')).toHaveLength(2)
    expect(screen.getByText('Austurbakki 2, 101 Reykjavík')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Opna kort' })).toBeInTheDocument()

    // Neighbouring sponsors with the same label share it: printed once, over both logos.
    expect(screen.getAllByText('Drykkir í boði')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Kaldur' })).toHaveAttribute(
      'src',
      '/dev-fixtures/sponsors/kaldur.svg',
    )
    expect(screen.getByRole('link', { name: 'Kaldur' })).toHaveAttribute(
      'href',
      'https://example.com/kaldur',
    )
    // No url, no link.
    expect(screen.queryByRole('link', { name: 'Norðurljós' })).toBeNull()
  })

  it('has no sponsors section when there are none', async () => {
    find.mockResolvedValue({ docs: [KOLIBRI_EVENT] })
    const page = await EventPage({
      params: Promise.resolve({ locale: 'is', slug: 'sigurvegarar-segja-fra-svef-x-kolibri' }),
    })
    render(page)
    expect(screen.queryByRole('heading', { name: 'Samstarfsaðilar' })).toBeNull()
  })
})
