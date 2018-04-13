import React from 'react'
import styled from 'styled-components'

import { colors } from '@svef/styles'

export const Section = styled.section`
  position: relative;
  padding: 40px 0;

  h1 {
    position: relative;
    z-index: 1;
  }

  ${props =>
    props.hero &&
    `
    padding: 0;
    color: ${colors.svef};

    &:after {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0;

      content: '';

      background-color: ${colors.grayLightbg};

      transition: transform 400ms ease 1250ms;
      transform: rotateY(0deg);
    }
  `};

  ${props => `
    background-color: ${colors[props.color] || 'inherit'};
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
