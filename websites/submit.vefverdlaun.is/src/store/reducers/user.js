import { SIGNIN, SIGNOUT } from '../actions/user'

export const initialState = null

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case SIGNIN:
      return Object.assign(
        {},
        {
          uid: payload.uid,
          email: payload.email,
          photoURL: payload.photoURL,
          displayName: payload.displayName,
        }
      )
    case SIGNOUT:
      return null
    default:
      return state
  }
}
