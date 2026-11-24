import type { Locale } from '@/lib/i18n'

/** Interface copy for Mínar síður → Aðgangur. */
export type AccountSettingsCopy = {
  title: string
  lede: string
  profileTitle: string
  stepAbout: string
  name: string
  phone: string
  phoneHint: string
  language: string
  languageHint: string
  languages: { is: string; en: string }
  optional: string
  save: string
  saving: string
  saved: string
  emailTitle: string
  email: string
  emailNote: string
  verified: string
  unverified: string
  passwordTitle: string
  stepPassword: string
  currentPassword: string
  newPassword: string
  newPasswordHint: string
  showPassword: string
  hidePassword: string
  changePassword: string
  changing: string
  changed: string
  signOutTitle: string
  signOutLead: string
  signOut: string
  errorSummary: string
  errors: {
    required: string
    nameLong: string
    phone: string
    passwordShort: string
    passwordSame: string
    currentWrong: string
    tooMany: string
    session: string
    generic: string
  }
}

const is: AccountSettingsCopy = {
  title: 'Aðgangur',
  lede: 'Nafnið þitt, símanúmer og lykilorð. Nafnið birtist öðrum sem vinna að sömu verkefnum.',
  profileTitle: 'Um þig',
  stepAbout: 'Nafn og sími',
  name: 'Nafn',
  phone: 'Símanúmer',
  phoneHint: 'Til að ná í þig ef eitthvað þarf að skýra.',
  language: 'Tungumál tölvupósts',
  languageHint: 'Á hvaða máli viltu fá áminningar og tilkynningar?',
  languages: { is: 'Íslenska', en: 'Enska' },
  optional: 'valkvætt',
  save: 'Vista',
  saving: 'Vista…',
  saved: 'Breytingarnar eru vistaðar.',
  emailTitle: 'Netfang',
  email: 'Netfang',
  emailNote: 'Netfangið er notandanafnið þitt og því er ekki hægt að breyta hér. Hafðu samband við SVEF ef þú þarft að skipta um netfang.',
  verified: 'Staðfest',
  unverified: 'Óstaðfest',
  passwordTitle: 'Lykilorð',
  stepPassword: 'Nýtt lykilorð',
  currentPassword: 'Núverandi lykilorð',
  newPassword: 'Nýtt lykilorð',
  newPasswordHint: 'Að minnsta kosti 10 stafir. Þú verður skráð/ur út úr öðrum tækjum.',
  showPassword: 'Sýna',
  hidePassword: 'Fela',
  changePassword: 'Breyta lykilorði',
  changing: 'Breyti lykilorði…',
  changed: 'Lykilorðinu var breytt. Önnur tæki hafa verið skráð út.',
  signOutTitle: 'Skrá út',
  signOutLead: 'Skráir þig út úr þessum vafra.',
  signOut: 'Skrá út',
  errorSummary: 'Það þarf að laga eftirfarandi:',
  errors: {
    required: 'Þetta þarf að fylla út.',
    nameLong: 'Nafnið má vera í mesta lagi 200 stafir.',
    phone: 'Sláðu inn símanúmer, til dæmis 555 1234 eða +354 555 1234.',
    passwordShort: 'Lykilorðið þarf að vera að minnsta kosti 10 stafir.',
    passwordSame: 'Nýja lykilorðið þarf að vera annað en það gamla.',
    currentWrong: 'Núverandi lykilorð er ekki rétt.',
    tooMany: 'Of margar tilraunir. Reyndu aftur eftir smástund.',
    session: 'Innskráningin þín er útrunnin. Skráðu þig inn aftur.',
    generic: 'Eitthvað fór úrskeiðis. Reyndu aftur.',
  },
}

const en: AccountSettingsCopy = {
  title: 'Account',
  lede: 'Your name, phone number and password. Your name is shown to others working on the same projects.',
  profileTitle: 'About you',
  stepAbout: 'Name and phone',
  name: 'Name',
  phone: 'Phone number',
  phoneHint: 'So we can reach you if something needs clarifying.',
  language: 'Email language',
  languageHint: 'Which language should reminders and notices come in?',
  languages: { is: 'Icelandic', en: 'English' },
  optional: 'optional',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Your changes are saved.',
  emailTitle: 'Email',
  email: 'Email',
  emailNote: 'Your email address is how you sign in, so it cannot be changed here. Contact SVEF if you need to change it.',
  verified: 'Confirmed',
  unverified: 'Not confirmed',
  passwordTitle: 'Password',
  stepPassword: 'New password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  newPasswordHint: 'At least 10 characters. You will be signed out on other devices.',
  showPassword: 'Show',
  hidePassword: 'Hide',
  changePassword: 'Change password',
  changing: 'Changing password…',
  changed: 'Your password was changed. Other devices have been signed out.',
  signOutTitle: 'Sign out',
  signOutLead: 'Signs you out of this browser.',
  signOut: 'Sign out',
  errorSummary: 'Please fix the following:',
  errors: {
    required: 'This needs filling in.',
    nameLong: 'The name can be at most 200 characters.',
    phone: 'Enter a phone number, for example 555 1234 or +354 555 1234.',
    passwordShort: 'The password needs at least 10 characters.',
    passwordSame: 'The new password needs to differ from the old one.',
    currentWrong: 'The current password is not right.',
    tooMany: 'Too many attempts. Try again in a little while.',
    session: 'Your sign-in has expired. Please sign in again.',
    generic: 'Something went wrong. Please try again.',
  },
}

export const accountSettingsCopy: Record<Locale, AccountSettingsCopy> = { is, en }
