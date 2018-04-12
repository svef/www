import React from 'react'

import { storiesOf } from '@storybook/react'

import Section from '.'
import H1 from '../H1'

storiesOf('Section', module)
  .add('default', () => (
    <Section>
      <H1>Some title</H1>
    </Section>
  ))
  .add('hero', () => (
    <Section hero>
      <H1>Some title</H1>
    </Section>
  ))
