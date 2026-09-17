import { describe, it, expect } from 'vitest'
import { toAboutContent, toBoardMember } from './about-mapping'

type BoardDoc = Parameters<typeof toBoardMember>[0]
type AboutDoc = Parameters<typeof toAboutContent>[0]

// Shaped like a `locale: 'all'` read: every localized field is an object keyed
// by locale, and English is absent until someone translates the document.
const member = {
  id: 1,
  name: 'Brian Johannessen',
  role: { is: 'Meðstjórnandi · hönnun', en: null },
  bio: { is: null, en: null },
  company: null,
  photo: null,
  order: 6,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as BoardDoc

const aboutPage = {
  id: 1,
  story: { is: null, en: null },
  boardIntro: { is: null, en: null },
  faq: [
    {
      question: { is: 'Hvað kostar aðild?', en: null },
      answer: { is: 'Einstaklingsaðild kostar 23.900 kr. á ári.', en: null },
    },
  ],
  press: [
    { title: 'Ný stjórn tekin við hjá SVEF', outlet: 'Kjarninn', url: '  ' },
    { title: 'Vefur ársins 2025 valinn í Hörpu', outlet: 'RÚV', url: 'https://ruv.is/x' },
  ],
  brandAssets: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as AboutDoc

describe('toBoardMember', () => {
  it('falls back to the Icelandic role and says so', () => {
    const view = toBoardMember(member, 'en')
    expect(view.role).toBe('Meðstjórnandi · hönnun')
    expect(view.roleLocale).toBe('is')
  })

  it('uses the English role, and reports English, when it exists', () => {
    const translated = {
      ...member,
      role: { is: 'Meðstjórnandi · hönnun', en: 'Board member · design' },
    } as unknown as BoardDoc
    const view = toBoardMember(translated, 'en')
    expect(view.role).toBe('Board member · design')
    expect(view.roleLocale).toBe('en')
  })

  it('has no portrait when the photo is unset', () => {
    expect(toBoardMember(member, 'is').portrait).toBeNull()
  })

  it('has no portrait when the relationship came back as an id', () => {
    const shallow = { ...member, photo: 7 } as unknown as BoardDoc
    expect(toBoardMember(shallow, 'is').portrait).toBeNull()
  })

  it('takes the portrait alt from the Media document, not from the name', () => {
    const withPhoto = {
      ...member,
      photo: {
        id: 7,
        url: 'https://assets.svef.is/brian.jpg',
        width: 480,
        height: 600,
        alt: { is: 'Brian við hönnunarborð', en: null },
        caption: { is: null, en: null },
      },
    } as unknown as BoardDoc
    expect(toBoardMember(withPhoto, 'is').portrait).toEqual({
      url: 'https://assets.svef.is/brian.jpg',
      alt: 'Brian við hönnunarborð',
      width: 480,
      height: 600,
    })
  })

  it('leaves alt empty when the Media document has none, so the caption is not repeated', () => {
    const withPhoto = {
      ...member,
      photo: {
        id: 7,
        url: 'https://assets.svef.is/brian.jpg',
        width: null,
        height: null,
        alt: { is: null, en: null },
        caption: { is: null, en: null },
      },
    } as unknown as BoardDoc
    expect(toBoardMember(withPhoto, 'is').portrait?.alt).toBe('')
  })
})

describe('toAboutContent', () => {
  it('resolves FAQ rows per field and reports the locale each one is in', () => {
    const [item] = toAboutContent(aboutPage, 'en').faq
    expect(item?.question).toBe('Hvað kostar aðild?')
    expect(item?.questionLocale).toBe('is')
    expect(item?.answerLocale).toBe('is')
  })

  it('treats a blank press URL as no link rather than an empty href', () => {
    const [unlinked, linked] = toAboutContent(aboutPage, 'is').press
    expect(unlinked?.url).toBeNull()
    expect(linked?.url).toBe('https://ruv.is/x')
  })

  it('has no brand assets while none have been uploaded', () => {
    expect(toAboutContent(aboutPage, 'is').brandAssets).toEqual([])
  })

  it('drops a brand asset whose upload did not resolve to a file', () => {
    const doc = {
      ...aboutPage,
      brandAssets: [
        { label: 'SVG', file: 12 },
        {
          label: 'PNG',
          file: { id: 13, url: 'https://assets.svef.is/logo.png', filesize: 2048, mimeType: 'image/png' },
        },
      ],
    } as unknown as AboutDoc
    expect(toAboutContent(doc, 'is').brandAssets).toEqual([
      {
        label: 'PNG',
        url: 'https://assets.svef.is/logo.png',
        filesize: 2048,
      },
    ])
  })

  it('renders nothing rather than throwing when the global has never been saved', () => {
    const empty = { id: 1, updatedAt: '', createdAt: '' } as unknown as AboutDoc
    const content = toAboutContent(empty, 'is')
    expect(content).toMatchObject({ story: null, faq: [], press: [], brandAssets: [] })
  })
})
