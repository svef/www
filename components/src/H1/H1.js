import React from 'react'
import styled from 'styled-components'

import { colors } from '@svef/styles'

export default styled.h1`
  position: relative;
  margin: 0;
  padding: 75px 20% 100px 0;

  font-weight: 700;
  line-height: 1em;
  word-break: break-all;

  font-size: 100px;
  min-height: 200px;

  @media (min-width: 640px) {
    font-size: 200px;
    min-height: 400px;
  }

  @media (min-width: 830px) {
    font-size: 300px;
    min-height: 775px;
  }

  ${props =>
    `
    color: ${colors[props.color] || 'inherit'};
  `};
`
