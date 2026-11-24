'use client'

import { useId, useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ButtonLink } from '@/components/ButtonLink/ButtonLink'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { authClient } from '@/lib/awards/auth/client'
import type { DeadlineLine } from '@/lib/awards/dashboard/deadline'
import { filterProjects, NO_FILTER, type ListFilter } from '@/lib/awards/dashboard/filter'
import type { InvoiceNote } from '@/lib/awards/dashboard/invoice'
import type { DashboardData, DashboardEntry, DashboardProject } from '@/lib/awards/dashboard/types'
import { ENTRY_STATUSES, type EntryStatus } from '@/lib/awards/types'
import { localePath, type Locale } from '@/lib/i18n'
import { BulkDialog, type BillingChoice, type BulkRequest } from './BulkDialog'
import { bulkCopy } from './bulk-copy'
import { lastDayBefore } from '@/components/ProjectForm/format'
import { dashboardCopy, formatClock, formatDayMonth, formatMoney, type DashboardCopy } from './copy'
import styles from './Dashboard.module.scss'

/**
 * "Mínar innsendingar". The server page loads, ranks and passes plain data; this component only
 * presents it (cards or a compact list) and holds the view, search and filter state. Everything
 * visual lives in `Dashboard.module.scss`, so a redesign touches that file and the markup here,
 * not the data or the rules.
 */
export type DashboardProps = {
  locale: Locale
  data: DashboardData
  deadline: DeadlineLine
  notes: InvoiceNote[]
  /** Submitted entries on projects with no billing profile. */
  withoutBilling: number
  /** Ids of the projects that need the entrant's attention (an open request, or an urgent draft). */
  needsActionIds: string[]
  /** Where the sign-in/out round trip ends. */
  signOutTo: string
  /** The person's own billing profiles, for "change billing profile". */
  billingProfiles: BillingChoice[]
}

type View = 'cards' | 'list'

export function Dashboard(props: DashboardProps) {
  const { locale, data, deadline, notes, withoutBilling, needsActionIds, signOutTo } = props
  const c = dashboardCopy[locale]
  const [view, setView] = useState<View>('cards')
  const urgent = useMemo(() => new Set(needsActionIds), [needsActionIds])
  const hrefNew = localePath('/innsendingar/ny', locale)

  return (
    <div className={styles.dashboard} data-dashboard>
      <div className={styles.top}>
        <p className={styles.deadline} data-deadline={deadline.kind}>
          {c.deadline(deadline, locale)}
        </p>
        <div className={styles.topActions}>
          <ButtonLink href={hrefNew}>{c.newSubmission}</ButtonLink>
          <SignOut label={c.signOut} to={signOutTo} />
        </div>
      </div>

      {notes.length > 0 || withoutBilling > 0 ? (
        <section aria-labelledby="dash-invoices" className={styles.invoices} data-invoices>
          <h2 id="dash-invoices" className={styles.sectionTitle}>
            {c.invoiceHeading}
          </h2>
          <ul>
            {notes.map((n) => (
              <li key={n.billing.id} data-invoice={n.billing.id}>
                {c.invoiceNote(n.total, n.billing.companyName, n.billing.kennitala, locale)}
              </li>
            ))}
            {withoutBilling > 0 && <li>{c.invoiceNoBilling(withoutBilling)}</li>}
          </ul>
        </section>
      ) : null}

      {data.projects.length === 0 ? (
        <div className={styles.empty} data-empty>
          <EmptyState title={c.emptyTitle} body={c.emptyBody} />
          <ButtonLink href={hrefNew}>{c.newSubmission}</ButtonLink>
        </div>
      ) : (
        <>
          <div className={styles.viewBar}>
            <div role="group" aria-label={c.viewLabel} className={styles.toggle}>
              {(['cards', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.toggleButton}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  data-view={v}
                >
                  {v === 'cards' ? c.viewCards : c.viewList}
                </button>
              ))}
            </div>
          </div>
          {view === 'cards' ? (
            <Cards locale={locale} c={c} projects={data.projects} urgent={urgent} now={data.now} />
          ) : (
            <List
              locale={locale}
              c={c}
              projects={data.projects}
              billingProfiles={props.billingProfiles}
              edition={data.edition}
              now={data.now}
            />
          )}
        </>
      )}
    </div>
  )
}

function SignOut({ label, to }: { label: string; to: string }) {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      className={styles.linkButton}
      aria-disabled={pending}
      onClick={async () => {
        if (pending) return
        setPending(true)
        await authClient.signOut()
        window.location.assign(to)
      }}
    >
      {label}
    </button>
  )
}

// ── Pieces shared by both views ─────────────────────────────────────────────

function StatusBadge({ status, c }: { status: EntryStatus; c: DashboardCopy }) {
  return (
    <span className={clsx(styles.badge, styles[`status_${status}`])} data-status={status}>
      {c.status[status]}
    </span>
  )
}

function PriceCell({ entry, c, locale }: { entry: DashboardEntry; c: DashboardCopy; locale: Locale }) {
  const locked = entry.priceKind === 'locked'
  return (
    <span className={styles.price}>
      <span className={styles.amount} data-price={entry.price}>
        {formatMoney(entry.price, locale)}
      </span>
      <span className={styles.priceNote}>
        {locked ? c.priceLocked : c.priceIfNow(entry.earlyBird)}
      </span>
      {entry.earlyBirdSecured && (
        <span className={styles.secured} data-early-bird="secured">
          {c.earlyBirdSecured}
        </span>
      )}
    </span>
  )
}

function Notes({
  entry,
  c,
  locale,
  now,
  requestHref,
}: {
  entry: DashboardEntry
  c: DashboardCopy
  locale: Locale
  now: string
  /** The project page's requests section, where a request is answered. */
  requestHref: string
}) {
  const missing = entry.missing
  return (
    <>
      {entry.requests.map((r) => {
        const overdue = Date.parse(r.deadlineAt) <= Date.parse(now)
        return (
          <span key={r.id} className={styles.request} data-request={r.id}>
            <Link href={requestHref}>
              {overdue ? c.requestOverdue : c.requestAsked(formatDayMonth(r.deadlineAt, locale))}
            </Link>
            <span className={styles.requestMessage}>{r.message}</span>
          </span>
        )
      })}
      {missing.length > 0 && (
        <span className={styles.missing} data-missing>
          <span className={styles.missingLabel}>{c.missing}:</span>{' '}
          {missing.map((m) => m.label[locale]).join(', ')}
        </span>
      )}
    </>
  )
}

function LockLine({
  project,
  c,
  locale,
}: {
  project: DashboardProject
  c: DashboardCopy
  locale: Locale
}) {
  if (!project.lock) return null
  return (
    <p className={styles.lock} data-lock>
      {c.locked(project.lock.holderName, formatClock(project.lock.since, locale), project.lock.heldByViewer)}
    </p>
  )
}

const titleOf = (p: DashboardProject, c: DashboardCopy) => p.title || c.list.untitled

// ── Cards ───────────────────────────────────────────────────────────────────

function Cards({
  locale,
  c,
  projects,
  urgent,
  now,
}: {
  locale: Locale
  c: DashboardCopy
  projects: DashboardProject[]
  urgent: Set<string>
  now: string
}) {
  const base = useId()
  return (
    <ul className={styles.cards} data-view-content="cards">
      {projects.map((p) => {
        const headingId = `${base}-${p.id}`
        return (
          <li key={p.id}>
            <article
              className={clsx(styles.card, urgent.has(p.id) && styles.cardUrgent)}
              aria-labelledby={headingId}
              data-project={p.id}
              data-needs-action={urgent.has(p.id) ? '' : undefined}
            >
              <header className={styles.cardHead}>
                <h2 id={headingId} className={styles.cardTitle}>
                  <Link href={localePath(`/innsendingar/${p.id}`, locale)}>{titleOf(p, c)}</Link>
                </h2>
                <p className={styles.tags}>
                  {urgent.has(p.id) && <span className={styles.attention}>{c.needsAction}</span>}
                  {p.role === 'editor' && <span className={styles.tag}>{c.roleEditor}</span>}
                </p>
              </header>
              <LockLine project={p} c={c} locale={locale} />
              {p.entries.length === 0 ? (
                <p className={styles.noEntries}>{c.noEntries}</p>
              ) : (
                <ul className={styles.entries}>
                  {p.entries.map((e) => (
                    <li key={e.id} className={styles.entry} data-entry={e.id} data-status={e.status}>
                      <span className={styles.entryName}>{e.categoryName[locale]}</span>
                      <StatusBadge status={e.status} c={c} />
                      <PriceCell entry={e} c={c} locale={locale} />
                      <span className={styles.entryNotes}>
                        <Notes entry={e} c={c} locale={locale} now={now} requestHref={`${localePath(`/innsendingar/${p.id}`, locale)}#requests`} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

// ── Compact list ────────────────────────────────────────────────────────────

function List({
  locale,
  c,
  projects,
  billingProfiles,
  edition,
  now,
}: {
  locale: Locale
  c: DashboardCopy
  projects: DashboardProject[]
  billingProfiles: BillingChoice[]
  edition: DashboardData['edition']
  now: string
}) {
  const router = useRouter()
  const b = bulkCopy[locale]
  const [dialog, setDialog] = useState<BulkRequest | null>(null)
  const [filter, setFilter] = useState<ListFilter>(NO_FILTER)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const ids = useId()

  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of projects)
      for (const e of p.entries) if (!seen.has(e.categorySlug)) seen.set(e.categorySlug, e.categoryName[locale])
    return [...seen].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [projects, locale])

  const shown = useMemo(() => filterProjects(projects, filter), [projects, filter])
  const rows = useMemo(
    () =>
      shown.flatMap((p) =>
        p.entries.length
          ? p.entries.map((e) => ({ p, e }))
          : // A project with no entries still shows (unless a status/category filter is on, which drops it).
            [{ p, e: null as DashboardEntry | null }],
      ),
    [shown],
  )
  const totalEntries = projects.reduce((n, p) => n + p.entries.length, 0)
  const shownEntries = rows.filter((r) => r.e).length
  const shownIds = rows.flatMap((r) => (r.e ? [r.e.id] : []))
  const allSelected = shownIds.length > 0 && shownIds.every((id) => selected.has(id))
  const filtered = filter.query !== '' || filter.status !== '' || filter.category !== ''

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s)
      for (const id of shownIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })

  return (
    <div data-view-content="list">
      <form
        className={styles.filters}
        role="search"
        aria-label={c.list.filterLabel}
        onSubmit={(ev) => ev.preventDefault()}
      >
        <div className={styles.field}>
          <label htmlFor={`${ids}-q`}>{c.list.search}</label>
          <input
            id={`${ids}-q`}
            type="search"
            name="q"
            value={filter.query}
            onChange={(ev) => setFilter({ ...filter, query: ev.target.value })}
            aria-describedby={`${ids}-hint`}
            autoComplete="off"
          />
          <span id={`${ids}-hint`} className={styles.hint}>
            {c.list.searchHint}
          </span>
        </div>
        <label className={styles.field}>
          <span>{c.list.status}</span>
          <select
            name="status"
            value={filter.status}
            onChange={(ev) => setFilter({ ...filter, status: ev.target.value as EntryStatus | '' })}
          >
            <option value="">{c.list.all}</option>
            {ENTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {c.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{c.list.category}</span>
          <select
            name="category"
            value={filter.category}
            onChange={(ev) => setFilter({ ...filter, category: ev.target.value })}
          >
            <option value="">{c.list.all}</option>
            {categories.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setFilter(NO_FILTER)}
          disabled={!filtered}
        >
          {c.list.reset}
        </button>
      </form>

      <p className={styles.results} role="status" data-results>
        {c.list.results(shownEntries, totalEntries)}
      </p>

      <div className={styles.bulk} data-slot="bulk-actions">
        <span aria-live="polite" data-selected-count>
          {selected.size > 0 ? c.list.selected(selected.size) : ''}
        </span>
        {selected.size > 0 && (
          <ul className={styles.bulkActions} aria-label={b.barLabel}>
            {(['submit', 'withdraw', 'billing'] as const).map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  className={styles.bulkButton}
                  data-bulk={kind}
                  onClick={() => setDialog({ kind, entryIds: [...selected] })}
                >
                  {b.actions[kind]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <BulkDialog
          // A fresh dialog (and plan) for every opening.
          key={`${dialog.kind}-${dialog.entryIds.join(',')}`}
          locale={locale}
          request={dialog}
          billingProfiles={billingProfiles}
          lastEarlyDay={lastDayBefore(edition.earlyBirdEndsBefore, locale)}
          earlyOpen={Date.parse(now) < Date.parse(edition.earlyBirdEndsBefore)}
          onClose={() => {
            setDialog(null)
            // What was done is gone from the selection; start clean.
            setSelected(new Set())
          }}
          onChanged={() => router.refresh()}
        />
      )}

      {rows.length === 0 ? (
        <p className={styles.none}>{c.list.none}</p>
      ) : (
        <table className={styles.table}>
          <caption className={styles.srOnly}>{c.list.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.checkCol}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={c.list.selectAll}
                  disabled={shownIds.length === 0}
                />
              </th>
              <th scope="col">{c.list.colProject}</th>
              <th scope="col">{c.list.colCategory}</th>
              <th scope="col">{c.list.colStatus}</th>
              <th scope="col">{c.list.colPrice}</th>
              <th scope="col">{c.list.colNotes}</th>
              <th scope="col" className={styles.actionsCol}>
                <span className={styles.srOnly}>{b.barLabel}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, e }) => (
              <tr key={e?.id ?? p.id} data-project={p.id} data-entry={e?.id} data-status={e?.status}>
                <td className={styles.checkCol}>
                  {e && (
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggle(e.id)}
                      aria-label={c.list.selectRow(titleOf(p, c), e.categoryName[locale])}
                    />
                  )}
                </td>
                <th scope="row" className={styles.projectCell}>
                  <Link href={localePath(`/innsendingar/${p.id}`, locale)}>{titleOf(p, c)}</Link>
                </th>
                <td data-label={c.list.colCategory}>{e ? e.categoryName[locale] : c.noEntries}</td>
                <td data-label={c.list.colStatus}>{e && <StatusBadge status={e.status} c={c} />}</td>
                <td data-label={c.list.colPrice}>{e && <PriceCell entry={e} c={c} locale={locale} />}</td>
                <td data-label={c.list.colNotes}>
                  {e && <Notes entry={e} c={c} locale={locale} now={now} requestHref={`${localePath(`/innsendingar/${p.id}`, locale)}#requests`} />}
                  {p.lock && !e?.requests.length && !e?.missing.length ? (
                    <span className={styles.missing}>
                      {c.locked(p.lock.holderName, formatClock(p.lock.since, locale), p.lock.heldByViewer)}
                    </span>
                  ) : null}
                </td>
                <td className={styles.actionsCol}>
                  {e && e.status === 'submitted' && p.role === 'creator' && (
                    <button
                      type="button"
                      className={styles.rowButton}
                      aria-label={b.rowWithdrawLabel(titleOf(p, c), e.categoryName[locale])}
                      data-withdraw-row={e.id}
                      onClick={() => setDialog({ kind: 'withdraw', entryIds: [e.id] })}
                    >
                      {b.rowWithdraw}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
