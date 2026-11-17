import type React from 'react'

/**
 * A label that widens on hover without moving its neighbours: the box is held at
 * the hovered width by a hidden copy of the text (`data-text`, see `_mixins.scss`).
 * Put it inside a link or button; hover and keyboard focus on that element drive it.
 */
export function GrowText({
  children,
  className,
}: {
  children: string
  className?: string
}): React.JSX.Element {
  return (
    <span className={className ? `grow-text ${className}` : 'grow-text'} data-text={children}>
      {children}
    </span>
  )
}
