import React from 'react'

import { storiesOf } from '@storybook/react'

import Header from '.'
import { H1, NavBar } from '@svef/components'
// import H1 from '../H1'

storiesOf('Header', module).add('default', () => <Header>...</Header>)
