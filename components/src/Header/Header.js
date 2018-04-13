import React from 'react'
import styled from 'styled-components'

import { Logo } from '@svef/components'
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

  svg.Logo {
    position: absolute;
    left: 0;
    right: 0;
    top: 15px;
    z-index: 3;
    margin: auto;
    width: 100px;

    opacity: 1;

    transform: scale(1);
    transform-origin: top;
    transition: opacity 500ms,
      transform 1s cubic-bezier(0.2, 0.5, 0.5, 1) 1250ms;
  }

  @media only screen and (min-width: 831px) {
    padding-top: 90px;
    padding-bottom: 50px;
    height: 180px;
  }
`

export default ({ children, ...props }) => (
  <Header {...props}>
    {children}
    <Logo className="Logo" />
  </Header>
)
