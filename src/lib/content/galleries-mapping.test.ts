import { describe, it, expect } from 'vitest'
import { byNewestFirst, toGalleryAlbum, type GalleryAllLocales } from './galleries-mapping'

function album(overrides: Partial<GalleryAllLocales> = {}): GalleryAllLocales {
  return {
    id: 1,
    title: { is: 'Íslensku vefverðlaunin 2025', en: 'The Icelandic Web Awards 2025' },
    date: '2025-11-15T12:00:00.000Z',
    event: {
      id: 9,
      slug: 'islensku-vefverdlaunin-2025',
      startDate: '2025-11-15T12:00:00.000Z',
      title: { is: 'Íslensku vefverðlaunin 2025' },
      location: { is: 'Harpa' },
      updatedAt: '',
      createdAt: '',
    },
    images: [],
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as GalleryAllLocales
}

function image(overrides: Record<string, unknown> = {}) {
  return {
    image: {
      id: 3,
      url: 'https://assets.svef.is/harpa-1.jpg',
      alt: { is: 'Mynd úr Hörpu' },
      caption: {},
      width: 1200,
      height: 800,
      updatedAt: '',
      createdAt: '',
    },
    caption: { is: 'Fullur salur', en: 'A full house' },
    ...overrides,
  } as NonNullable<GalleryAllLocales['images']>[number]
}

describe('toGalleryAlbum', () => {
  it('resolves the title for the locale', () => {
    expect(toGalleryAlbum(album(), 'en').title).toBe('The Icelandic Web Awards 2025')
    expect(toGalleryAlbum(album(), 'is').title).toBe('Íslensku vefverðlaunin 2025')
  })

  it('reports Icelandic when the English title has not been written', () => {
    const a = toGalleryAlbum(album({ title: { is: 'Klúðurkvöld' } }), 'en')
    expect(a.title).toBe('Klúðurkvöld')
    expect(a.contentLocale).toBe('is')
  })

  it('takes the venue from the related event', () => {
    expect(toGalleryAlbum(album(), 'is').venue).toBe('Harpa')
  })

  it('has no venue when the album is not tied to an event', () => {
    expect(toGalleryAlbum(album({ event: null }), 'is').venue).toBeNull()
  })

  // depth 0, or a relationship Payload did not resolve, leaves an id behind.
  it('has no venue when the event came back as an id', () => {
    expect(toGalleryAlbum(album({ event: 9 }), 'is').venue).toBeNull()
  })

  it('maps images, using the row caption as alt text', () => {
    const a = toGalleryAlbum(album({ images: [image()] }), 'en')
    expect(a.photos).toEqual([
      {
        url: 'https://assets.svef.is/harpa-1.jpg',
        alt: 'A full house',
        caption: 'A full house',
        width: 1200,
        height: 800,
      },
    ])
  })

  it("falls back to the media item's own alt when the row has no caption", () => {
    const a = toGalleryAlbum(album({ images: [image({ caption: {} })] }), 'is')
    expect(a.photos[0].alt).toBe('Mynd úr Hörpu')
    expect(a.photos[0].caption).toBeNull()
  })

  it('drops rows whose upload is unresolved or has no file', () => {
    const a = toGalleryAlbum(
      album({
        images: [
          image({ image: 3 }),
          image({ image: { id: 4, alt: {}, caption: {}, updatedAt: '', createdAt: '' } }),
          image(),
        ],
      }),
      'is',
    )
    expect(a.photos).toHaveLength(1)
  })

  it('gives an album with no images an empty photo list rather than throwing', () => {
    expect(toGalleryAlbum(album({ images: null }), 'is').photos).toEqual([])
  })
})

describe('byNewestFirst', () => {
  const dated = (id: number, date: string | null) =>
    ({ id, date }) as ReturnType<typeof toGalleryAlbum>

  it('puts the newest album first', () => {
    const order = [dated(1, '2025-11-15'), dated(2, '2026-05-22'), dated(3, '2026-03-13')]
      .sort(byNewestFirst)
      .map((a) => a.id)
    expect(order).toEqual([2, 3, 1])
  })

  // Postgres sorts DESC NULLS FIRST, so without this an album saved before its
  // date was filled in would head the page.
  it('sends undated albums to the end rather than the top', () => {
    const order = [dated(1, null), dated(2, '2026-05-22'), dated(3, '2025-11-15')]
      .sort(byNewestFirst)
      .map((a) => a.id)
    expect(order).toEqual([2, 3, 1])
  })

  it('leaves two undated albums in the order they arrived', () => {
    const order = [dated(1, null), dated(2, null)].sort(byNewestFirst).map((a) => a.id)
    expect(order).toEqual([1, 2])
  })
})
