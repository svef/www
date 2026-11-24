import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RequestBanners, type RequestActions, type RequestBannerData } from './RequestBanners'

const base: RequestBannerData = {
  id: 'r1',
  categoryName: 'App',
  message: 'Please fix the title',
  fields: [{ key: 'title', label: 'Project title' }],
  deadlineAt: '2027-03-08T14:30:00.000Z',
  status: 'open',
  resolvedAt: null,
  replies: [],
}

const actions = (over: Partial<RequestActions> = {}): RequestActions => ({
  reply: vi.fn().mockResolvedValue({ ok: true }),
  done: vi.fn().mockResolvedValue({ ok: true, returned: true }),
  ...over,
})

describe('RequestBanners', () => {
  it('shows message, deadline in UTC and the fields as links to the form', () => {
    render(
      <RequestBanners requests={[base]} locale="en" actions={actions()} onChanged={() => {}} />,
    )
    expect(screen.getByText('Please fix the title')).toBeInTheDocument()
    expect(screen.getByText(/8 March 2027/)).toHaveTextContent('UTC')
    expect(screen.getByRole('link', { name: 'Go to the Project title field' })).toHaveAttribute(
      'href',
      '#field-title',
    )
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeEnabled()
  })

  it('sends a reply, then asks the page to refresh', async () => {
    const a = actions()
    const onChanged = vi.fn()
    render(<RequestBanners requests={[base]} locale="en" actions={a} onChanged={onChanged} />)
    const send = screen.getByRole('button', { name: 'Send reply' })
    expect(send).toBeDisabled() // nothing to send yet
    await userEvent.type(screen.getByLabelText(/Reply to SVEF/), 'Done it')
    await userEvent.click(send)
    expect(a.reply).toHaveBeenCalledWith('r1', 'Done it')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your reply was sent.'))
    expect(onChanged).toHaveBeenCalled()
  })

  it('marks done with an optional reply, without needing one', async () => {
    const a = actions()
    render(<RequestBanners requests={[base]} locale="en" actions={a} onChanged={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(a.done).toHaveBeenCalledWith('r1', '')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/The request is done/))
  })

  it('says so when other requests are still open', async () => {
    const a = actions({ done: vi.fn().mockResolvedValue({ ok: true, returned: false }) })
    render(<RequestBanners requests={[base]} locale="en" actions={a} onChanged={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/still open/))
  })

  it('shows a refusal in the entrant’s language and keeps what was typed', async () => {
    const a = actions({ done: vi.fn().mockResolvedValue({ ok: false, reason: 'overdue' }) })
    render(<RequestBanners requests={[base]} locale="is" actions={a} onChanged={() => {}} />)
    await userEvent.type(screen.getByLabelText(/Svar til SVEF/), 'halló')
    await userEvent.click(screen.getByRole('button', { name: 'Merkja sem lokið' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Fresturinn er liðinn/))
    expect(screen.getByLabelText(/Svar til SVEF/)).toHaveValue('halló')
  })

  it('an overdue request has no "Mark as done", plain field names and says so', () => {
    render(
      <RequestBanners
        requests={[{ ...base, status: 'overdue' }]}
        locale="en"
        actions={actions()}
        onChanged={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Mark as done' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Project title/ })).not.toBeInTheDocument()
    expect(screen.getByText(/locked again/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument()
  })

  it('keeps resolved requests as history and renders nothing with no requests', () => {
    const { container, rerender } = render(
      <RequestBanners
        requests={[{ ...base, status: 'resolved', resolvedAt: '2027-03-02T10:00:00.000Z' }]}
        locale="en"
        actions={actions()}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText(/Resolved requests \(1\)/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as done' })).not.toBeInTheDocument()
    rerender(<RequestBanners requests={[]} locale="en" actions={actions()} onChanged={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
