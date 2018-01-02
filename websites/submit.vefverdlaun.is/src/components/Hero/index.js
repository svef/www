import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import Hexagon from '../Hexagon'

import './styles.css'

export const Hero = ({ user, title, loading, ...props }) => {
  return (
    <section className="Hero" {...props}>
      <div className="grid-container">
        <div className="grid-x grid-margin-x">
          <div className="cell">
            <h1 className="color-awards">
              <span>{title}</span>
              <Hexagon />
            </h1>
          </div>
        </div>
      </div>
    </section>
  )
}

Hero.propTypes = {
  title: PropTypes.string.isRequired,
}

Hero.defaultProps = {
  title: '...',
}

const mapStateToProps = state => ({
  user: state.user,
})

const mapDispatchToProps = dispatch => ({})

export default connect(mapStateToProps, mapDispatchToProps)(Hero)
