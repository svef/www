import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { colors, gutter } from '@svef/styles'

import { Hexagon, Svef, Awards, Conf } from './Logo.paths'

export const SVG = styled.svg`
  width: 190px;
  height: auto;

  path.hexagon {
    ${props =>
      `
      fill: ${colors[props.type]}
    `};
  }

  path.logo-graphic {
    fill: white;
  }
`

export const Logo = ({ type, ...props }) => (
  <SVG
    viewBox="0 0 190 210"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    type={type}
    {...props}
  >
    <Hexagon />

    {type === 'svef' && <Svef />}
    {type === 'awards' && <Awards />}
    {type === 'conf' && <Conf />}
  </SVG>
)

Logo.propTypes = {
  type: PropTypes.oneOf(['svef', 'awards', 'conf']),
}

Logo.defaultProps = {
  type: 'svef',
}

export default Logo
