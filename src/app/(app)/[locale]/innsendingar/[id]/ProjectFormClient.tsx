'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { ProjectForm } from '@/components/ProjectForm/ProjectForm'
import type { ProjectFormActions } from '@/components/ProjectForm/useProjectForm'
import type { RequestActions, RequestBannerData } from '@/components/ProjectForm/RequestBanners'
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
  resendInvitationAction,
  saveAnswersAction,
  setBillingProfileAction,
  setCategoriesAction,
  submitAction,
  withdrawAction,
} from './actions'
import {
  finalizeImageUploadAction,
  imagePreviewAction,
  removeImageAction,
  requestImageUploadAction,
} from './image-actions'
import type { ImageActions } from '@/components/ProjectForm/ImageUpload'
import { markRequestDoneAction, replyToRequestAction } from './request-actions'

const requestActions: RequestActions = {
  reply: replyToRequestAction,
  done: markRequestDoneAction,
}

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
  requests,
}: {
  initial: ProjectView
  locale: Locale
  billingProfiles: BillingProfileView[]
  requests: RequestBannerData[]
}) {
  const router = useRouter()
  const actions = useMemo<ProjectFormActions>(
    () => ({
      load: () => loadProjectAction(initial.id),
      acquire: () => acquireLockAction(initial.id),
      heartbeat: () => heartbeatAction(initial.id),
      save: (patch) => saveAnswersAction(initial.id, patch),
      setCategories: (categories) => setCategoriesAction(initial.id, categories),
      setBilling: (billingProfileId) => setBillingProfileAction(initial.id, billingProfileId),
      submit: (args) => submitAction(initial.id, args),
      withdraw: (entryId) => withdrawAction(initial.id, entryId),
      resendInvite: (personId) => resendInvitationAction(initial.id, personId),
      release: (token) => {
        // sendBeacon survives the page going away; a server action would not.
        navigator.sendBeacon(`/api/awards/projects/${initial.id}/lock`, token)
      },
    }),
    [initial.id],
  )
  const images = useMemo<ImageActions>(
    () => ({
      request: (file) => requestImageUploadAction(initial.id, file),
      finalize: (fileId) => finalizeImageUploadAction(initial.id, fileId),
      remove: () => removeImageAction(initial.id),
      preview: () => imagePreviewAction(initial.id),
    }),
    [initial.id],
  )
  return (
    <ProjectForm
      initial={initial}
      images={images}
      locale={locale}
      actions={actions}
      billing={{ initialProfiles: billingProfiles, actions: billingActions }}
      requests={{ items: requests, actions: requestActions, onChanged: () => router.refresh() }}
    />
  )
}
