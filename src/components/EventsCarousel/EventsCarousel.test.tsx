import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventsCarousel, counterText } from './EventsCarousel'

function setup(n = 4) {
  return render(
    <EventsCarousel label="Næstu viðburðir" dotLabel="Viðburður {n}">
      {Array.from({ length: n }, (_, i) => (
        <a key={i} href={`/e/${i}`}>
          Event {i}
        </a>
      ))}
    </EventsCarousel>,
  )
}

describe('EventsCarousel', () => {
  it('is a named carousel group with one slide per child, links reachable without script', () => {
    setup()
    expect(screen.getByRole('group', { name: 'Næstu viðburðir' })).toHaveAttribute(
      'aria-roledescription',
      'carousel',
    )
    // The track's own list; the dots are a second list.
    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Event 2' })).toHaveAttribute('href', '/e/2')
  })

  it('offers one labelled dot per slide, and a counter', () => {
    setup()
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Viðburður 3' })).toBeInTheDocument()
    expect(document.body.textContent).toContain('/ 04')
  })

  it('has no indicator for a single slide', () => {
    setup(1)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('scrolls to a slide when its dot is clicked', async () => {
    setup()
    const track = screen.getAllByRole('list')[0]
    // jsdom has no layout or scrollTo, so stub it on the element.
    let target: ScrollToOptions | undefined
    track.scrollTo = ((o: ScrollToOptions) => {
      target = o
    }) as typeof track.scrollTo
    await userEvent.click(screen.getByRole('button', { name: 'Viðburður 2' }))
    expect(target).toBeDefined()
  })
})

describe('counterText', () => {
  it('shows one slide as 01 / 06 and a span as 01–03 / 06', () => {
    expect(counterText(0, 0, 6)).toBe('01 / 06')
    expect(counterText(0, 2, 6)).toBe('01–03 / 06')
  })
})
