import type { Locale } from '@/lib/i18n'

/** A rendered message: plain text first, HTML as the same content with a button. */
export interface EmailContent {
  subject: string
  text: string
  html: string
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

interface Copy {
  greeting: (name: string) => string
  signoff: string
  ignore: string
  /** Shown above the raw link, for clients that do not render the button. */
  linkFallback: string
  verification: { subject: string; intro: string; button: string; expiry: string }
  reset: { subject: string; intro: string; button: string; expiry: string }
}

const copy: Record<Locale, Copy> = {
  is: {
    greeting: (name) => (name ? `Sæl/l ${name},` : 'Sæl/l,'),
    signoff: 'Kveðja,\nSVEF, Samtök vefiðnaðarins',
    ignore: 'Ef þú baðst ekki um þetta geturðu hunsað þennan póst.',
    linkFallback: 'Virkar hnappurinn ekki? Afritaðu þennan tengil í vafrann:',
    verification: {
      subject: 'Staðfestu netfangið þitt – Íslensku vefverðlaunin',
      intro:
        'Takk fyrir að stofna aðgang hjá SVEF. Staðfestu netfangið þitt til að geta sent inn verkefni.',
      button: 'Staðfesta netfang',
      expiry: 'Tengillinn gildir í eina klukkustund.',
    },
    reset: {
      subject: 'Endurstilltu lykilorðið þitt – SVEF',
      intro: 'Við fengum beiðni um að endurstilla lykilorðið á aðganginum þínum hjá SVEF.',
      button: 'Velja nýtt lykilorð',
      expiry: 'Tengillinn gildir í eina klukkustund.',
    },
  },
  en: {
    greeting: (name) => (name ? `Hello ${name},` : 'Hello,'),
    signoff: 'Best regards,\nSVEF, the Icelandic Web Industry Association',
    ignore: 'If you did not ask for this, you can ignore this email.',
    linkFallback: 'Button not working? Copy this link into your browser:',
    verification: {
      subject: 'Confirm your email address – Icelandic Web Awards',
      intro:
        'Thanks for creating an account with SVEF. Confirm your email address so you can submit entries.',
      button: 'Confirm email address',
      expiry: 'The link is valid for one hour.',
    },
    reset: {
      subject: 'Reset your password – SVEF',
      intro: 'We received a request to reset the password for your SVEF account.',
      button: 'Choose a new password',
      expiry: 'The link is valid for one hour.',
    },
  },
}

function render(
  locale: Locale,
  name: string,
  url: string,
  part: Copy['verification'],
): EmailContent {
  const c = copy[locale]
  const text = [
    c.greeting(name),
    '',
    part.intro,
    '',
    url,
    '',
    part.expiry,
    c.ignore,
    '',
    c.signoff,
  ].join('\n')

  const paragraph = (value: string) =>
    `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fcfbfe;color:#09060c;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto">
${paragraph(c.greeting(name))}
${paragraph(part.intro)}
<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#8917e1;color:#fcfbfe;padding:12px 20px;text-decoration:none;font-weight:bold">${escapeHtml(part.button)}</a></p>
${paragraph(part.expiry)}
<p style="margin:0 0 4px;font-size:14px">${escapeHtml(c.linkFallback)}</p>
<p style="margin:0 0 24px;font-size:14px;word-break:break-all"><a href="${escapeHtml(url)}" style="color:#8917e1">${escapeHtml(url)}</a></p>
${paragraph(c.ignore)}
<p style="margin:0;white-space:pre-line">${escapeHtml(c.signoff)}</p>
</div>
</body>
</html>`
  return { subject: part.subject, text, html }
}

export function verificationEmail(input: {
  locale: Locale
  name: string
  url: string
}): EmailContent {
  return render(input.locale, input.name, input.url, copy[input.locale].verification)
}

export function passwordResetEmail(input: {
  locale: Locale
  name: string
  url: string
}): EmailContent {
  return render(input.locale, input.name, input.url, copy[input.locale].reset)
}
