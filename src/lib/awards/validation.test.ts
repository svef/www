import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './categories'
import { FIELD_DEFINITIONS } from './fields'
import { formatError } from './messages'
import {
  validateEntryAnswers,
  validateImageMeta,
  validateProjectAnswers,
  type FieldError,
  type ValidationResult,
} from './validation'

const owner = { name: 'Anna', email: 'anna@example.is' }
const valid = {
  owners: [owner],
  title: 'Svef.is',
  description: 'A site.',
  links: ['https://svef.is'],
  publicCredit: 'Client and studio',
  termsAccepted: true,
}

const errors = (r: ValidationResult): FieldError[] => (r.ok ? [] : r.errors)
const codes = (r: ValidationResult) =>
  errors(r).map((e) => `${e.path.join('.')}:${e.code}`)

describe('validateProjectAnswers: required fields', () => {
  it('accepts a complete answer set and applies defaults', () => {
    const r = validateProjectAnswers(['ecommerce-website'], valid)
    expect(r).toEqual({ ok: true, data: { ...valid, requiresLogin: false } })
  })

  it('reports every missing required visible field', () => {
    const r = validateProjectAnswers(['ecommerce-website'], {})
    expect(codes(r).sort()).toEqual(
      [
        'description:required',
        'links:required',
        'owners:required',
        'publicCredit:required',
        'termsAccepted:required',
        'title:required',
      ].sort(),
    )
    expect(errors(r)[0].message).toEqual({
      is: expect.any(String),
      en: expect.any(String),
    })
  })

  it('treats blank strings, null and empty lists as missing', () => {
    const r = validateProjectAnswers(['ecommerce-website'], {
      ...valid,
      title: '   ',
      description: null,
      links: [],
    })
    expect(codes(r).sort()).toEqual([
      'description:required',
      'links:required',
      'title:required',
    ])
  })

  it('does not require optional fields (image, collaborators, pitch)', () => {
    expect(validateProjectAnswers(['ecommerce-website'], valid).ok).toBe(true)
  })

  it('requires the terms to be accepted (true)', () => {
    expect(
      codes(
        validateProjectAnswers(['app'], {
          ...valid,
          links: undefined,
          appLinks: ['https://x.is/app'],
          termsAccepted: false,
        }),
      ),
    ).toEqual(['termsAccepted:mustAccept'])
  })

  it('requires the right link field per category', () => {
    const app = { ...valid, links: undefined }
    expect(codes(validateProjectAnswers(['app'], app))).toEqual(['appLinks:required'])
    expect(
      validateProjectAnswers(['app'], {
        ...app,
        appLinks: ['https://apps.apple.com/app/x'],
      }).ok,
    ).toBe(true)
    // app + website needs both
    expect(
      codes(
        validateProjectAnswers(['app', 'ecommerce-website'], {
          ...valid,
          links: undefined,
        }),
      ).sort(),
    ).toEqual(['appLinks:required', 'links:required'])
  })
})

describe('hidden fields are neither required nor validated', () => {
  it('ignores category fields of other categories, even with invalid values', () => {
    const r = validateProjectAnswers(['ecommerce-website'], {
      ...valid,
      school: 'x'.repeat(5000),
      campaignPeriod: 'garbage',
      aiRole: 5,
      appLinks: ['not a url'],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      for (const k of ['school', 'campaignPeriod', 'aiRole', 'appLinks'])
        expect(r.data).not.toHaveProperty(k)
    }
  })

  it('requires category fields once the category is entered', () => {
    expect(codes(validateProjectAnswers(['student-project'], valid)).sort()).toEqual([
      'programme:required',
      'school:required',
    ])
    expect(codes(validateProjectAnswers(['technical-achievement'], valid))).toEqual([
      'technicalAchievement:required',
    ])
    expect(codes(validateProjectAnswers(['ai-solution'], valid))).toEqual([
      'aiRole:required',
    ])
    expect(codes(validateProjectAnswers(['marketing-website'], valid))).toEqual([
      'campaignPeriod:required',
    ])
  })

  it('does not require loginInformation when requiresLogin is false, and drops it', () => {
    const r = validateProjectAnswers(['ecommerce-website'], {
      ...valid,
      requiresLogin: false,
      loginInformation: [{ value: 'x' }],
    })
    expect(r.ok && r.data).not.toHaveProperty('loginInformation')
  })

  it('validates nothing for an empty category list beyond always-visible fields', () => {
    expect(codes(validateProjectAnswers([], {})).sort()).toEqual([
      'description:required',
      'owners:required',
      'publicCredit:required',
      'termsAccepted:required',
      'title:required',
    ])
  })
})

describe('requiresLogin and loginInformation', () => {
  it('loginInformation is required whenever requiresLogin is true', () => {
    expect(
      codes(
        validateProjectAnswers(['ecommerce-website'], { ...valid, requiresLogin: true }),
      ),
    ).toEqual(['loginInformation:required'])
    expect(
      validateProjectAnswers(['ecommerce-website'], {
        ...valid,
        requiresLogin: true,
        loginInformation: [{ label: 'Test', value: 'user / pass', notes: 'n' }],
      }).ok,
    ).toBe(true)
  })

  it('is forced true for logged-in-platform when absent', () => {
    const r = validateProjectAnswers(['logged-in-platform'], valid)
    expect(codes(r)).toEqual(['loginInformation:required'])
    const ok = validateProjectAnswers(['logged-in-platform'], {
      ...valid,
      loginInformation: [{ value: 'x' }],
    })
    expect(ok).toMatchObject({ ok: true, data: { requiresLogin: true } })
  })

  it('rejects an explicit false for logged-in-platform (cannot be changed)', () => {
    const r = validateProjectAnswers(['logged-in-platform'], {
      ...valid,
      requiresLogin: false,
      loginInformation: [{ value: 'x' }],
    })
    expect(codes(r)).toEqual(['requiresLogin:forcedValue'])
  })

  it('accepts an explicit true for logged-in-platform; other categories can choose', () => {
    expect(
      validateProjectAnswers(['logged-in-platform'], {
        ...valid,
        requiresLogin: true,
        loginInformation: [{ value: 'x' }],
      }).ok,
    ).toBe(true)
    expect(
      validateProjectAnswers(['app', 'logged-in-platform'], {
        ...valid,
        links: undefined,
        appLinks: ['https://a.is'],
        requiresLogin: false,
        loginInformation: [{ value: 'x' }],
      }).ok,
    ).toBe(false)
    expect(
      validateProjectAnswers(['ecommerce-website'], { ...valid, requiresLogin: false })
        .ok,
    ).toBe(true)
  })

  it('credential entries need a value, within limits', () => {
    const base = { ...valid, requiresLogin: true }
    expect(
      codes(
        validateProjectAnswers(['ecommerce-website'], {
          ...base,
          loginInformation: [{ label: 'x' }],
        }),
      ),
    ).toEqual(['loginInformation.0.value:required'])
    expect(
      codes(
        validateProjectAnswers(['ecommerce-website'], {
          ...base,
          loginInformation: [{ value: 'x'.repeat(2001) }],
        }),
      ),
    ).toEqual(['loginInformation.0.value:tooLong'])
  })
})

describe('character limits', () => {
  const lengths: Record<string, number> = {}
  for (const f of FIELD_DEFINITIONS) if (f.maxLength) lengths[f.key] = f.maxLength

  it('reads limits from the JSON', () => {
    expect(lengths).toMatchObject({
      title: 80,
      description: 1000,
      categoryPitch: 500,
      publicCredit: 200,
    })
  })

  it('accepts exactly the limit and rejects one over, with the limit in the message', () => {
    for (const key of ['title', 'description', 'publicCredit']) {
      const max = lengths[key]
      expect(
        validateProjectAnswers(['ecommerce-website'], {
          ...valid,
          [key]: 'x'.repeat(max),
        }).ok,
        key,
      ).toBe(true)
      const r = validateProjectAnswers(['ecommerce-website'], {
        ...valid,
        [key]: 'x'.repeat(max + 1),
      })
      expect(codes(r)).toEqual([`${key}:tooLong`])
      expect(errors(r)[0].message.en).toContain(String(max))
      expect(errors(r)[0].message.is).toContain(String(max))
    }
  })

  it('trims before counting', () => {
    expect(
      validateProjectAnswers(['ecommerce-website'], {
        ...valid,
        title: ` ${'x'.repeat(80)} `,
      }).ok,
    ).toBe(true)
  })

  it('counts characters, not bytes', () => {
    expect(
      validateProjectAnswers(['ecommerce-website'], { ...valid, title: 'þ'.repeat(80) })
        .ok,
    ).toBe(true)
  })

  it('applies to category fields and entry pitch', () => {
    expect(
      codes(
        validateProjectAnswers(['ai-solution'], { ...valid, aiRole: 'x'.repeat(1001) }),
      ),
    ).toEqual(['aiRole:tooLong'])
    expect(
      codes(
        validateProjectAnswers(['student-project'], {
          ...valid,
          school: 'x'.repeat(121),
          programme: 'ok',
        }),
      ),
    ).toEqual(['school:tooLong'])
    expect(validateEntryAnswers(['app'], { categoryPitch: 'x'.repeat(500) }).ok).toBe(
      true,
    )
    expect(
      codes(validateEntryAnswers(['app'], { categoryPitch: 'x'.repeat(501) })),
    ).toEqual(['categoryPitch:tooLong'])
  })

  it('rejects wrong types', () => {
    expect(
      codes(validateProjectAnswers(['ecommerce-website'], { ...valid, title: 5 })),
    ).toEqual(['title:invalidType'])
  })
})

describe('urls', () => {
  const check = (links: unknown) =>
    validateProjectAnswers(['ecommerce-website'], { ...valid, links })

  it('accepts http(s) links, trimmed', () => {
    expect(
      check(['https://svef.is', 'http://example.com/path?q=1#x', ' https://a.b/c ']).ok,
    ).toBe(true)
  })

  it.each([
    'svef.is',
    'ftp://svef.is',
    'javascript:alert(1)',
    'https://',
    'https://localhost',
    'not a url',
    'https://x.is ok',
  ])('rejects %s', (bad) => {
    expect(codes(check([bad]))).toEqual(['links.0:invalidUrl'])
  })

  it('points at the bad item and keeps the good ones valid', () => {
    expect(
      codes(check(['https://svef.is', 'nope', 'https://ok.is', 'also nope'])),
    ).toEqual(['links.1:invalidUrl', 'links.3:invalidUrl'])
  })

  it('rejects overlong urls and non-lists', () => {
    expect(codes(check([`https://x.is/${'a'.repeat(2050)}`]))).toEqual([
      'links.0:tooLong',
    ])
    expect(codes(check('https://svef.is'))).toEqual(['links:invalidType'])
  })

  it('validates the optional single url (archived copy) only when given', () => {
    const base = { ...valid, campaignPeriod: { start: '2026-01-01', end: '2026-02-01' } }
    expect(validateProjectAnswers(['marketing-website'], base).ok).toBe(true)
    expect(
      validateProjectAnswers(['marketing-website'], {
        ...base,
        campaignArchive: 'https://web.archive.org/x',
      }).ok,
    ).toBe(true)
    expect(
      codes(
        validateProjectAnswers(['marketing-website'], {
          ...base,
          campaignArchive: 'nope',
        }),
      ),
    ).toEqual(['campaignArchive:invalidUrl'])
    expect(
      validateProjectAnswers(['marketing-website'], { ...base, campaignArchive: '' }).ok,
    ).toBe(true)
  })
})

describe('date_range', () => {
  const check = (campaignPeriod: unknown) =>
    validateProjectAnswers(['marketing-website'], { ...valid, campaignPeriod })

  it('accepts start <= end, including a single day', () => {
    expect(check({ start: '2026-03-01', end: '2026-03-31' }).ok).toBe(true)
    expect(check({ start: '2026-03-01', end: '2026-03-01' }).ok).toBe(true)
  })

  it('rejects an end before the start, on the end field', () => {
    expect(codes(check({ start: '2026-03-02', end: '2026-03-01' }))).toEqual([
      'campaignPeriod.end:invalidDateRange',
    ])
  })

  it('rejects malformed and impossible dates', () => {
    expect(codes(check({ start: '2026-02-30', end: '2026-03-01' }))).toEqual([
      'campaignPeriod.start:invalidDate',
    ])
    expect(codes(check({ start: '1.3.2026', end: '2026-03-01' }))).toEqual([
      'campaignPeriod.start:invalidDate',
    ])
    expect(codes(check({ start: '2026-03-01' }))).toEqual(['campaignPeriod.end:required'])
    expect(codes(check('2026-03-01'))).toEqual(['campaignPeriod:invalidType'])
  })

  it('accepts a leap day only in a leap year', () => {
    expect(check({ start: '2028-02-29', end: '2028-03-01' }).ok).toBe(true)
    expect(codes(check({ start: '2027-02-29', end: '2027-03-01' }))).toEqual([
      'campaignPeriod.start:invalidDate',
    ])
  })
})

describe('person_list: owners', () => {
  const check = (owners: unknown) =>
    validateProjectAnswers(['ecommerce-website'], { ...valid, owners })

  it('needs at least one owner with name and email; company is optional', () => {
    expect(check([{ name: 'A', email: 'a@b.is' }]).ok).toBe(true)
    expect(
      check([
        { name: 'A', email: 'a@b.is', company: 'Co' },
        { name: 'B', email: 'b@b.is' },
      ]).ok,
    ).toBe(true)
    expect(codes(check([]))).toEqual(['owners:required'])
  })

  it('requires name and email on each owner', () => {
    expect(codes(check([{ company: 'Co' }])).sort()).toEqual([
      'owners.0.email:required',
      'owners.0.name:required',
    ])
    expect(codes(check([owner, { name: 'B' }]))).toEqual(['owners.1.email:required'])
  })

  it('validates the email and the limits', () => {
    expect(codes(check([{ name: 'A', email: 'nope' }]))).toEqual([
      'owners.0.email:invalidEmail',
    ])
    expect(codes(check([{ name: 'x'.repeat(121), email: 'a@b.is' }]))).toEqual([
      'owners.0.name:tooLong',
    ])
    expect(codes(check([{ ...owner, company: 'x'.repeat(121) }]))).toEqual([
      'owners.0.company:tooLong',
    ])
  })

  it('does not require an email only because canEdit is false', () => {
    expect(check([{ ...owner, canEdit: false }]).ok).toBe(true)
  })
})

describe('person_list: collaborators', () => {
  const check = (collaborators: unknown) =>
    validateProjectAnswers(['ecommerce-website'], { ...valid, collaborators })

  it('is optional and may be empty', () => {
    expect(check(undefined).ok).toBe(true)
    expect(check([]).ok).toBe(true)
  })

  it('needs name and role; email is optional without canEdit', () => {
    expect(check([{ name: 'B', role: 'Design' }]).ok).toBe(true)
    expect(check([{ name: 'B', role: 'Design', canEdit: false }]).ok).toBe(true)
    expect(codes(check([{ name: 'B' }]))).toEqual(['collaborators.0.role:required'])
    expect(codes(check([{ role: 'Dev' }]))).toEqual(['collaborators.0.name:required'])
  })

  it('requires an email exactly when canEdit is true', () => {
    expect(codes(check([{ name: 'B', role: 'Dev', canEdit: true }]))).toEqual([
      'collaborators.0.email:emailRequiredForEditor',
    ])
    expect(
      codes(check([{ name: 'B', role: 'Dev', canEdit: true, email: '  ' }])),
    ).toEqual(['collaborators.0.email:emailRequiredForEditor'])
    expect(check([{ name: 'B', role: 'Dev', canEdit: true, email: 'b@x.is' }]).ok).toBe(
      true,
    )
    expect(check([{ name: 'B', role: 'Dev', email: 'b@x.is' }]).ok).toBe(true)
  })

  it('validates a given email even without canEdit; role limit is 80', () => {
    expect(codes(check([{ name: 'B', role: 'Dev', email: 'bad' }]))).toEqual([
      'collaborators.0.email:invalidEmail',
    ])
    expect(codes(check([{ name: 'B', role: 'x'.repeat(81) }]))).toEqual([
      'collaborators.0.role:tooLong',
    ])
  })

  it('indexes errors per item', () => {
    expect(
      codes(
        check([
          { name: 'B', role: 'Dev' },
          { name: 'C', role: 'Dev', canEdit: true },
        ]),
      ),
    ).toEqual(['collaborators.1.email:emailRequiredForEditor'])
  })
})

describe('image field value', () => {
  it('is optional, and needs a file id when given', () => {
    expect(
      validateProjectAnswers(['ecommerce-website'], {
        ...valid,
        image: { fileId: 'abc' },
      }).ok,
    ).toBe(true)
    expect(
      codes(
        validateProjectAnswers(['ecommerce-website'], {
          ...valid,
          image: { fileId: '' },
        }),
      ),
    ).toEqual(['image.fileId:required'])
  })
})

describe('draft mode (autosave)', () => {
  it('accepts incomplete input but still checks formats and limits', () => {
    expect(validateProjectAnswers(['app', 'logged-in-platform'], {}, 'draft')).toEqual({
      ok: true,
      data: { requiresLogin: true },
    })
    expect(
      validateProjectAnswers(['app'], { owners: [{ name: 'A' }], links: [] }, 'draft').ok,
    ).toBe(true)
    expect(
      codes(
        validateProjectAnswers(
          ['app'],
          { title: 'x'.repeat(81), appLinks: ['nope'] },
          'draft',
        ),
      ).sort(),
    ).toEqual(['appLinks.0:invalidUrl', 'title:tooLong'])
  })

  it('still enforces the forced value and the canEdit/email rule', () => {
    expect(
      codes(
        validateProjectAnswers(['logged-in-platform'], { requiresLogin: false }, 'draft'),
      ),
    ).toEqual(['requiresLogin:forcedValue'])
    expect(
      codes(
        validateProjectAnswers(
          [],
          { collaborators: [{ name: 'A', canEdit: true }] },
          'draft',
        ),
      ),
    ).toEqual(['collaborators.0.email:emailRequiredForEditor'])
  })
})

describe('every category is valid with a complete answer set', () => {
  const full = {
    ...valid,
    links: ['https://a.is'],
    appLinks: ['https://a.is/app'],
    technicalAchievement: 'x',
    aiRole: 'x',
    school: 'x',
    programme: 'x',
    campaignPeriod: { start: '2026-01-01', end: '2026-01-02' },
    loginInformation: [{ value: 'x' }],
  }
  for (const c of CATEGORIES) {
    it(c.slug, () => {
      expect(validateProjectAnswers([c.slug], full).ok).toBe(true)
    })
  }
})

describe('validateImageMeta', () => {
  const ok = { width: 1080, height: 1080, type: 'image/png', bytes: 1000 }

  it('accepts a conforming image, including exactly 10 MB and JPG', () => {
    expect(validateImageMeta(ok)).toEqual([])
    expect(
      validateImageMeta({ ...ok, type: 'image/jpeg', bytes: 10 * 1024 * 1024 }),
    ).toEqual([])
  })

  it('reports exact dimensions feedback', () => {
    const [e] = validateImageMeta({ ...ok, width: 1200, height: 800 })
    expect(e.code).toBe('imageDimensions')
    expect(e.message.en).toBe('This image is 1200 × 800, it needs to be 1080 × 1080.')
  })

  it('rejects wrong types and sizes one byte over', () => {
    expect(validateImageMeta({ ...ok, type: 'image/gif' }).map((e) => e.code)).toEqual([
      'imageType',
    ])
    expect(
      validateImageMeta({ ...ok, bytes: 10 * 1024 * 1024 + 1 }).map((e) => e.code),
    ).toEqual(['imageSize'])
    expect(
      validateImageMeta({ width: 1, height: 1, type: 'x', bytes: 1e9 }).map(
        (e) => e.code,
      ),
    ).toEqual(['imageType', 'imageDimensions', 'imageSize'])
  })
})

describe('messages', () => {
  it('fills parameters and falls back for unknown codes', () => {
    expect(formatError('tooLong', { max: 80 }).en).toBe('Must be at most 80 characters.')
    expect(formatError('nonsense')).toEqual(formatError('invalid'))
    expect(formatError('tooFewItems')).toEqual({
      is: expect.stringContaining('{min}'),
      en: expect.stringContaining('{min}'),
    })
  })
})
