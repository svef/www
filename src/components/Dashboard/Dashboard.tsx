'use client'

import { useId, useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { inputClass } from '@/components/FormParts/FormParts'
import { GrowText } from '@/components/GrowText/GrowText'
import type { DeadlineLine } from '@/lib/awards/dashboard/deadline'
import { filterProjects, NO_FILTER, type ListFilter } from '@/lib/awards/dashboard/filter'
import type { InvoiceNote } from '@/lib/awards/dashboard/invoice'
import type {
  DashboardData,
  DashboardEntry,
  DashboardProject,
} from '@/lib/awards/dashboard/types'
import { ENTRY_STATUSES, type EntryStatus } from '@/lib/awards/types'
import { localePath, type Locale } from '@/lib/i18n'
import { PORTAL } from '@/lib/portal/paths'
import { BulkDialog, type BillingChoice, type BulkRequest } from './BulkDialog'
import { bulkCopy } from './bulk-copy'
import { lastDayBefore } from '@/components/ProjectForm/format'
import {
  dashboardCopy,
  formatClock,
  formatDayMonth,
  formatMoney,
  type DashboardCopy,
} from './copy'
import styles from './Dashboard.module.scss'

/**
 * "Verkefnin mín" (the portal's projects page). The server page loads, ranks and passes plain data; this component only
 * presents it and holds the search, filter and selection state. One view: the projects as a
 * hairline list (needs-action first), one row per entry, each selectable for the bulk actions.
 * Everything visual lives in `Dashboard.module.scss`; the markup carries the `data-*` hooks the
 * tests use.
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
  /** The person's own billing profiles, for "change billing profile". */
  billingProfiles: BillingChoice[]
}

export function Dashboard(props: DashboardProps) {
  const { locale, data, deadline, notes, withoutBilling, needsActionIds } = props
  const c = dashboardCopy[locale]
  const urgent = useMemo(() => new Set(needsActionIds), [needsActionIds])
  const hrefNew = localePath(PORTAL.newProject, locale)
  const invoices = notes.length > 0 || withoutBilling > 0

  return (
    <div className={styles.dashboard} data-dashboard>
      <section
        className={clsx(styles.notice, withoutBilling > 0 && styles.noticeAttention)}
        aria-label={c.statusLabel}
      >
        <p className={styles.noticeTitle} data-deadline={deadline.kind}>
          {c.deadline(deadline, locale)}
        </p>
        {invoices && (
          <div className={styles.invoices} data-invoices>
            <h2 className={styles.monoLabel}>{c.invoiceHeading}</h2>
            <ul>
              {notes.map((n) => (
                <li key={n.billing.id} data-invoice={n.billing.id}>
                  {c.invoiceNote(
                    n.total,
                    n.billing.companyName,
                    n.billing.kennitala,
                    locale,
                  )}
                </li>
              ))}
              {withoutBilling > 0 && <li>{c.invoiceNoBilling(withoutBilling)}</li>}
            </ul>
          </div>
        )}
      </section>

      {data.projects.length === 0 ? (
        <div className={styles.empty} data-empty>
          <h2>{c.emptyTitle}</h2>
          <p>{c.emptyBody}</p>
          <Link href={hrefNew} className={`btn-grow ${styles.primaryButton}`}>
            <GrowText>{c.newSubmission}</GrowText>
          </Link>
        </div>
      ) : (
        <Projects
          locale={locale}
          c={c}
          projects={data.projects}
          urgent={urgent}
          billingProfiles={props.billingProfiles}
          edition={data.edition}
          now={data.now}
        />
      )}
    </div>
  )
}

/** The head's action: start a new project. Signing out lives in the shell's avatar menu. */
export function DashboardActions({ locale }: { locale: Locale }) {
  const c = dashboardCopy[locale]
  return (
    <Link href={localePath(PORTAL.newProject, locale)} className={`btn-grow ${styles.primaryButton}`}>
      <GrowText>{c.newSubmission}</GrowText>
    </Link>
  )
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function StatusTag({ status, c }: { status: EntryStatus; c: DashboardCopy }) {
  return (
    <span className={styles.tag} data-status={status}>
      {c.status[status]}
    </span>
  )
}

function Price({
  entry,
  c,
  locale,
}: {
  entry: DashboardEntry
  c: DashboardCopy
  locale: Locale
}) {
  const note = entry.earlyBirdSecured
    ? null
    : entry.priceKind === 'locked'
      ? c.priceLocked
      : c.priceIfNow(entry.earlyBird)
  return (
    <span className={styles.price}>
      <span className={styles.amount} data-price={entry.price}>
        {formatMoney(entry.price, locale)}
      </span>
      {entry.earlyBirdSecured ? (
        <span className={styles.priceNote} data-early-bird="secured">
          {c.earlyBirdSecured}
        </span>
      ) : (
        <span className={styles.priceNote}>{note}</span>
      )}
    </span>
  )
}

function Notes({
  entry,
  c,
  locale,
  now,
  projectHref,
}: {
  entry: DashboardEntry
  c: DashboardCopy
  locale: Locale
  now: string
  projectHref: string
}) {
  const missing = entry.missing
  if (entry.requests.length === 0 && missing.length === 0) return null
  return (
    <div className={styles.notes}>
      {entry.requests.map((r) => {
        const overdue = Date.parse(r.deadlineAt) <= Date.parse(now)
        return (
          <p key={r.id} className={styles.request} data-request={r.id}>
            <Link href={`${projectHref}#requests`}>
              {overdue
                ? c.requestOverdue
                : c.requestAsked(formatDayMonth(r.deadlineAt, locale))}
            </Link>
            <span className={styles.requestMessage}>{r.message}</span>
          </p>
        )
      })}
      {missing.length > 0 && (
        <p className={styles.missing} data-missing>
          <Link href={`${projectHref}#section-review`}>
            {c.missing(missing.length, missing[0].label[locale])}
          </Link>
        </p>
      )}
    </div>
  )
}

const titleOf = (p: DashboardProject, c: DashboardCopy) => p.title || c.list.untitled

// ── The list ────────────────────────────────────────────────────────────────

function Projects({
  locale,
  c,
  projects,
  urgent,
  billingProfiles,
  edition,
  now,
}: {
  locale: Locale
  c: DashboardCopy
  projects: DashboardProject[]
  urgent: Set<string>
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
      for (const e of p.entries)
        if (!seen.has(e.categorySlug)) seen.set(e.categorySlug, e.categoryName[locale])
    return [...seen]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [projects, locale])

  const shown = useMemo(() => filterProjects(projects, filter), [projects, filter])
  const totalEntries = projects.reduce((n, p) => n + p.entries.length, 0)
  const shownIds = shown.flatMap((p) => p.entries.map((e) => e.id))
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
    <>
      <form
        className={styles.filters}
        role="search"
        aria-label={c.list.filterLabel}
        onSubmit={(ev) => ev.preventDefault()}
      >
        <div className={clsx(styles.field, styles.searchField)}>
          <label htmlFor={`${ids}-q`}>{c.list.search}</label>
          <input
            id={`${ids}-q`}
            className={inputClass}
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
        <div className={styles.field}>
          <label htmlFor={`${ids}-status`}>{c.list.status}</label>
          <select
            id={`${ids}-status`}
            className={inputClass}
            name="status"
            value={filter.status}
            onChange={(ev) =>
              setFilter({ ...filter, status: ev.target.value as EntryStatus | '' })
            }
          >
            <option value="">{c.list.all}</option>
            {ENTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {c.status[s]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${ids}-category`}>{c.list.category}</label>
          <select
            id={`${ids}-category`}
            className={inputClass}
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
        </div>
        <button
          type="button"
          className={styles.quiet}
          onClick={() => setFilter(NO_FILTER)}
          disabled={!filtered}
        >
          {c.list.reset}
        </button>
      </form>

      <div className={styles.listBar}>
        {/* Above the list, not in a header row: it must work at every width. */}
        {shownIds.length > 0 && (
          <label className={styles.selectAll}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>{c.list.selectAll}</span>
          </label>
        )}
        <p className={styles.results} role="status" data-results>
          {c.list.results(shownIds.length, totalEntries)}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className={styles.none}>{c.list.none}</p>
      ) : (
        <ul className={styles.projects} aria-label={c.list.caption}>
          {shown.map((p) => (
            <ProjectRow
              key={p.id}
              p={p}
              c={c}
              locale={locale}
              now={now}
              urgent={urgent.has(p.id)}
              selected={selected}
              toggle={toggle}
              withdraw={(entryId) => setDialog({ kind: 'withdraw', entryIds: [entryId] })}
            />
          ))}
        </ul>
      )}

      {/* Always mounted, so the count is announced; it only shows itself once something is chosen. */}
      <div
        className={clsx(styles.bulkBar, selected.size > 0 && styles.bulkBarOpen)}
        data-slot="bulk-actions"
      >
        <p className={styles.bulkCount} aria-live="polite" data-selected-count>
          {selected.size > 0 ? c.list.selected(selected.size) : ''}
        </p>
        {selected.size > 0 && (
          <ul className={styles.bulkActions} aria-label={b.barLabel}>
            {(['submit', 'withdraw', 'billing'] as const).map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  className={clsx(
                    'btn-grow',
                    kind === 'submit'
                      ? styles.primarySmall
                      : kind === 'withdraw'
                        ? styles.destructiveSmall
                        : styles.secondarySmall,
                  )}
                  data-bulk={kind}
                  onClick={() => setDialog({ kind, entryIds: [...selected] })}
                >
                  <GrowText>{b.actions[kind]}</GrowText>
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
    </>
  )
}

function ProjectRow({
  p,
  c,
  locale,
  now,
  urgent,
  selected,
  toggle,
  withdraw,
}: {
  p: DashboardProject
  c: DashboardCopy
  locale: Locale
  now: string
  urgent: boolean
  selected: ReadonlySet<string>
  toggle: (id: string) => void
  withdraw: (entryId: string) => void
}) {
  const headingId = useId()
  const b = bulkCopy[locale]
  const href = localePath(PORTAL.project(p.id), locale)
  return (
    <li>
      <article
        className={styles.project}
        aria-labelledby={headingId}
        data-project={p.id}
        data-needs-action={urgent ? '' : undefined}
      >
        <header className={styles.projectHead}>
          <h2 id={headingId} className={styles.projectTitle}>
            <Link href={href}>{titleOf(p, c)}</Link>
          </h2>
          {(urgent || p.role === 'editor') && (
            <p className={styles.flags}>
              {urgent && (
                <span className={clsx(styles.tag, styles.attention)}>
                  {c.needsAction}
                </span>
              )}
              {p.role === 'editor' && <span className={styles.tag}>{c.roleEditor}</span>}
            </p>
          )}
          {p.lock && (
            <p className={styles.lock} data-lock>
              {c.locked(
                p.lock.holderName,
                formatClock(p.lock.since, locale),
                p.lock.heldByViewer,
              )}
            </p>
          )}
        </header>
        {p.entries.length === 0 ? (
          <p className={styles.noEntries}>{c.noEntries}</p>
        ) : (
          <ul className={styles.entries}>
            {p.entries.map((e) => (
              <li
                key={e.id}
                className={styles.entry}
                data-entry={e.id}
                data-status={e.status}
              >
                <span className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    aria-label={c.list.selectRow(titleOf(p, c), e.categoryName[locale])}
                  />
                </span>
                <span className={styles.category}>{e.categoryName[locale]}</span>
                <span className={styles.status}>
                  <StatusTag status={e.status} c={c} />
                </span>
                <Price entry={e} c={c} locale={locale} />
                <span className={styles.rowAction}>
                  {e.status === 'submitted' && p.role === 'creator' && (
                    <button
                      type="button"
                      className={styles.destructiveSmall}
                      aria-label={b.rowWithdrawLabel(
                        titleOf(p, c),
                        e.categoryName[locale],
                      )}
                      data-withdraw-row={e.id}
                      onClick={() => withdraw(e.id)}
                    >
                      {b.rowWithdraw}
                    </button>
                  )}
                </span>
                <Notes entry={e} c={c} locale={locale} now={now} projectHref={href} />
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  )
}
