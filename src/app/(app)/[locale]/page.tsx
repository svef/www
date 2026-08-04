import { getDictionary, isLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

// Placeholder home page. Real sections come from the design-system translation +
// Payload data (HomePage global, Events, AwardWinners, Galleries).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  getDictionary(locale)

  return (
    <section style={{ padding: '4rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
        SVEF
      </h1>
      <p style={{ fontSize: '1.25rem', maxWidth: 640 }}>
        Samtök vefiðnaðarins — fagfélag fólksins sem býr til vefinn á Íslandi.
      </p>
      <p style={{ opacity: 0.6 }}>Scaffold placeholder — locale: {locale}</p>
    </section>
  )
}
