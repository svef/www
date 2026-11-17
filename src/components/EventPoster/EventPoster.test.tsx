import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventPoster } from './EventPoster'
import { EVENT_POSTER_LOOKS, eventPosterLook } from './looks'
import { EventGrid } from './EventGrid'

const props = {
  title: 'Klúðurkvöld',
  href: '/is/vidburdir/kludurkvold',
  date: '12. nóv 2026',
  dateTime: '2026-11-12T20:00:00.000Z',
  meta: '20:00—22:30 · Iðnó',
}

describe('EventPoster', () => {
  it('is one link to the event, named by the title', () => {
    render(<EventPoster {...props} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', props.href)
    expect(link).toHaveAccessibleName(expect.stringContaining(props.title))
  })

  it('renders the title as a level 3 heading by default, and honours a level', () => {
    const { rerender } = render(<EventPoster {...props} />)
    expect(screen.getByRole('heading', { level: 3, name: props.title })).toBeInTheDocument()
    rerender(<EventPoster {...props} headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2, name: props.title })).toBeInTheDocument()
  })

  it('exposes the date machine-readably and prints the meta line', () => {
    render(<EventPoster {...props} />)
    const time = screen.getByText(props.date)
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', props.dateTime)
    expect(screen.getByText(props.meta)).toBeInTheDocument()
  })

  it('marks the title and the meta line with their own language independently', () => {
    render(<EventPoster {...props} titleLang="is" />)
    expect(screen.getByRole('heading')).toHaveAttribute('lang', 'is')
    expect(screen.getByText(props.meta)).not.toHaveAttribute('lang')
  })

  it('cycles through the looks by index, negative indexes included', () => {
    expect(eventPosterLook(0)).toBe(EVENT_POSTER_LOOKS[0])
    expect(eventPosterLook(EVENT_POSTER_LOOKS.length)).toBe(EVENT_POSTER_LOOKS[0])
    expect(eventPosterLook(-1)).toBe(EVENT_POSTER_LOOKS[EVENT_POSTER_LOOKS.length - 1])
  })
})

describe('EventGrid', () => {
  it('wraps each poster in a list item', () => {
    render(
      <EventGrid>
        <EventPoster {...props} />
        <EventPoster {...props} href="/is/vidburdir/annad" />
      </EventGrid>,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
