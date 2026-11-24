'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ProjectView } from '@/lib/awards/projects/types'
import { ProjectFormController, type ProjectFormActions } from './controller'
import { fieldErrorsByKey, sectionStatuses } from './sections'

export type { ProjectFormActions } from './controller'

/**
 * React binding for `ProjectFormController`: subscribes to its snapshots and adds the
 * derived values the markup needs. All the behaviour lives in the controller.
 */
export function useProjectForm(initial: ProjectView, actions: ProjectFormActions) {
  const [controller] = useState(() => new ProjectFormController(initial, actions))
  const snap = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )

  useEffect(() => controller.start(), [controller])

  const categories = snap.pendingCategories ?? snap.view.categories
  const billingProfileId =
    (snap.pendingBilling ? snap.pendingBilling.id : snap.view.billing?.id) ?? null
  const statuses = useMemo(
    () => sectionStatuses(categories, snap.answers, billingProfileId),
    [categories, snap.answers, billingProfileId],
  )
  const errors = useMemo(
    () => fieldErrorsByKey(categories, snap.answers),
    [categories, snap.answers],
  )

  return {
    ...snap,
    categories,
    readOnly: snap.lockState.kind !== 'held',
    statuses,
    /** Submit-mode errors by field key (show only where `touched`). */
    errors,
    invalidUnsaved: Object.keys(snap.serverErrors).length > 0,
    setAnswer: (key: string, value: unknown) => controller.setAnswer(key, value),
    setEntryAnswer: (slug: string, key: string, value: unknown) =>
      controller.setEntryAnswer(slug, key, value),
    changeCategories: (next: string[]) => controller.changeCategories(next),
    billingProfileId,
    changeBilling: (id: string | null) => controller.changeBilling(id),
    submit: (args: { entryId?: string; acceptTerms: boolean }) => controller.submit(args),
    markTouched: (key: string) => controller.markTouched(key),
    retrySave: controller.retrySave,
    checkLockAgain: controller.checkLockAgain,
  }
}

export type ProjectFormApi = ReturnType<typeof useProjectForm>
