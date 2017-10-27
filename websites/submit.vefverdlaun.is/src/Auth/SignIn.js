import React from 'react'
import { auth, googleAuthProvider } from './firebase'

import { Button } from '../components'

export default props => (
  <Button
    hollow
    {...props}
    onClick={() => auth.signInWithRedirect(googleAuthProvider)}
  >
    Sign in
  </Button>
)
