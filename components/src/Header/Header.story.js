import React from 'react'

import { storiesOf } from '@storybook/react'

import Header from '.'
import H1 from '../H1'

storiesOf('Header', module)
  .add('default', () => <Header>...</Header>)
  .add('hero', () => (
    <Header hero>
      <H1 color="svef">Some title</H1>
    </Header>
  ))
