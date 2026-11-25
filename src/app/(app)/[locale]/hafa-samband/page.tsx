import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import { FormHead } from '@/components/FormParts/FormParts'
import { ContactForm, type ContactFormLabels } from '@/components/ContactForm/ContactForm'
import { SocialIcon } from '@/components/SocialIcon/SocialIcon'
import { getSiteChrome } from '@/lib/content/site-settings'
import styles from './contact.module.scss'
import page from '../form-page.module.scss'
import { cardMetadata } from '@/lib/og/metadata'

export const generateMetadata = cardMetadata('hafa-samband')

const content: Record<
  Locale,
  {
    title: string
    lead: string
    reachUs: string
    labels: ContactFormLabels
  }
> = {
  is: {
    title: 'Hafa samband',
    lead: 'Spurningar um félagsaðild, viðburði eða vefverðlaunin? Sendu okkur línu.',
    reachUs: 'Beint samband',
    labels: {
      name: 'Nafn',
      email: 'Netfang',
      message: 'Skilaboð',
      submit: 'Senda',
      success: 'Takk! Við höfum samband við þig fljótlega.',
      steps: { about: 'Um þig', send: 'Senda' },
      formLabel: 'Senda skilaboð',
    },
  },
  en: {
    title: 'Contact',
    lead: 'Questions about membership, events or the Web Awards? Drop us a line.',
    reachUs: 'Reach us directly',
    labels: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      submit: 'Send',
      success: 'Thanks! We’ll get back to you soon.',
      steps: { about: 'About you', send: 'Send' },
      formLabel: 'Send a message',
    },
  },
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const c = content[locale]
  const chrome = await getSiteChrome(locale)

  return (
    <>
      <PageHead title={c.title} lede={c.lead} stickers="hafa-samband" locale={locale} />
      <PageSection last>
        <div className={page.page}>
          <FormHead id="c-heading" title={c.reachUs}>
            <div className={styles.direct}>
              <h2 id="c-heading" className={styles.title}>
                {c.reachUs}
              </h2>
              <a href={`mailto:${chrome.contactEmail}`} className={styles.email}>
                {chrome.contactEmail}
              </a>
            </div>
            {chrome.socials.length > 0 && (
              <ul className={styles.socials}>
                {chrome.socials.map((social) => (
                  <li key={social.name}>
                    <a href={social.href} aria-label={social.name}>
                      <SocialIcon name={social.icon} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </FormHead>
          <ContactForm labels={c.labels} />
        </div>
      </PageSection>
    </>
  )
}
