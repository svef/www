'use client'

import { useMemo } from 'react'
import { ProjectForm } from '@/components/ProjectForm/ProjectForm'
import type { ProjectFormActions } from '@/components/ProjectForm/useProjectForm'
import type { BillingActions } from '@/components/ProjectForm/BillingSection'
import {
  createBillingProfileAction,
  deleteBillingProfileAction,
  updateBillingProfileAction,
} from '@/lib/awards/billing/actions'
import type { BillingProfileView } from '@/lib/awards/billing/rules'
import type { ProjectView } from '@/lib/awards/projects/types'
import type { Locale } from '@/lib/i18n'
import {
  acquireLockAction,
  heartbeatAction,
  loadProjectAction,
  saveAnswersAction,
  setBillingProfileAction,
  setCategoriesAction,
  submitAction,
} from './actions'

/** Binds the project's server actions to the form, and the beacon that releases the lock on leave. */
const billingActions: BillingActions = {
  create: createBillingProfileAction,
  update: updateBillingProfileAction,
  remove: deleteBillingProfileAction,
}

export function ProjectFormClient({
  initial,
  locale,
  billingProfiles,
}: {
  initial: ProjectView
  locale: Locale
  billingProfiles: BillingProfileView[]
}) {
  const actions = useMemo<ProjectFormActions>(
    () => ({
      load: () => loadProjectAction(initial.id),
      acquire: () => acquireLockAction(initial.id),
      heartbeat: () => heartbeatAction(initial.id),
      save: (patch) => saveAnswersAction(initial.id, patch),
      setCategories: (categories) => setCategoriesAction(initial.id, categories),
      setBilling: (billingProfileId) => setBillingProfileAction(initial.id, billingProfileId),
      submit: (args) => submitAction(initial.id, args),
      release: () => {
        // sendBeacon survives the page going away; a server action would not.
        navigator.sendBeacon(`/api/awards/projects/${initial.id}/lock`)
      },
    }),
    [initial.id],
  )
  return (
    <ProjectForm
      initial={initial}
      locale={locale}
      actions={actions}
      billing={{ initialProfiles: billingProfiles, actions: billingActions }}
    />
  )
}
