import React from 'react'
import styled from 'styled-components'

import { colors, gutter } from '@svef/styles'

export const NavBar = styled.nav`
  position: relative;
  z-index: 2;

  padding: 0 ${gutter};

  ${props =>
    props.right
      ? `
    text-align: right;

    @media only screen and (min-width: 1025px) {
      padding-right: 100px;
    }

    @media only screen and (min-width: 1201px) {
      padding-right: 120px;
    }
  `
      : `
    text-align: left;

    @media only screen and (min-width: 1025px) {
      padding-left: 100px;
    }

    @media only screen and (min-width: 1201px) {
      padding-left: 120px;
    }
  `};

  > a {
    overflow: hidden;
    position: relative;
    vertical-align: middle;

    display: inline-block;
    margin: 0 20px;
    padding: 0;

    line-height: 54px;
    font-size: 18px;
    text-decoration: none;
    color: ${colors.grayLighter};

    opacity: 1;
    transform: translate3d(0, 0, 0);

    transition: opacity 750ms, transform 500ms;
    transition-delay: 1s;

    &:first-child {
      margin-left: 0;
    }

    &:last-child {
      margin-right: 0;
    }

    &:after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;

      display: block;
      width: 0px;
      height: 2px;

      background: ${colors.grayDark};

      transform: translate3d(0, 100%, 0);
      transition: transform 150ms, width 150ms;
    }

    &.active {
      &:after {
        width: 100%;
        transform: translate3d(0, 0, 0);
      }
    }
  }
`

export default NavBar
