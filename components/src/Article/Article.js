import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { colors, gutter } from '@svef/styles'

export const ArticleBase = styled.article`
  margin-bottom: 120px;
`

export const Article = ({ children, label, ...props }) => (
  <ArticleBase {...props}>
    <div className="row justify-content-center">
      <div className="col-2">
        <p
          style={{
            fontWeight: 'bold',
            fontSize: '32px',
            textAlign: 'right',
          }}
        >
          {label || '01'}
        </p>
      </div>
      <div className="col-7">{children}</div>
    </div>
  </ArticleBase>
)

Article.propTypes = {
  label: PropTypes.string,
}

Article.defaultProps = {
  label: '01',
}

export default Article
