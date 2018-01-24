import React, { Component } from 'react'
import { auth, googleAuthProvider } from 'app/firebase'

import { Button } from '@svef/components'

export default class SignInButton extends Component {
  render() {
    return (
      <Button
        theme="blue"
        {...this.props}
        onClick={() => auth.signInWithRedirect(googleAuthProvider)}
      >
        Sign in
      </Button>
    )
  }
}
