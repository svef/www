import React from 'react'
import { connect } from 'react-redux'

import { auth, googleAuthProvider } from './firebase'

import { Button } from '../components'

export const SignInOut = ({ user, ...props }) => {
  return user ? (
    <Button hollow {...props} onClick={() => auth.signOut()}>
      Sign out
    </Button>
  ) : (
    <Button
      hollow
      {...props}
      onClick={() => auth.signInWithRedirect(googleAuthProvider)}
    >
      Sign in
    </Button>
  )
}

SignInOut.defaultProps = {
  user: null,
}

const mapStateToProps = state => ({
  user: state.user,
})

const mapDispatchToProps = dispatch => ({})

export default connect(mapStateToProps, mapDispatchToProps)(SignInOut)
