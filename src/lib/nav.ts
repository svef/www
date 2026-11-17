import { localePath, withoutHiddenLinks, isHiddenPath, type Dictionary, type Locale } from '@/lib/i18n'
import type { HeaderNavItem } from '@/components/Header/SiteNav'

/**
 * The primary navigation as data: what the header shows, in order, before the
 * hidden pages (`HIDDEN_PAGES`) are dropped.
 *
 * Lives here rather than inline in the layout so the e2e suite can derive its
 * expectations from the same source as the header, instead of retyping labels
 * and hrefs that change whenever the header is redesigned.
 */
export function buildNavItems(locale: Locale, t: Dictionary): HeaderNavItem[] {
  // Built through `localePath` rather than by hand: pages are named in the
  // reader's language, so an English nav has to link to /en/events, not
  // /en/vidburdir — which exists, but only as a redirect to it.
  return [
    // Events first: the programme is what a visitor is most often here for.
    { href: localePath('/vidburdir', locale), label: t.nav.events },
    { href: localePath('/vefverdlaunin', locale), label: t.nav.awards },
    { href: localePath('/frettir', locale), label: t.nav.news },
    {
      href: localePath('/um-svef', locale),
      label: t.nav.about,
      // The pages split out of About SVEF in #103. Web Awards gets a submenu
      // of its own next, which is why this is a property of an item rather
      // than a special case in the header.
      children: [
        { href: localePath('/stjorn', locale), label: t.about.boardTitle },
        { href: localePath('/log-svef', locale), label: t.about.bylawsTitle },
        { href: localePath('/spurt-og-svarad', locale), label: t.about.faqTitle },
      ],
    },
    { href: localePath('/skraning', locale), label: t.nav.membership },
  ]
}

/** `buildNavItems` minus the items and children that point at a hidden page. */
export function visibleNavItems(locale: Locale, t: Dictionary): HeaderNavItem[] {
  return buildNavItems(locale, t)
    .filter((item) => !isHiddenPath(item.href))
    .map((item) =>
      item.children ? { ...item, children: withoutHiddenLinks(item.children) } : item,
    )
}
