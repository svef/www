import React from 'react'

import { storiesOf } from '@storybook/react'

import Article from '.'
import H1 from '../H1'

storiesOf('Article', module).add('default', () => <Article />)
