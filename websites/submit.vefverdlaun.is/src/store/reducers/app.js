import { STATE, INVALID_LOGIN } from '../actions/app'

export const initialState = {
  state: 'loading',
  invalidEmail: '',
}

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case STATE:
      return Object.assign({}, state, {
        state: payload,
      })
    case INVALID_LOGIN:
      return Object.assign({}, state, {
        invalidEmail: payload,
      })
    default:
      return state
  }
}
