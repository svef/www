import axios from 'axios'

// Actions
export const PREFIX = 'REGISTER'
export const FAILURE = `${PREFIX}/FAILURE`
export const REQUEST = `${PREFIX}/REQUEST`
export const SUCCESS = `${PREFIX}/SUCCESS`

export const endpoint = '/api/register/webawards2018'

export const initialState = {
  isFetching: false,
  isValid: false,
}

// Reducer
export default (state = initialState, action = {}) => {
  switch (action.type) {
    case FAILURE:
      return Object.assign({}, state, {
        isFetching: false,
        isValid: false,
      })

    case REQUEST:
      return Object.assign({}, state, {
        isFetching: true,
      })

    case SUCCESS:
      return Object.assign({}, state, {
        isFetching: false,
        isValid: true,
      })

    default:
      return state
  }
}

// Action Creators
export const postRegistration = (payload = {}) => {
  const promise = axios.post(endpoint, payload).then(({ data }) => data)

  return {
    types: [REQUEST, SUCCESS, FAILURE],
    promise,
  }
}
