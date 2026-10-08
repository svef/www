import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { FeedbackForm } from '@/components/FeedbackForm/FeedbackForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: getDictionary(locale).forms.feedback.title }
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const forms = getDictionary(locale).forms

  return (
    <>
      <PageHeader title={forms.feedback.title} lead={forms.feedback.lead} />
      <Section>
        <FeedbackForm locale={locale} copy={forms} />
      </Section>
    </>
  )
}
