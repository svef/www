import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { ContactForm } from '@/components/ContactForm/ContactForm'
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

  return (
    <>
      <PageHeader title={c.title} lead={c.lead} />
      <Section>
        <div className={styles.layout}>
          <div className={styles.direct}>
            <h2 className={styles.subhead}>{c.reachUs}</h2>
            <a href="mailto:svef@svef.is" className={styles.email}>
              svef@svef.is
            </a>
            <ul className={styles.socials}>
              <li>
                <a href="#">Facebook</a>
              </li>
              <li>
                <a href="#">Instagram</a>
              </li>
              <li>
                <a href="#">X</a>
              </li>
              <li>
                <a href="#">LinkedIn</a>
              </li>
            </ul>
          </div>
          <ContactForm labels={c.labels} />
        </div>
      </Section>
    </>
  )
}
