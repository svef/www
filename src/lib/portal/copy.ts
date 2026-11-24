import type { Locale } from '@/lib/i18n'

/** Interface copy for the portal's shell: the sidebar, the drawer and the avatar menu. */
export type PortalCopy = {
  name: string
  navLabel: string
  home: string
  menu: string
  closeMenu: string
  groups: { awards: string; admin: string }
  items: {
    overview: string
    projects: string
    newProject: string
    adminOverview: string
    adminProjects: string
    adminRequests: string
    adminUsers: string
    adminTools: string
  }
  account: string
  signOut: string
  signingOut: string
  signIn: string
  /** The avatar menu's button, for assistive technology, around the visible name and email. */
  userMenu: string
  language: string
}

const is: PortalCopy = {
  name: 'Mínar síður',
  navLabel: 'Mínar síður',
  home: 'SVEF, forsíða',
  menu: 'Valmynd',
  closeMenu: 'Loka valmynd',
  groups: { awards: 'Vefverðlaunin', admin: 'Stjórnborð' },
  items: {
    overview: 'Yfirlit',
    projects: 'Verkefnin mín',
    newProject: 'Nýtt verkefni',
    adminOverview: 'Staðan',
    adminProjects: 'Verkefni',
    adminRequests: 'Beiðnir',
    adminUsers: 'Notendur',
    adminTools: 'Verkfæri',
  },
  account: 'Aðgangur',
  signOut: 'Skrá út',
  signingOut: 'Skrái út…',
  signIn: 'Skrá inn',
  userMenu: 'Aðgangur og útskráning',
  language: 'English',
}

const en: PortalCopy = {
  name: 'My pages',
  navLabel: 'My pages',
  home: 'SVEF, home page',
  menu: 'Menu',
  closeMenu: 'Close menu',
  groups: { awards: 'Web Awards', admin: 'Admin' },
  items: {
    overview: 'Overview',
    projects: 'My projects',
    newProject: 'New project',
    adminOverview: 'Summary',
    adminProjects: 'Projects',
    adminRequests: 'Requests',
    adminUsers: 'Users',
    adminTools: 'Tools',
  },
  account: 'Account',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  signIn: 'Sign in',
  userMenu: 'Account and sign out',
  language: 'Íslenska',
}

export const portalCopy: Record<Locale, PortalCopy> = { is, en }
