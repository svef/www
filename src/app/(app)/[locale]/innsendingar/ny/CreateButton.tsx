'use client'

import { useFormStatus } from 'react-dom'
import { SubmitButton } from '@/components/FormParts/FormParts'

/** The violet send button, marked busy while the project is being created. */
export function CreateButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <SubmitButton label={label} pending={pending} />
}
