'use client'

import { useRowLabel } from '@payloadcms/ui'

/**
 * The row label in the admin's sponsors list: the sponsor's name, so an editor
 * can tell the rows apart without opening each one. Falls back to a numbered
 * placeholder until a name is typed.
 */
export function SponsorRowLabel() {
  const { data, rowNumber } = useRowLabel<{ name?: string }>()
  const name = data?.name?.trim()
  return <span>{name || `Sponsor ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</span>
}
