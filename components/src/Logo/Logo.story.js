import React from 'react'

import { storiesOf } from '@storybook/react'

import Logo from '.'
import H1 from '../H1'

storiesOf('Logo', module)
  .add('default', () => <Logo />)
  .add('awards', () => <Logo type="awards" />)
  .add('conf', () => <Logo type="conf" />)
