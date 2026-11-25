import { cardMetadata } from '@/lib/og/metadata'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { PageHead } from '@/components/PageHead/PageHead'
import { PageSection } from '@/components/PageSection/PageSection'
import styles from '../form-page.module.scss'
import { FeedbackForm } from '@/components/FeedbackForm/FeedbackForm'

export const generateMetadata = cardMetadata('abendingar')

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const forms = getDictionary(locale).forms

  return (
    <>
      <PageHead title={forms.feedback.title} lede={forms.feedback.lead} locale={locale} />
      <PageSection last>
        <div className={styles.page}>
          <FeedbackForm locale={locale} copy={forms} />
        </div>
      </PageSection>
    </>
  )
}
