import Link from 'next/link'
import clsx from 'clsx'
import { GrowText } from '@/components/GrowText/GrowText'
import styles from './ButtonLink.module.scss'

export interface ButtonLinkProps {
  href: string
  children: string
  /**
   * `solid`: a violet block with white text (the export's `.btn.btn-white`).
   * `text`: no fill, for a second action beside a solid one (`.hbtn-2`).
   */
  variant?: 'solid' | 'text'
  /** `large` is the hero's (`.hbtn`). */
  size?: 'medium' | 'large'
  /** Language of the label, when it is not the page's. */
  lang?: string
  className?: string
}

/**
 * The export's buttons in their final, flat form: a fill, sentence case, and on hover or
 * keyboard focus the label firms up and widens without moving anything beside it
 * (`GrowText` holds the hovered width). A link, because every button on the home page
 * goes somewhere.
 */
export function ButtonLink({
  href,
  children,
  variant = 'solid',
  size = 'medium',
  lang,
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      lang={lang}
      className={clsx(styles.button, styles[variant], size === 'large' && styles.large, className)}
    >
      <GrowText>{children}</GrowText>
    </Link>
  )
}
