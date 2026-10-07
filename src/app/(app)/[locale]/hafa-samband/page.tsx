import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { ContactForm } from '@/components/ContactForm/ContactForm'
import { SocialIcon } from '@/components/SocialIcon/SocialIcon'
import { getSiteChrome } from '@/lib/content/site-settings'
import styles from './contact.module.scss'

const content: Record<
  Locale,
  {
    title: string
    lead: string
    reachUs: string
    labels: { name: string; email: string; message: string; submit: string; success: string }
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
      <PageHeader title={c.title} lead={c.lead} />
      <Section>
        <div className={styles.layout}>
          <div className={styles.direct}>
            <h2 className={styles.subhead}>{c.reachUs}</h2>
            <a href={`mailto:${chrome.contactEmail}`} className={styles.email}>
              {chrome.contactEmail}
            </a>
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
          </div>
          <ContactForm labels={c.labels} />
        </div>
      </Section>
    </>
  )
}
