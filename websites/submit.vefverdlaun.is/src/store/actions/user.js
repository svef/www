export const SIGNIN = 'USER/SIGNIN'
export const SIGNOUT = 'USER/SIGNOUT'

export const userSignIn = payload => ({
  type: SIGNIN,
  payload,
})

export const userSignOut = payload => ({
  type: SIGNOUT,
  payload,
})
