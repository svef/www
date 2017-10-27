export const STATE = 'APP/STATE'
export const INVALID_LOGIN = 'APP/INVALID_LOGIN'

export const appState = payload => ({
  type: STATE,
  payload,
})

export const appInvalidLogin = payload => ({
  type: INVALID_LOGIN,
  payload,
})
