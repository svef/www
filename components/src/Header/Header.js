import React from 'react'
import styled from 'styled-components'

import { colors, gutter } from '@svef/styles'

export const Header = styled.header`
  position: relative;
  z-index: 2;

  display: block;
  margin: 0 auto;
  padding: 140px 0 0px;

  background: #fff;

  opacity: 1;
  transform: translate3d(0, 0, 0);

  transition: opacity 250ms ease 750ms, transform 350ms ease-out 750ms;

  @media only screen and (min-width: 831px) {
    padding-top: 90px;
    padding-bottom: 50px;
    height: 180px;
  }
`

export default ({ children, ...props }) => (
  <Header {...props}>{children}</Header>
)
