import Link from 'next/link'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Button.module.scss'

export type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps {
  variant?: ButtonVariant
  children: ReactNode
  href?: string
  className?: string
  type?: 'button' | 'submit'
  onClick?: () => void
}

// Primary: solid Electric Violet with dark text. Secondary: ghost + underline.
export function Button({
  variant = 'primary',
  children,
  href,
  className,
  type = 'button',
  onClick,
}: ButtonProps) {
  const cn = clsx(styles.btn, styles[variant], className)
  if (href) {
    return (
      <Link href={href} className={cn}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={cn} onClick={onClick}>
      {children}
    </button>
  )
}
