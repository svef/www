import React from 'react'

import { storiesOf } from '@storybook/react'

import NavBar from '.'
import H1 from '../H1'

storiesOf('NavBar', module)
  .add('default', () => (
    <NavBar>
      <a href="/" class="active">
        Heim
      </a>
      <a href="/tilnefningar.html" class="">
        Tilnefningar
      </a>
      <a href="/vidurkenningar.html">Viðurkenningar</a>
    </NavBar>
  ))
  .add('hero', () => (
    <NavBar hero>
      <H1 color="svef">Some title</H1>
    </NavBar>
  ))
