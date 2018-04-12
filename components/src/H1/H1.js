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

  &:after {
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

  ${props =>
    `
    color: ${colors[props.color] || 'inherit'};

    &:after {
      background-color: ${colors[props.color] || 'inherit'};
    }
  `};
`
