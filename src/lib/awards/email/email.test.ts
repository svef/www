// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const send = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import {
  OUTBOX_DIR,
  passwordResetEmail,
  receiptEmail,
  requestOpenedEmail,
  requestReminderEmail,
  sendEmail,
  verificationEmail,
} from './index'

const URL_ = 'https://svef.is/api/account/verify-email?token=abc&callbackURL=%2Fis'

describe('templates', () => {
  it.each(['is', 'en'] as const)('verification (%s) carries the link in text and html', (locale) => {
    const mail = verificationEmail({ locale, name: 'Anna', url: URL_ })
    expect(mail.subject).toBeTruthy()
    expect(mail.text).toContain(URL_)
    expect(mail.text).toContain('Anna')
    expect(mail.html).toContain(`lang="${locale}"`)
    expect(mail.html).toContain('href="https://svef.is/api/account/verify-email?token=abc&amp;callbackURL=%2Fis"')
  })

  it('reset differs from verification and is localised', () => {
    const is = passwordResetEmail({ locale: 'is', name: 'Anna', url: URL_ })
    const en = passwordResetEmail({ locale: 'en', name: 'Anna', url: URL_ })
    expect(is.subject).not.toBe(en.subject)
    expect(en.subject).toMatch(/password/i)
    expect(is.subject).not.toBe(verificationEmail({ locale: 'is', name: 'Anna', url: URL_ }).subject)
  })

  it('escapes the name in html', () => {
    const mail = verificationEmail({ locale: 'en', name: '<script>x</script>', url: URL_ })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })
})

describe('receipt', () => {
  const input = {
    name: 'Anna',
    projectTitle: 'Fjallavefurinn <3',
    entries: [
      { category: 'Marketing Website', amount: 10900, early: true },
      { category: 'App', amount: 6900, early: false },
    ],
    billing: { companyName: 'Fjall ehf.', kennitala: '5902697199' },
    url: 'https://svef.is/en/submissions/abc',
  }
  it('lists the entries with their locked prices, the total, the billing profile and the invoice note', () => {
    const mail = receiptEmail({ ...input, locale: 'en' })
    expect(mail.subject).toMatch(/^Receipt/)
    expect(mail.text).toContain('Marketing Website: 10,900 kr. (early-bird price)')
    expect(mail.text).toContain('App: 6,900 kr. (regular price)')
    expect(mail.text).toContain('Total: 17,800 kr.')
    expect(mail.text).toContain('Fjall ehf., kt. 5902697199')
    expect(mail.text).toMatch(/invoice is sent after submissions close/)
    expect(mail.text).toContain(input.url)
    expect(mail.html).toContain('lang="en"')
    expect(mail.html).toContain('Fjallavefurinn &lt;3')
  })
  it('is in Icelandic for an Icelandic submitter', () => {
    const mail = receiptEmail({ ...input, locale: 'is' })
    expect(mail.subject).toMatch(/^Kvittun/)
    expect(mail.text).toContain('Samtals: 17.800 kr.')
    expect(mail.text).toContain('Reikningur er sendur eftir að innsendingum lýkur')
    expect(mail.html).toContain('lang="is"')
  })
})

describe('sendEmail', () => {
  let dir: string
  const original = { ...process.env }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'awards-outbox-'))
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    send.mockReset()
    delete process.env.RESEND_API_KEY
    delete process.env.AWARDS_EMAIL_FROM
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    process.env = { ...original }
    await rm(dir, { recursive: true, force: true })
  })

  const message = { to: 'a@example.is', subject: 'S', text: 'T', html: '<p>T</p>' }

  it('writes to the outbox outside production when there is no key', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    await sendEmail(message)
    const files = await readdir(path.join(dir, OUTBOX_DIR))
    expect(files).toHaveLength(1)
    const saved = JSON.parse(await readFile(path.join(dir, OUTBOX_DIR, files[0]), 'utf8'))
    expect(saved).toMatchObject({ to: 'a@example.is', subject: 'S', text: 'T' })
    expect(send).not.toHaveBeenCalled()
  })

  it('errors in production when the key is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await expect(sendEmail(message)).rejects.toThrow(/RESEND_API_KEY/)
  })

  it('allows the outbox in a production build only when opted in, never on Vercel production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AWARDS_EMAIL_OUTBOX', '1')
    await sendEmail(message)
    expect(await readdir(path.join(dir, OUTBOX_DIR))).toHaveLength(1)
    vi.stubEnv('VERCEL_ENV', 'production')
    await expect(sendEmail(message)).rejects.toThrow(/RESEND_API_KEY/)
  })

  it('sends through Resend when a key is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('AWARDS_EMAIL_FROM', 'SVEF <verdlaun@svef.is>')
    send.mockResolvedValue({ data: { id: '1' }, error: null })
    await sendEmail(message)
    expect(send).toHaveBeenCalledWith({
      from: 'SVEF <verdlaun@svef.is>',
      to: 'a@example.is',
      subject: 'S',
      text: 'T',
      html: '<p>T</p>',
    })
  })

  it('needs a sender when sending for real, and surfaces Resend errors', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    await expect(sendEmail(message)).rejects.toThrow(/AWARDS_EMAIL_FROM/)
    vi.stubEnv('AWARDS_EMAIL_FROM', 'x@svef.is')
    send.mockResolvedValue({ data: null, error: { message: 'nope' } })
    await expect(sendEmail(message)).rejects.toThrow(/nope/)
  })
})

describe('request emails', () => {
  const input = {
    name: 'Anna',
    projectTitle: 'Fjallavefur <b>',
    category: 'Marketing Website',
    message: 'Fix the <title> please',
    fields: ['Project title', 'Project links'],
    deadlineAt: new Date('2027-03-08T14:30:00Z'),
    url: 'https://svef.is/en/submissions/abc#requests',
  }

  it('opened: message, fields, deadline in UTC and the link, in English', () => {
    const mail = requestOpenedEmail({ ...input, locale: 'en' })
    expect(mail.subject).toBe('A request from SVEF: Fjallavefur <b>')
    expect(mail.text).toContain('Fix the <title> please')
    expect(mail.text).toContain('Project title, Project links')
    expect(mail.text).toContain('Deadline: 8 March 2027')
    expect(mail.text).toContain('14:30 UTC')
    expect(mail.text).toContain(input.url)
    expect(mail.html).toContain('lang="en"')
    expect(mail.html).toContain('href="https://svef.is/en/submissions/abc#requests"')
  })

  it('opened: Icelandic', () => {
    const mail = requestOpenedEmail({ ...input, locale: 'is' })
    expect(mail.subject).toMatch(/^Beiðni frá SVEF/)
    expect(mail.text).toContain('Frestur: 8. mars 2027')
    expect(mail.html).toContain('lang="is"')
  })

  it('escapes entrant and staff text in html', () => {
    const mail = requestOpenedEmail({ ...input, locale: 'en' })
    expect(mail.html).not.toContain('<title>')
    expect(mail.html).not.toContain('<b>')
    expect(mail.html).toContain('Fix the &lt;title&gt; please')
  })

  it('a question with no fields leaves the fields line out', () => {
    const mail = requestOpenedEmail({ ...input, fields: [], locale: 'en' })
    expect(mail.text).not.toContain('Fields you can change')
  })

  it('the reminder differs from the opening and says the deadline is near', () => {
    const opened = requestOpenedEmail({ ...input, locale: 'en' })
    const reminder = requestReminderEmail({ ...input, locale: 'en' })
    expect(reminder.subject).not.toBe(opened.subject)
    expect(reminder.subject).toMatch(/^Reminder/)
    expect(reminder.text).toContain('24 hours')
    expect(requestReminderEmail({ ...input, locale: 'is' }).subject).toMatch(/^Áminning/)
  })
})
