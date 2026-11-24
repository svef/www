/** Plain data for the form: where one collaborator stands with the invitation to edit. */
export type InviteState = {
  /** The collaborator row, for "Resend invitation". Null only before the row exists. */
  personId: string
  /** The address on the row when this state was read, so the form can tell a pending change. */
  email: string
  state: 'none' | 'invited' | 'expired' | 'accepted'
  /** ISO. When the (latest) invitation was sent. */
  invitedAt: string | null
  /** ISO. When it was accepted. */
  acceptedAt: string | null
  /** ISO. When the outstanding invitation stops working. */
  expiresAt: string | null
}
