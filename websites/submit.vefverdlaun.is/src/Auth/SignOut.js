import React from 'react'
import { auth } from './firebase'

import { Button } from '../components'

export default props => (
  <Button hollow {...props} onClick={() => auth.signOut()}>
    Sign out
  </Button>
)
