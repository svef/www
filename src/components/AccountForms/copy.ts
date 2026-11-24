import type { Locale } from '@/lib/i18n'

/** Interface copy for the awards account pages and forms, per locale. */
export interface AccountCopy {
  signUp: {
    title: string
    lead: string
    heading: string
    name: string
    email: string
    phone: string
    phoneHint: string
    password: string
    passwordHint: string
    submit: string
    haveAccount: string
    signInLink: string
    doneTitle: string
    /** `{email}` is replaced with the address. */
    doneBody: string
    doneContinue: string
  }
  signIn: {
    title: string
    lead: string
    heading: string
    email: string
    password: string
    submit: string
    forgot: string
    noAccount: string
    signUpLink: string
  }
  forgot: {
    title: string
    lead: string
    heading: string
    email: string
    submit: string
    doneTitle: string
    doneBody: string
    back: string
  }
  reset: {
    title: string
    lead: string
    heading: string
    password: string
    passwordHint: string
    submit: string
    doneTitle: string
    doneBody: string
    signInLink: string
    invalidTitle: string
    invalidBody: string
    requestNew: string
  }
  verify: {
    title: string
    successTitle: string
    successBody: string
    failedTitle: string
    failedBody: string
    pendingTitle: string
    pendingBody: string
    resend: string
    resent: string
    continue: string
    signInToResend: string
  }
  signedIn: {
    heading: string
    /** `{name}` and `{email}` are replaced. */
    as: string
    verified: string
    unverified: string
    resend: string
    resent: string
    signOut: string
    continue: string
  }
  common: {
    optional: string
    /** Step titles, as the site's other forms name theirs. */
    stepAbout: string
    stepAccount: string
    stepSend: string
    showPassword: string
    hidePassword: string
    sending: string
    errorSummary: string
    errors: {
      required: string
      email: string
      passwordShort: string
      credentials: string
      exists: string
      tooMany: string
      token: string
      generic: string
    }
  }
}

export const accountCopy: Record<Locale, AccountCopy> = {
  is: {
    signUp: {
      title: 'Nýskráning',
      lead: 'Stofnaðu aðgang til að senda inn verkefni í Íslensku vefverðlaunin.',
      heading: 'Einn aðgangur fyrir öll verkefnin',
      name: 'Nafn',
      email: 'Netfang',
      phone: 'Símanúmer',
      phoneHint: 'Til að ná í þig ef eitthvað þarf að skýra.',
      password: 'Lykilorð',
      passwordHint: 'Að minnsta kosti 10 stafir.',
      submit: 'Stofna aðgang',
      haveAccount: 'Ertu með aðgang?',
      signInLink: 'Skráðu þig inn',
      doneTitle: 'Aðgangur stofnaður',
      doneBody:
        'Við sendum staðfestingarpóst á {email}. Þú getur byrjað að vinna í drögum strax, en þarft að staðfesta netfangið til að senda inn.',
      doneContinue: 'Áfram',
    },
    signIn: {
      title: 'Innskráning',
      lead: 'Skráðu þig inn til að sjá og senda inn verkefni.',
      heading: 'Haltu áfram þar sem frá var horfið',
      email: 'Netfang',
      password: 'Lykilorð',
      submit: 'Skrá inn',
      forgot: 'Gleymt lykilorð?',
      noAccount: 'Ertu ekki með aðgang?',
      signUpLink: 'Stofnaðu aðgang',
    },
    forgot: {
      title: 'Gleymt lykilorð',
      lead: 'Sláðu inn netfangið þitt og við sendum þér tengil til að velja nýtt lykilorð.',
      heading: 'Gleymdirðu lykilorðinu?',
      email: 'Netfang',
      submit: 'Senda tengil',
      doneTitle: 'Athugaðu póstinn þinn',
      doneBody:
        'Ef aðgangur er til með þessu netfangi er tengill á leiðinni til þín. Hann gildir í eina klukkustund.',
      back: 'Aftur í innskráningu',
    },
    reset: {
      title: 'Nýtt lykilorð',
      lead: 'Veldu nýtt lykilorð fyrir aðganginn þinn.',
      heading: 'Veldu lykilorð sem þú manst',
      password: 'Nýtt lykilorð',
      passwordHint: 'Að minnsta kosti 10 stafir.',
      submit: 'Vista lykilorð',
      doneTitle: 'Lykilorðið er uppfært',
      doneBody: 'Þú getur nú skráð þig inn með nýja lykilorðinu.',
      signInLink: 'Skrá inn',
      invalidTitle: 'Tengillinn virkar ekki',
      invalidBody: 'Tengillinn er útrunninn eða hefur þegar verið notaður. Biddu um nýjan.',
      requestNew: 'Biðja um nýjan tengil',
    },
    verify: {
      title: 'Staðfesting netfangs',
      successTitle: 'Netfangið er staðfest',
      successBody: 'Þakka þér fyrir. Nú getur þú sent inn verkefni.',
      failedTitle: 'Tengillinn virkar ekki',
      failedBody: 'Tengillinn er útrunninn eða ógildur. Þú getur beðið um nýjan staðfestingarpóst.',
      pendingTitle: 'Staðfestu netfangið þitt',
      pendingBody:
        'Opnaðu tengilinn í staðfestingarpóstinum sem við sendum þér. Þú þarft að staðfesta netfangið til að senda inn verkefni.',
      resend: 'Senda staðfestingarpóst aftur',
      resent: 'Staðfestingarpóstur sendur.',
      continue: 'Áfram',
      signInToResend: 'Skráðu þig inn til að biðja um nýjan staðfestingarpóst.',
    },
    signedIn: {
      heading: 'Þú ert innskráð(ur)',
      as: 'Innskráð(ur) sem {name} ({email}).',
      verified: 'Netfangið er staðfest.',
      unverified: 'Netfangið er ekki staðfest. Þú þarft að staðfesta það til að senda inn.',
      resend: 'Senda staðfestingarpóst aftur',
      resent: 'Staðfestingarpóstur sendur.',
      signOut: 'Skrá út',
      continue: 'Mínar innsendingar',
    },
    common: {
      optional: 'valfrjálst',
      stepAbout: 'Um þig',
      stepAccount: 'Aðgangurinn',
      stepSend: 'Senda',
      showPassword: 'Sýna lykilorð',
      hidePassword: 'Fela lykilorð',
      sending: 'Augnablik…',
      errorSummary: 'Eitthvað vantar eða er rangt:',
      errors: {
        required: 'Þetta þarf að fylla út.',
        email: 'Þetta netfang lítur ekki rétt út.',
        passwordShort: 'Lykilorðið þarf að vera að minnsta kosti 10 stafir.',
        credentials: 'Netfang eða lykilorð er rangt.',
        exists: 'Aðgangur er þegar til með þessu netfangi.',
        tooMany: 'Of margar tilraunir. Reyndu aftur síðar.',
        token: 'Tengillinn er útrunninn eða ógildur.',
        generic: 'Eitthvað fór úrskeiðis. Reyndu aftur.',
      },
    },
  },
  en: {
    signUp: {
      title: 'Sign up',
      lead: 'Create an account to submit projects to the Icelandic Web Awards.',
      heading: 'One account for all your projects',
      name: 'Name',
      email: 'Email',
      phone: 'Phone number',
      phoneHint: 'So we can reach you if something needs clarifying.',
      password: 'Password',
      passwordHint: 'At least 10 characters.',
      submit: 'Create account',
      haveAccount: 'Already have an account?',
      signInLink: 'Sign in',
      doneTitle: 'Account created',
      doneBody:
        'We sent a confirmation email to {email}. You can start drafting right away, but you need to confirm your email address before you can submit.',
      doneContinue: 'Continue',
    },
    signIn: {
      title: 'Sign in',
      lead: 'Sign in to see and submit your projects.',
      heading: 'Pick up where you left off',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      forgot: 'Forgot your password?',
      noAccount: 'No account yet?',
      signUpLink: 'Create one',
    },
    forgot: {
      title: 'Forgot your password',
      lead: 'Enter your email address and we will send you a link to choose a new password.',
      heading: 'Forgot your password?',
      email: 'Email',
      submit: 'Send link',
      doneTitle: 'Check your email',
      doneBody:
        'If an account exists for that address, a link is on its way. It is valid for one hour.',
      back: 'Back to sign in',
    },
    reset: {
      title: 'Choose a new password',
      lead: 'Choose a new password for your account.',
      heading: 'Choose a password you will remember',
      password: 'New password',
      passwordHint: 'At least 10 characters.',
      submit: 'Save password',
      doneTitle: 'Password updated',
      doneBody: 'You can now sign in with your new password.',
      signInLink: 'Sign in',
      invalidTitle: 'This link does not work',
      invalidBody: 'The link has expired or has already been used. Ask for a new one.',
      requestNew: 'Ask for a new link',
    },
    verify: {
      title: 'Email confirmation',
      successTitle: 'Your email address is confirmed',
      successBody: 'Thank you. You can now submit projects.',
      failedTitle: 'This link does not work',
      failedBody: 'The link has expired or is invalid. You can ask for a new confirmation email.',
      pendingTitle: 'Confirm your email address',
      pendingBody:
        'Open the link in the confirmation email we sent you. You need to confirm your address before you can submit projects.',
      resend: 'Resend confirmation email',
      resent: 'Confirmation email sent.',
      continue: 'Continue',
      signInToResend: 'Sign in to ask for a new confirmation email.',
    },
    signedIn: {
      heading: 'You are signed in',
      as: 'Signed in as {name} ({email}).',
      verified: 'Your email address is confirmed.',
      unverified: 'Your email address is not confirmed. You need to confirm it before you can submit.',
      resend: 'Resend confirmation email',
      resent: 'Confirmation email sent.',
      signOut: 'Sign out',
      continue: 'My submissions',
    },
    common: {
      optional: 'optional',
      stepAbout: 'About you',
      stepAccount: 'Your account',
      stepSend: 'Send',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      sending: 'One moment…',
      errorSummary: 'Something is missing or wrong:',
      errors: {
        required: 'This field is required.',
        email: 'That email address does not look right.',
        passwordShort: 'The password needs at least 10 characters.',
        credentials: 'The email or password is wrong.',
        exists: 'An account with this email already exists.',
        tooMany: 'Too many attempts. Try again later.',
        token: 'The link has expired or is invalid.',
        generic: 'Something went wrong. Try again.',
      },
    },
  },
}
