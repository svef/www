import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/awards/auth/session'
import { getAwardsDb } from '@/lib/awards/db/client'
import type { FieldDefinition } from '@/lib/awards/fields'
import { signedImageUrl } from '@/lib/awards/files/images'
import { getObjectStore, isStoreConfigured } from '@/lib/awards/files/store'
import { requestableFields } from '@/lib/awards/requests/fields'
import { listRequestsForEntry } from '@/lib/awards/requests/service'
import { serverNow } from '@/lib/awards/staff/clock'
import { getStaffEntryView, type StaffEntryEvent } from '@/lib/awards/staff/entry-view'
import { isLocale, localePath, type Locale } from '@/lib/i18n'
import { AppHead } from '@/components/AppHead/AppHead'
import { inputClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import { entryCopy } from '../entry-copy'
import styles from '../staff.module.scss'
import { transferProjectAction } from './actions'
import { CredentialsViewer } from './CredentialsViewer'
import { Requests } from './Requests'

/**
 * The staff entry view (svef/www#168): the admin-only fields first, then what the
 * jury will see laid out like a read-only entry, the login details (decrypted on demand), the
 * history, and the transfer. Rendered per request: it reads the session. A non-staff visitor
 * gets a 404 (`requireStaff`), and so does an id that matches no entry.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Search = {
  transferred?: string
  transfer_error?: string
  request?: string
  mail?: string
  request_error?: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n)}…` : s)
const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))

function describe(e: StaffEntryEvent, c: (typeof entryCopy)[Locale]): string {
  const data = (e.data ?? {}) as Record<string, unknown>
  if (e.type === 'project_transferred')
    return `${data.fromEmail ?? '?'} → ${data.toEmail ?? '?'}`
  if (e.type === 'credentials_viewed')
    return typeof data.count === 'number' ? `${data.count}` : ''
  if (e.type === 'invoicing_exported')
    return typeof data.format === 'string' ? data.format.toUpperCase() : ''
  const before = (e.before ?? null) as Record<string, unknown> | null
  const after = (e.after ?? null) as Record<string, unknown> | null
  if (e.type.startsWith('request_') && typeof data.requestId === 'string') {
    if (e.type === 'request_opened' && typeof data.deadlineAt === 'string')
      return `${c.requestDeadline} ${data.deadlineAt.slice(0, 16).replace('T', ' ')} UTC`
    if (e.type === 'request_resolved')
      return data.by === 'staff' ? c.resolvedByStaff : c.resolvedByEntrant
    return ''
  }
  if (
    (e.type === 'eligibility_changed' || e.type === 'status_changed') &&
    after &&
    typeof after.status === 'string'
  ) {
    const to = c.status_[after.status as keyof typeof c.status_] ?? after.status
    const from =
      before && typeof before.status === 'string'
        ? (c.status_[before.status as keyof typeof c.status_] ?? before.status)
        : '?'
    return `${from} → ${to}`
  }
  if (e.fieldKey) {
    return clip(
      `${e.fieldKey}: ${e.before === null ? '∅' : show(e.before)} → ${e.after === null ? '∅' : show(e.after)}`,
    )
  }
  return ''
}

function Link({ href }: { href: string }) {
  // Entrants type these; only web links become links.
  return /^https?:\/\//i.test(href) ? (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {href}
    </a>
  ) : (
    <>{href}</>
  )
}

function Value({
  field,
  value,
  c,
}: {
  field: FieldDefinition
  value: unknown
  c: (typeof entryCopy)[Locale]
}) {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
    return <span className={styles.muted}>{c.empty}</span>
  switch (field.type) {
    case 'boolean':
      return <>{value ? c.yes : c.no}</>
    case 'url':
      return <Link href={String(value)} />
    case 'url_list':
      return (
        <ul className={styles.plainList}>
          {(value as string[]).map((u, i) => (
            <li key={i}>
              <Link href={u} />
            </li>
          ))}
        </ul>
      )
    case 'date_range': {
      const r = value as { start?: string; end?: string }
      return <>{`${r.start ?? '?'} – ${r.end ?? '?'}`}</>
    }
    case 'long_text':
      return <span className={styles.pre}>{String(value)}</span>
    default:
      return <>{typeof value === 'string' ? value : JSON.stringify(value)}</>
  }
}

export default async function StaffEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; entryId: string }>
  searchParams: Promise<Search>
}) {
  const { locale, entryId } = await params
  if (!isLocale(locale)) notFound()
  const here = localePath(`/innsendingar/starfsfolk/${entryId}`, locale)
  await requireStaff({ locale, next: here })
  if (!UUID.test(entryId)) notFound()

  const view = await getStaffEntryView(getAwardsDb(), entryId)
  if (!view) notFound()
  const c = entryCopy[locale]
  const search = await searchParams
  // Requests are judged on the staff clock, like the rest of the staff area.
  const staffNow = serverNow()
  const requests = await listRequestsForEntry(getAwardsDb(), entryId, staffNow)
  const fields = await requestableFields(getAwardsDb(), entryId)
  // A short-lived signed URL: the bucket is private. No bucket (not configured) just means no preview.
  const imageUrl =
    view.imageKey && isStoreConfigured()
      ? await signedImageUrl(getObjectStore(), view.imageKey).catch(() => null)
      : null
  const people = (kind: 'owner' | 'collaborator') =>
    view.people.filter((p) => p.kind === kind)
  const label = (f: FieldDefinition) => f.label[locale]
  const adminAnswerFields = view.adminFields.filter(
    (f) => f.key !== 'owners' && f.key !== 'collaborators' && f.key !== 'image',
  )
  const listHref = localePath('/innsendingar/starfsfolk', locale)

  const peopleTable = (kind: 'owner' | 'collaborator') => {
    const rows = people(kind)
    const heading = kind === 'owner' ? c.owners : c.collaborators
    return (
      <>
        <h3 className={styles.subheading}>{heading}</h3>
        {rows.length === 0 ? (
          <p className={styles.text}>{c.peopleNone}</p>
        ) : (
          <div
            className={styles.tableWrap}
            role="region"
            tabIndex={0}
            aria-label={c.tableRegion(heading)}
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>{heading}</caption>
              <thead>
                <tr>
                  <th scope="col">{c.colName}</th>
                  <th scope="col">{c.colEmail}</th>
                  <th scope="col">{kind === 'owner' ? c.colCompany : c.colRole}</th>
                  {kind === 'collaborator' && <th scope="col">{c.colEdit}</th>}
                  {kind === 'collaborator' && <th scope="col">{c.colAccount}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name || '–'}</th>
                    <td>{p.email ?? '–'}</td>
                    <td>{(kind === 'owner' ? p.company : p.role) ?? '–'}</td>
                    {kind === 'collaborator' && <td>{p.canEdit ? c.yes : c.no}</td>}
                    {kind === 'collaborator' && (
                      <td>
                        {p.accountEmail
                          ? `${c.accepted}: ${p.accountEmail}`
                          : p.canEdit
                            ? p.invitedAt
                              ? c.invited
                              : c.notInvited
                            : '–'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <AppHead
        title={c.title}
        eyebrow={c.eyebrow}
        lede={`${view.categoryName[locale]} · ${view.editionYear}`}
        crumb={{ href: listHref, label: c.back }}
      />

      <div className={styles.page}>
        {(search.transferred || search.transfer_error) && (
          <div role="status" className={styles.result} data-testid="result">
            {search.transferred ? (
              <p>{c.transferDone(search.transferred)}</p>
            ) : (
              <p>
                {c.transferErrors[
                  search.transfer_error as keyof typeof c.transferErrors
                ] ?? c.transferErrors.invalid_email}
              </p>
            )}
          </div>
        )}

        <section
          aria-labelledby="admin-fields"
          data-testid="admin-section"
          className={styles.part}
        >
          <h2 id="admin-fields" className={styles.heading}>
            {c.adminTitle}
          </h2>
          <p className={styles.text}>{c.adminLead}</p>
          <dl className={styles.facts}>
            <dt>{c.category}</dt>
            <dd>{view.categoryName[locale]}</dd>
            <dt>{c.status}</dt>
            <dd>
              <span
                className={styles.tag}
                data-status={view.status}
                data-testid="entry-status"
              >
                {c.status_[view.status]}
              </span>
            </dd>
            <dt>{c.submitted}</dt>
            <dd>{view.submittedAt ? stamp(view.submittedAt) : '–'}</dd>
            <dt>{c.price}</dt>
            <dd>
              {view.price
                ? c.priceValue(
                    view.price.amount,
                    view.price.regular,
                    view.price.discountPercent,
                  )
                : c.notPriced}
            </dd>
            <dt>{c.creator}</dt>
            <dd data-testid="creator">{`${view.creator.name} <${view.creator.email}>`}</dd>
            <dt>{c.locale}</dt>
            <dd>{view.locale}</dd>
          </dl>

          {peopleTable('owner')}
          {peopleTable('collaborator')}

          <h3 className={styles.subheading}>{c.billing}</h3>
          {view.billing ? (
            <dl className={styles.facts}>
              <dt>{c.billing}</dt>
              <dd>{view.billing.companyName}</dd>
              <dt>{c.kennitala}</dt>
              <dd>{view.billing.kennitala}</dd>
              <dt>{c.invoiceEmail}</dt>
              <dd>{view.billing.invoiceEmail}</dd>
              <dt>{c.address}</dt>
              <dd>{view.billing.address}</dd>
              {view.billing.reference && (
                <>
                  <dt>{c.reference}</dt>
                  <dd>{view.billing.reference}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className={styles.text}>{c.billingMissing}</p>
          )}

          <h3 className={styles.subheading}>{c.summary}</h3>
          <dl className={styles.facts}>
            <dt>{c.image}</dt>
            <dd>
              {view.image
                ? c.imageValue(
                    view.image.fileName,
                    view.image.contentType,
                    Math.round(view.image.sizeBytes / 1024),
                    view.image.status,
                  )
                : c.imageNone}
              {imageUrl && (
                <a
                  className={styles.imageLink}
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="staff-image"
                >
                  {/* Signed, short-lived URL to a private bucket: next/image cannot optimise it. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={c.imageAlt} width={160} height={160} />
                  <span>{c.imageOpen}</span>
                </a>
              )}
            </dd>
            {adminAnswerFields.map((f) => (
              <div key={f.key} className={styles.fact} data-field={f.key}>
                <dt>{label(f)}</dt>
                <dd>
                  <Value field={f} value={view.answers[f.key]} c={c} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="jury-fields"
          data-testid="jury-section"
          className={styles.part}
        >
          <h2 id="jury-fields" className={styles.heading}>
            {c.juryTitle}
          </h2>
          <p className={styles.text}>{c.juryLead}</p>
          <dl className={styles.facts}>
            {view.juryFields.map((f) => (
              <div key={f.key} className={styles.fact} data-field={f.key}>
                <dt>{label(f)}</dt>
                <dd>
                  <Value field={f} value={view.answers[f.key]} c={c} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="credentials" className={styles.part}>
          <h2 id="credentials" className={styles.heading}>
            {c.credentialsTitle}
          </h2>
          <p className={styles.text}>{c.credentialsLead}</p>
          <p className={styles.text}>{c.credentialsCount(view.credentialCount)}</p>
          <CredentialsViewer
            entryId={view.entryId}
            locale={locale}
            count={view.credentialCount}
            copy={{
              show: c.credentialsShow,
              hide: c.credentialsHide,
              error: c.credentialsError,
              label: c.credentialLabel,
              value: c.credentialValue,
              notes: c.credentialNotes,
            }}
          />
        </section>

        <section
          aria-labelledby="requests"
          data-testid="requests-section"
          className={styles.part}
        >
          <h2 id="requests" className={styles.heading}>
            {c.requestsTitle}
          </h2>
          <Requests
            locale={locale}
            entryId={view.entryId}
            requests={requests}
            fields={fields}
            canOpen={view.status !== 'draft' && view.status !== 'withdrawn'}
            now={staffNow}
            outcome={search}
          />
        </section>

        <section aria-labelledby="transfer" className={styles.part}>
          <h2 id="transfer" className={styles.heading}>
            {c.transferTitle}
          </h2>
          <p className={styles.text}>{c.transferLead}</p>
          <form action={transferProjectAction} className={styles.filter}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="entryId" value={view.entryId} />
            <label className={`${styles.field} ${styles.searchField}`}>
              <span>{c.transferEmail}</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <button type="submit" className={`btn-grow ${styles.secondary}`}>
              <GrowText>{c.transferButton}</GrowText>
            </button>
          </form>
        </section>

        <section aria-labelledby="history" className={styles.part}>
          <h2 id="history" className={styles.heading}>
            {c.historyTitle}
          </h2>
          {view.events.length === 0 ? (
            <p className={styles.text}>{c.historyEmpty}</p>
          ) : (
            <div
              className={styles.tableWrap}
              role="region"
              tabIndex={0}
              aria-label={c.tableRegion(c.historyTitle)}
            >
              <table className={styles.table} data-testid="history">
                <caption className={styles.srOnly}>{c.historyTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{c.colWhen}</th>
                    <th scope="col">{c.colEvent}</th>
                    <th scope="col">{c.colWho}</th>
                    <th scope="col">{c.colDetail}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.events.map((e) => (
                    <tr key={e.id} data-event={e.type}>
                      <td className={styles.nowrap}>
                        <time dateTime={e.createdAt.toISOString()}>
                          {stamp(e.createdAt)}
                        </time>
                      </td>
                      <td>{c.events[e.type] ?? e.type}</td>
                      <td>
                        {e.actorName ? `${e.actorName} <${e.actorEmail}>` : c.system}
                      </td>
                      <td className={styles.wrap}>{describe(e, c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
