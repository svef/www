import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import type { Corner } from '@/lib/shape/geometry'

interface NotchOwnProps {
  /** The corner this content sits in. The shape cuts a black notch around it. */
  corner: Corner
  /** Clearance around this content, overriding the shape's `pad` (`data-notch-pad`). */
  pad?: number
  /** Extra random reach on screens wider than 640px, used with ambient shapes (`data-notch-drift`). */
  drift?: number
  /** Only cut the notch at viewport widths of at least this many px (`data-notch-min`). */
  minViewport?: number
  children?: ReactNode
}

export type NotchProps<T extends ElementType = 'div'> = NotchOwnProps & {
  /** The element to render. Default `div`. */
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof NotchOwnProps | 'as'>

/**
 * Content that sits in one of a `<Shape>`'s notches — a title in the top-left
 * cut-out, a date in the bottom-right. Renders a plain element with the `data-notch`
 * attributes the engine measures, so it works from Server Components too. Any
 * element inside a shape can carry `data-notch="tl"` directly instead.
 */
export function Notch<T extends ElementType = 'div'>(props: NotchProps<T>) {
  const { corner, as, pad, drift, minViewport, ...rest } = props as NotchProps
  const Tag: ElementType = as ?? 'div'
  return (
    <Tag
      data-notch={corner}
      data-notch-pad={pad}
      data-notch-drift={drift}
      data-notch-min={minViewport}
      {...rest}
    />
  )
}
