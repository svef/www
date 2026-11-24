import type { Locale } from '@/lib/i18n'

/** Interface copy for the invitation page (svef/www#165). */
export const inviteCopy = {
  is: {
    title: 'Boð um að breyta innsendingu',
    lede: 'Íslensku vefverðlaunin',
    untitled: 'innsending án titils',
    invitedBy: (who: string, title: string) =>
      `${who || 'SVEF'} hefur boðið þér að breyta innsendingunni „${title}“.`,
    meaning:
      'Ef þú samþykkir geturðu opnað innsendinguna, breytt henni og sent hana inn með þeim sem eru á henni. Þú getur ekki dregið hana til baka, það getur aðeins sá sem stofnaði hana. Einn breytir í einu.',
    needAccount: (email: string) =>
      `Boðið var sent á ${email}. Stofnaðu aðgang hjá SVEF eða skráðu þig inn til að samþykkja það.`,
    signUp: 'Stofna aðgang',
    signIn: 'Skrá inn',
    accept: 'Samþykkja boðið',
    acceptHint: (email: string) => `Þú ert innskráð(ur) sem ${email}.`,
    mismatchTitle: 'Boðið var sent á annað netfang',
    mismatch: (invited: string, account: string) =>
      `Boðið var sent á ${invited} en þú ert innskráð(ur) sem ${account}. Ef þú ert sá sem á að breyta innsendingunni geturðu samþykkt það með þessum aðgangi. Aðgangurinn fær þá fullan aðgang að innsendingunni.`,
    acceptHere: 'Samþykkja með þessum aðgangi',
    otherAccount: 'Skrá inn með öðrum aðgangi',
    unverified: (account: string) =>
      `Netfangið ${account} hefur ekki verið staðfest, svo ekki er hægt að samþykkja boð sem var sent á annað netfang. Staðfestu netfangið (við sendum tengil þegar þú stofnaðir aðganginn) eða skráðu þig inn með aðganginum sem boðið var sent á.`,
    problems: {
      expired: {
        title: 'Boðið er runnið út',
        body: 'Boð gilda í 14 daga. Biddu þann sem bauð þér að senda nýtt boð, með „Senda boð aftur“ í innsendingunni.',
      },
      revoked: {
        title: 'Boðið hefur verið dregið til baka',
        body: 'Sá sem bauð þér tók boðið til baka eða breytti því. Biddu viðkomandi að senda nýtt boð ef þetta var ekki ætlunin.',
      },
      used: {
        title: 'Boðið hefur þegar verið notað',
        body: 'Hvert boð virkar aðeins einu sinni. Ef þú samþykktir það áður finnurðu innsendinguna í „Mínar innsendingar“.',
      },
      invalid: {
        title: 'Þetta boð fannst ekki',
        body: 'Tengillinn er ekki réttur eða hann hefur verið styttur. Opnaðu tengilinn úr tölvupóstinum aftur, eða biddu um nýtt boð.',
      },
    },
    mine: 'Mínar innsendingar',
  },
  en: {
    title: 'Invitation to edit a submission',
    lede: 'Icelandic Web Awards',
    untitled: 'untitled submission',
    invitedBy: (who: string, title: string) =>
      `${who || 'SVEF'} has invited you to edit the submission “${title}”.`,
    meaning:
      'If you accept, you can open the submission, edit it and submit it together with the others on it. You cannot withdraw it; only the person who created it can. One person edits at a time.',
    needAccount: (email: string) =>
      `The invitation was sent to ${email}. Create an account with SVEF, or sign in, to accept it.`,
    signUp: 'Create account',
    signIn: 'Sign in',
    accept: 'Accept the invitation',
    acceptHint: (email: string) => `You are signed in as ${email}.`,
    mismatchTitle: 'The invitation was sent to another address',
    mismatch: (invited: string, account: string) =>
      `The invitation was sent to ${invited}, but you are signed in as ${account}. If you are the person meant to edit this submission, you can accept it with this account. The account then has full access to the submission.`,
    acceptHere: 'Accept with this account',
    otherAccount: 'Sign in with another account',
    unverified: (account: string) =>
      `The email address ${account} has not been confirmed, so an invitation sent to another address cannot be accepted with it. Confirm the address (we sent a link when you created the account) or sign in with the account the invitation was sent to.`,
    problems: {
      expired: {
        title: 'This invitation has expired',
        body: 'Invitations are valid for 14 days. Ask the person who invited you to send a new one, with “Resend invitation” on the submission.',
      },
      revoked: {
        title: 'This invitation was withdrawn',
        body: 'The person who invited you cancelled it or changed it. Ask them to send a new invitation if that was not intended.',
      },
      used: {
        title: 'This invitation has already been used',
        body: 'Each invitation works once. If you accepted it before, you will find the submission under “My submissions”.',
      },
      invalid: {
        title: 'We could not find this invitation',
        body: 'The link is not right, or it was cut short. Open the link from the email again, or ask for a new invitation.',
      },
    },
    mine: 'My submissions',
  },
} satisfies Record<Locale, unknown>
