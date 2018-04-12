import React from 'react'
import styled from 'styled-components'

import { colors } from '@svef/styles'

export const Section = styled.section`
  position: relative;

  h1 {
    position: relative;
    z-index: 1;
  }

  ${props =>
    props.hero &&
    `
    color: ${colors.svef};

    &:after {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0;

      content: '';

      background-color: ${colors.grayDark};

      transition: transform 400ms ease 1250ms;
      transform: rotateY(0deg);
    }

    h1:after {
      content: '';
      position: absolute;
      top: 100%;
      right: 100%;
      display: block;
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 2px;

      background-color: #222;

      transform: translate3d(10vw, 0, 0);
      transition: transform 1000ms $easeout 1250ms;
    }

  `};
`

const Div = styled.div`
  position: relative;
  z-index: 1;

  margin: 0 auto;
  width: 100%;
  max-width: 1440px;
`

export default ({ children, ...props }) => (
  <Section {...props}>
    <Div>{children}</Div>
  </Section>
)
