import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubmissionCta } from './SubmissionCta'

const actions = {
  startLabel: 'Hefja innsendingu',
  startHref: '/is/nyskraning?next=%2Fis%2Finnsendingar%2Fminar',
  hasAccount: 'Ertu með aðgang?',
  signInLabel: 'Skrá inn',
  signInHref: '/is/innskraning?next=%2Fis%2Finnsendingar%2Fminar',
}

describe('SubmissionCta', () => {
  it('links to sign-up and sign-in while intake is open', () => {
    render(
      <SubmissionCta headingId="h" phase="open" title="Senda inn" message="Byrjaðu" actions={actions} />,
    )
    expect(screen.getByRole('link', { name: 'Hefja innsendingu' })).toHaveAttribute('href', actions.startHref)
    expect(screen.getByRole('link', { name: 'Skrá inn' })).toHaveAttribute('href', actions.signInHref)
  })

  it.each(['before', 'closed'] as const)('offers no link when intake is %s', (phase) => {
    render(
      <SubmissionCta headingId="h" phase={phase} title="Senda inn" message="Opnað 1. desember" actions={actions} />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Opnað 1. desember')).toBeInTheDocument()
  })
})
