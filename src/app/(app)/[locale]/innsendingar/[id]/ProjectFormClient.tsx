'use client'

import { useMemo } from 'react'
import { ProjectForm } from '@/components/ProjectForm/ProjectForm'
import type { ProjectFormActions } from '@/components/ProjectForm/useProjectForm'
import type { ProjectView } from '@/lib/awards/projects/types'
import type { Locale } from '@/lib/i18n'
import {
  acquireLockAction,
  heartbeatAction,
  loadProjectAction,
  saveAnswersAction,
  setCategoriesAction,
} from './actions'

/** Binds the project's server actions to the form, and the beacon that releases the lock on leave. */
export function ProjectFormClient({ initial, locale }: { initial: ProjectView; locale: Locale }) {
  const actions = useMemo<ProjectFormActions>(
    () => ({
      load: () => loadProjectAction(initial.id),
      acquire: () => acquireLockAction(initial.id),
      heartbeat: () => heartbeatAction(initial.id),
      save: (patch) => saveAnswersAction(initial.id, patch),
      setCategories: (categories) => setCategoriesAction(initial.id, categories),
      release: () => {
        // sendBeacon survives the page going away; a server action would not.
        navigator.sendBeacon(`/api/awards/projects/${initial.id}/lock`)
      },
    }),
    [initial.id],
  )
  return <ProjectForm initial={initial} locale={locale} actions={actions} />
}
