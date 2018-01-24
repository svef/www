import React, { Component } from 'react'
import { auth } from 'app/firebase'

import { Button } from '@svef/components'

export default class SignOutButton extends Component {
  render() {
    return (
      <Button theme="red" {...this.props} onClick={() => auth.signOut()}>
        Sign out
      </Button>
    )
  }
}
