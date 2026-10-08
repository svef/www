import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  MessengerLogo,
} from '@phosphor-icons/react/dist/ssr'
import type { SocialIcon as SocialIconName } from '@/lib/content/site-settings'

// Imported from `/dist/ssr` rather than the package root: the root entry is a
// Client Component, and pulling it into an otherwise static page would drag a
// client boundary along with it for artwork that never changes.
const ICONS = {
  facebook: FacebookLogo,
  instagram: InstagramLogo,
  linkedin: LinkedinLogo,
  messenger: MessengerLogo,
} as const

/**
 * A network's brand mark.
 *
 * Decorative on its own — it carries no text, so whatever renders it has to
 * supply the accessible name. Both call sites put it on the link.
 */
export function SocialIcon({ name, size = 24 }: { name: SocialIconName; size?: number }) {
  const Icon = ICONS[name]
  return <Icon size={size} weight="fill" aria-hidden="true" />
}
