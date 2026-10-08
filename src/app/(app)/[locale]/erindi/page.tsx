import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDictionary, isLocale } from '@/lib/i18n'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Section } from '@/components/Section/Section'
import { TalkProposalForm } from '@/components/TalkProposalForm/TalkProposalForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: getDictionary(locale).forms.talk.title }
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const forms = getDictionary(locale).forms

  return (
    <>
      <PageHeader title={forms.talk.title} lead={forms.talk.lead} />
      <Section>
        <TalkProposalForm locale={locale} copy={forms} />
      </Section>
    </>
  )
}
